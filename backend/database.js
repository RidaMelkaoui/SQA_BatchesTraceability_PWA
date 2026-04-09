const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

let db = null;
let SQL = null;
let dbPath = null;

async function initDatabase(userDataPath) {
  // sql.js is pure WASM, no native compilation needed
  SQL = await require('sql.js')();
  dbPath = path.join(userDataPath, 'sqa-traceability.db');

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] Loaded existing database from', dbPath);
  } else {
    db = new SQL.Database();
    console.log('[DB] Created new database at', dbPath);
  }

  runMigrations();
  return db;
}

function saveDatabase() {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function runMigrations() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      password_changed INTEGER DEFAULT 0,
      role TEXT DEFAULT 'OPERATOR',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try { db.run("ALTER TABLE users ADD COLUMN email TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE users ADD COLUMN password_changed INTEGER DEFAULT 0;"); } catch (e) {}


  db.run(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      operator_id TEXT NOT NULL,
      label_image_path TEXT,
      certificate_path TEXT,
      status TEXT DEFAULT 'RECEIVED',
      received_at TEXT DEFAULT (datetime('now')),
      validated_at TEXT,
      device_id TEXT,
      vector_clock TEXT DEFAULT '{}',
      FOREIGN KEY (operator_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      device_id TEXT NOT NULL,
      vector_clock TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default users
  const seeds = [
    { u: 'Reda', e: 'rida.melkaoui@magna.com', r: 'ADMIN' },
    { u: 'Youssef', e: 'ridamelkaouiofficial@gmail.com', r: 'ADMIN' },
    { u: 'Khaoula', e: 'ridamelkaouiofficial@gmail.com', r: 'OPERATOR' },
    { u: 'Aicha', e: 'ridamelkaouiofficial@gmail.com', r: 'OPERATOR' },
    { u: 'Manal', e: 'ridamelkaouiofficial@gmail.com', r: 'OPERATOR' }
  ];
  const defaultPass = 'SQA2026';
  
  seeds.forEach(s => {
    const existing = db.exec(`SELECT id FROM users WHERE LOWER(username) = LOWER('${s.u}')`);
    if (!existing.length || !existing[0].values.length) {
      db.run(
        `INSERT INTO users (id, username, password, email, password_changed, role) VALUES (?, ?, ?, ?, 0, ?)`,
        [uuidv4(), s.u, defaultPass, s.e, s.r]
      );
    }
  });

  saveDatabase();
  console.log('[DB] Migrations complete');
}

// ─── Users ──────────────────────────────────────────────────────────────────
function findUserByUsername(username) {
  const result = db.exec(
    `SELECT * FROM users WHERE LOWER(username) = LOWER('${username.replace(/'/g, "''")}') LIMIT 1`
  );
  if (!result.length || !result[0].values.length) return null;
  return rowToObject(result[0].columns, result[0].values[0]);
}

function createOrFindUser(username, password, email, role = 'OPERATOR') {
  let user = findUserByUsername(username);
  if (!user) {
    const id = uuidv4();
    db.run(
      `INSERT INTO users (id, username, password, email, role) VALUES (?, ?, ?, ?, ?)`,
      [id, username, password, email, role]
    );
    saveDatabase();
    user = { id, username, password, email, password_changed: 0, role };
  }
  return user;
}

function updatePassword(userId, newPassword) {
  db.run(
    `UPDATE users SET password = ?, password_changed = 1 WHERE id = ?`,
    [newPassword, userId]
  );
  saveDatabase();
}

function getAllUsers() {
  const result = db.exec(`SELECT id, username, email, role, password_changed FROM users ORDER BY username ASC`);
  if (!result.length) return [];
  return result[0].values.map(row => rowToObject(result[0].columns, row));
}

// ─── Batches ─────────────────────────────────────────────────────────────────
function getAllBatches() {
  const result = db.exec(`
    SELECT b.*, u.username as operator_username
    FROM batches b
    LEFT JOIN users u ON b.operator_id = u.id
    ORDER BY b.received_at DESC
  `);
  if (!result.length) return [];
  return result[0].values.map(row => {
    const obj = rowToObject(result[0].columns, row);
    return {
      ...obj,
      operator: { id: obj.operator_id, username: obj.operator_username }
    };
  });
}

function createBatch(data, deviceId, vectorClock) {
  const id = uuidv4();
  const vcStr = JSON.stringify(vectorClock || {});
  db.run(
    `INSERT INTO batches (id, reference, operator_id, label_image_path, status, device_id, vector_clock)
     VALUES (?, ?, ?, ?, 'RECEIVED', ?, ?)`,
    [id, data.reference, data.operatorId, data.labelImagePath, deviceId, vcStr]
  );

  logSync('batch', id, 'CREATE', { ...data, id }, deviceId, vectorClock);
  saveDatabase();
  return { id, ...data, status: 'RECEIVED', receivedAt: new Date().toISOString() };
}

function updateBatchCertificate(batchId, certificatePath, deviceId, vectorClock) {
  const vcStr = JSON.stringify(vectorClock || {});
  db.run(
    `UPDATE batches SET certificate_path = ?, status = 'VALIDATED', validated_at = datetime('now'),
     vector_clock = ? WHERE id = ?`,
    [certificatePath, vcStr, batchId]
  );
  logSync('batch', batchId, 'UPDATE', { id: batchId, certificatePath, status: 'VALIDATED' }, deviceId, vectorClock);
  saveDatabase();
}

function upsertBatchFromSync(payload) {
  const existing = db.exec(`SELECT id, vector_clock FROM batches WHERE id = '${payload.id}'`);
  if (existing.length && existing[0].values.length) {
    // Last-write-wins: compare vector clock timestamps
    const existingVC = JSON.parse(existing[0].values[0][1] || '{}');
    const incomingVC = payload.vectorClock || {};
    if (shouldApply(existingVC, incomingVC)) {
      db.run(
        `UPDATE batches SET reference = ?, operator_id = ?, label_image_path = ?,
         certificate_path = ?, status = ?, validated_at = ?, vector_clock = ? WHERE id = ?`,
        [payload.reference, payload.operatorId, payload.labelImagePath,
         payload.certificatePath, payload.status, payload.validatedAt,
         JSON.stringify(incomingVC), payload.id]
      );
    }
  } else {
    db.run(
      `INSERT OR IGNORE INTO batches (id, reference, operator_id, label_image_path,
       certificate_path, status, received_at, validated_at, device_id, vector_clock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payload.id, payload.reference, payload.operatorId, payload.labelImagePath,
       payload.certificatePath, payload.status, payload.receivedAt, payload.validatedAt,
       payload.deviceId, JSON.stringify(payload.vectorClock || {})]
    );
  }
  saveDatabase();
}

function getSyncLogSince(timestamp) {
  const result = db.exec(
    `SELECT * FROM sync_log WHERE created_at > '${timestamp}' ORDER BY created_at ASC`
  );
  if (!result.length) return [];
  return result[0].values.map(row => rowToObject(result[0].columns, row));
}

// ─── Sync Helpers ────────────────────────────────────────────────────────────
function logSync(entityType, entityId, operation, payload, deviceId, vectorClock) {
  const id = uuidv4();
  db.run(
    `INSERT INTO sync_log (id, entity_type, entity_id, operation, payload, device_id, vector_clock)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, entityType, entityId, operation, JSON.stringify(payload), deviceId, JSON.stringify(vectorClock || {})]
  );
}

function shouldApply(existingVC, incomingVC) {
  // Last-write-wins: incoming wins if its total timestamp sum is greater
  const existingSum = Object.values(existingVC).reduce((a, b) => a + b, 0);
  const incomingSum = Object.values(incomingVC).reduce((a, b) => a + b, 0);
  return incomingSum >= existingSum;
}

// ─── Util ────────────────────────────────────────────────────────────────────
function rowToObject(columns, row) {
  const obj = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  // Map snake_case to camelCase for frontend compatibility
  return {
    id: obj.id,
    reference: obj.reference,
    operatorId: obj.operator_id || obj.operatorId,
    labelImagePath: obj.label_image_path || obj.labelImagePath,
    certificatePath: obj.certificate_path || obj.certificatePath,
    status: obj.status,
    receivedAt: obj.received_at || obj.receivedAt,
    validatedAt: obj.validated_at || obj.validatedAt,
    deviceId: obj.device_id || obj.deviceId,
    operator: obj.operator || null,
    operator_username: obj.operator_username,
    username: obj.username,
    password: obj.password,
    email: obj.email,
    password_changed: obj.password_changed,
    role: obj.role,
  };
}

module.exports = {
  initDatabase,
  saveDatabase,
  findUserByUsername,
  createOrFindUser,
  updatePassword,
  getAllUsers,
  getAllBatches,
  createBatch,
  updateBatchCertificate,
  upsertBatchFromSync,
  getSyncLogSince,
};
