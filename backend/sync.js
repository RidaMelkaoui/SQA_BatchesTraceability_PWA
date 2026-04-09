const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const db = require('./database');

let wss = null;
let deviceId = null;
let vectorClock = {}; // { [deviceId]: incrementingCounter }
const peers = new Map(); // ws -> { deviceId, address }

// ─── Device ID (persistent per machine) ─────────────────────────────────────
function getDeviceId(userDataPath) {
  if (deviceId) return deviceId;
  const idFile = path.join(userDataPath, 'device-id');
  if (fs.existsSync(idFile)) {
    deviceId = fs.readFileSync(idFile, 'utf-8').trim();
  } else {
    deviceId = uuidv4();
    fs.writeFileSync(idFile, deviceId);
  }
  vectorClock[deviceId] = 0;
  return deviceId;
}

function incrementClock() {
  vectorClock[deviceId] = (vectorClock[deviceId] || 0) + 1;
  return { ...vectorClock };
}

function mergeClock(incomingClock) {
  for (const [id, val] of Object.entries(incomingClock)) {
    vectorClock[id] = Math.max(vectorClock[id] || 0, val);
  }
}

// ─── Start WebSocket Server ──────────────────────────────────────────────────
function startSyncServer(server, userDataPath) {
  getDeviceId(userDataPath);
  
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const address = req.socket.remoteAddress;
    console.log(`[Sync] Peer connected from ${address}`);

    // Send HELLO with our state
    safeSend(ws, {
      type: 'HELLO',
      deviceId,
      vectorClock,
      timestamp: Date.now(),
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(ws, msg, userDataPath);
      } catch (err) {
        console.error('[Sync] Bad message:', err.message);
      }
    });

    ws.on('close', () => {
      const peer = peers.get(ws);
      console.log(`[Sync] Peer ${peer?.deviceId || address} disconnected`);
      peers.delete(ws);
    });

    ws.on('error', (err) => {
      console.error(`[Sync] WebSocket error from ${address}:`, err.message);
    });
  });

  console.log('[Sync] WebSocket sync server ready');
}

// ─── Handle Incoming Messages ────────────────────────────────────────────────
function handleMessage(ws, msg, userDataPath) {
  switch (msg.type) {
    case 'HELLO': {
      peers.set(ws, { deviceId: msg.deviceId, address: ws._socket?.remoteAddress });
      mergeClock(msg.vectorClock || {});

      // Reply with full sync if they're behind
      const myBatches = db.getAllBatches();
      safeSend(ws, {
        type: 'SYNC_FULL',
        deviceId,
        batches: myBatches,
        vectorClock,
      });
      break;
    }

    case 'SYNC_FULL': {
      mergeClock(msg.vectorClock || {});
      if (msg.batches) {
        for (const batch of msg.batches) {
          db.upsertBatchFromSync({ ...batch, vectorClock: msg.vectorClock });
        }
      }
      console.log(`[Sync] Received full sync: ${msg.batches?.length || 0} batches`);
      break;
    }

    case 'SYNC_EVENT': {
      mergeClock(msg.vectorClock || {});
      if (msg.entityType === 'batch') {
        db.upsertBatchFromSync({ ...msg.payload, vectorClock: msg.vectorClock });
        console.log(`[Sync] Applied batch event: ${msg.operation} on ${msg.payload?.id}`);
        
        // Also try to fetch the image file if we don't have it
        if (msg.payload?.labelImagePath) {
          fetchFileFromPeer(ws, msg.payload.labelImagePath, userDataPath);
        }
        if (msg.payload?.certificatePath) {
          fetchFileFromPeer(ws, msg.payload.certificatePath, userDataPath);
        }
      }
      // Relay to other peers
      broadcastExcept(ws, msg);
      break;
    }

    case 'PING':
      safeSend(ws, { type: 'PONG', deviceId });
      break;
  }
}

// ─── Broadcast a sync event to all connected peers ──────────────────────────
function broadcastSyncEvent(entityType, operation, payload) {
  const clock = incrementClock();
  const msg = {
    type: 'SYNC_EVENT',
    entityType,
    operation,
    payload,
    deviceId,
    vectorClock: clock,
    timestamp: Date.now(),
  };

  let sent = 0;
  for (const [ws] of peers) {
    if (safeSend(ws, msg)) sent++;
  }
  console.log(`[Sync] Broadcasted ${operation} event to ${sent} peers`);
  return clock;
}

// ─── Broadcast except source ─────────────────────────────────────────────────
function broadcastExcept(sourcWs, msg) {
  for (const [ws] of peers) {
    if (ws !== sourcWs) safeSend(ws, msg);
  }
}

// ─── Fetch a file from a peer device ─────────────────────────────────────────
function fetchFileFromPeer(ws, filePath, userDataPath) {
  // Files are served by express static, filePath is like /uploads/labels/foo.jpg
  // We'll request it via HTTP from the peer
  const peer = peers.get(ws);
  if (!peer) return;
  // This is handled by the discovery module which knows the peer HTTP address
}

// ─── Connect to a discovered peer ──────────────────────────────────────────
function connectToPeer(address, port, userDataPath) {
  const url = `ws://${address}:${port}`;
  
  // Avoid duplicate connections
  for (const [ws, info] of peers) {
    if (info.address === address) return;
  }

  console.log(`[Sync] Connecting to peer: ${url}`);
  const ws = new WebSocket(url);

  ws.on('open', () => {
    peers.set(ws, { address, deviceId: null });
    safeSend(ws, { type: 'HELLO', deviceId, vectorClock, timestamp: Date.now() });
    
    // Start heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        safeSend(ws, { type: 'PING', deviceId });
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(ws, msg, userDataPath);
    } catch (err) { /* ignore */ }
  });

  ws.on('close', () => {
    peers.delete(ws);
    console.log(`[Sync] Lost connection to ${address}. Will retry on next discovery.`);
  });

  ws.on('error', (err) => {
    console.error(`[Sync] Cannot connect to ${address}:`, err.message);
    peers.delete(ws);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function safeSend(ws, data) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
  } catch (err) {
    console.error('[Sync] Send error:', err.message);
  }
  return false;
}

function getPeerCount() {
  return peers.size;
}

function getCurrentClock() {
  return { ...vectorClock };
}

module.exports = {
  startSyncServer,
  broadcastSyncEvent,
  connectToPeer,
  getPeerCount,
  getCurrentClock,
  getDeviceId,
};
