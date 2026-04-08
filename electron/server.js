const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { SignJWT, jwtVerify } = require('jose');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const db = require('./database');
const sync = require('./sync');
const discovery = require('./discovery');
const { v4: uuidv4 } = require('uuid');

const PORT = 8765;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'sqa-intranet-secret-2026');
const TARGET_EMAIL = process.env.SMTP_TARGET || 'ridamelkaouiofficial@gmail.com';
const AUTHORIZED_USERS = ['Reda', 'Youssef', 'Khaoula', 'Aicha', 'Manal'];
const HARDCODED_PASSWORD = 'SQA2026';

let app = null;
let server = null;
let uploadsDir = null;

// ─── Multer file upload config ───────────────────────────────────────────────
function createMulter(uploadPath) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const type = req.path.includes('validate') ? 'certificates' : 'labels';
      const dest = path.join(uploadPath, type);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
    }
  });
  return multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max
}

// ─── Auth helpers ────────────────────────────────────────────────────────────
async function verifyToken(req) {
  let token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch { return null; }
}

function requireAuth(req, res, next) {
  verifyToken(req).then(payload => {
    if (!payload) return res.status(401).json({ error: 'Unauthorized' });
    req.user = payload;
    next();
  });
}

// ─── Email ───────────────────────────────────────────────────────────────────
function createMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendNewBatchEmail(batch, operatorName) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  try {
    const mailer = createMailer();
    await mailer.sendMail({
      from: `"SQA Traceability" <${process.env.SMTP_USER}>`,
      to: TARGET_EMAIL,
      subject: `[QMS Alert] New Batch Received: ${batch.reference}`,
      html: `<h2>New Batch Awaiting Validation</h2>
        <p><strong>Batch Ref:</strong> ${batch.reference}</p>
        <p><strong>Operator:</strong> ${operatorName}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <hr/><p>Please log in to upload the certificate.</p>`
    });
  } catch (err) {
    console.error('[Email] Failed to send new batch alert:', err.message);
  }
}

// ─── Main Start Function ──────────────────────────────────────────────────────
async function start(userDataPath) {
  // Init database
  await db.initDatabase(userDataPath);

  // Init device identity
  sync.getDeviceId(userDataPath);

  // Uploads stored in userData (not in the app bundle)
  uploadsDir = path.join(userDataPath, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  const upload = createMulter(uploadsDir);
  app = express();
  server = http.createServer(app);

  // ─── Middleware ──────────────────────────────────────────────────────────
  app.use(express.json());

  // Cookie parser (simple manual implementation to avoid extra dep)
  app.use((req, res, next) => {
    const cookieHeader = req.headers.cookie || '';
    req.cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
        .filter(([k]) => k)
    );
    next();
  });

  // CORS for Electron renderer
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // Serve uploaded files from userData
  app.use('/uploads', express.static(uploadsDir));

  // Serve the built Next.js static export (or redirect to localhost:3000 in dev)
  const nextOutDir = path.join(__dirname, '..', 'out');
  if (fs.existsSync(nextOutDir)) {
    app.use(express.static(nextOutDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      // SPA fallback — try exact file, then index.html
      const filePath = path.join(nextOutDir, req.path);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
      }
      const htmlPath = path.join(nextOutDir, req.path, 'index.html');
      if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
      res.sendFile(path.join(nextOutDir, 'index.html'));
    });
  }

  // ─── API ROUTES ──────────────────────────────────────────────────────────

  // AUTH: Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const match = AUTHORIZED_USERS.find(u => u.toLowerCase() === username?.toLowerCase());
      if (!match || password !== HARDCODED_PASSWORD) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const user = db.createOrFindUser(match, HARDCODED_PASSWORD, 'OPERATOR');
      const token = await new SignJWT({ id: user.id, username: user.username, role: user.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);

      res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);
      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
      console.error('[Auth]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // AUTH: Logout
  app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.json({ success: true });
  });

  // BATCHES: Get all
  app.get('/api/batches', requireAuth, (req, res) => {
    const batches = db.getAllBatches();
    res.json(batches);
  });

  // BATCHES: Receive (with image upload)
  app.post('/api/batches/receive', requireAuth, upload.single('labelImage'), async (req, res) => {
    try {
      const { reference } = req.body;
      const operatorId = req.user.id;
      const operatorName = req.user.username;

      if (!req.file) return res.status(400).json({ error: 'No image provided' });

      const relPath = `/uploads/labels/${req.file.filename}`;
      const batchRef = reference || `BATCH-${Math.floor(Math.random() * 100000)}`;
      const deviceId = sync.getDeviceId(userDataPath);
      const clock = sync.getCurrentClock();

      const batch = db.createBatch(
        { reference: batchRef, operatorId, labelImagePath: relPath },
        deviceId,
        clock
      );

      // Broadcast to peers
      const updatedClock = sync.broadcastSyncEvent('batch', 'CREATE', {
        ...batch, operatorId, labelImagePath: relPath
      });

      // Send email alert (non-blocking)
      sendNewBatchEmail(batch, operatorName);

      res.json({ success: true, batch });
    } catch (err) {
      console.error('[Receive]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // BATCHES: Validate (certificate upload)
  app.post('/api/batches/validate', requireAuth, upload.single('certificate'), async (req, res) => {
    try {
      const { batchId } = req.body;
      if (!batchId || !req.file) return res.status(400).json({ error: 'Missing data' });

      const type = req.file.mimetype.startsWith('image') ? 'labels' : 'certificates';
      const relPath = `/uploads/${type}/${req.file.filename}`;
      const deviceId = sync.getDeviceId(userDataPath);
      const clock = sync.getCurrentClock();

      db.updateBatchCertificate(batchId, relPath, deviceId, clock);

      sync.broadcastSyncEvent('batch', 'UPDATE', {
        id: batchId, certificatePath: relPath, status: 'VALIDATED',
        validatedAt: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (err) {
      console.error('[Validate]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Start WebSocket sync server ─────────────────────────────────────────
  sync.startSyncServer(server, userDataPath);

  // ─── Start mDNS discovery ─────────────────────────────────────────────────
  discovery.startDiscovery(userDataPath);

  // ─── Weekly cron job ──────────────────────────────────────────────────────
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    cron.schedule('0 9 * * 1', async () => {
      console.log('[Cron] Running weekly reminder job...');
      const batches = db.getAllBatches().filter(b => b.status === 'RECEIVED');
      if (!batches.length) return;
      const rows = batches.map(b =>
        `<tr><td>${b.reference}</td><td>${b.operator?.username || 'N/A'}</td><td>${new Date(b.receivedAt).toLocaleDateString()}</td></tr>`
      ).join('');
      const mailer = createMailer();
      await mailer.sendMail({
        from: `"SQA System" <${process.env.SMTP_USER}>`,
        to: TARGET_EMAIL,
        subject: `[QMS] ${batches.length} Batches Missing Certificates`,
        html: `<h2>Weekly Reminder</h2><table border="1"><tr><th>Reference</th><th>Operator</th><th>Date</th></tr>${rows}</table>`
      }).catch(console.error);
    });
  }

  // ─── Listen ───────────────────────────────────────────────────────────────
  return new Promise((resolve) => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] SQA Traceability server running on http://0.0.0.0:${PORT}`);
      resolve(server);
    });
  });
}

function getPeerCount() {
  return sync.getPeerCount();
}

module.exports = { start, getPeerCount };
