const os = require('os');

let bonjour = null;
let browser = null;
let advertiser = null;
const sync = require('./sync');

const SERVICE_TYPE = 'sqa-traceability';
const SERVER_PORT = 8765;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function startDiscovery(userDataPath) {
  try {
    const Bonjour = require('bonjour-service').Bonjour;
    bonjour = new Bonjour();
    const localIP = getLocalIP();

    // ─── Advertise ourselves ──────────────────────────────────────────────
    advertiser = bonjour.publish({
      name: `SQA-Traceability-${localIP}`,
      type: SERVICE_TYPE,
      port: SERVER_PORT,
      txt: {
        deviceId: sync.getDeviceId(userDataPath),
        version: '3.0.0',
        ip: localIP,
      }
    });

    console.log(`[Discovery] Advertising as SQA-Traceability-${localIP} on port ${SERVER_PORT}`);

    // ─── Browse for peers ─────────────────────────────────────────────────
    browser = bonjour.find({ type: SERVICE_TYPE }, (service) => {
      const peerIP = service.txt?.ip || (service.addresses && service.addresses[0]);
      if (!peerIP || peerIP === localIP) return; // Skip self

      console.log(`[Discovery] Found peer: ${service.name} @ ${peerIP}:${service.port}`);
      
      // Connect to the WebSocket server on the discovered peer
      sync.connectToPeer(peerIP, service.port, userDataPath);
    });

    browser.on('down', (service) => {
      const peerIP = service.txt?.ip;
      console.log(`[Discovery] Peer went offline: ${service.name} @ ${peerIP}`);
    });

    console.log('[Discovery] mDNS browser started. Scanning for peers...');
  } catch (err) {
    console.error('[Discovery] mDNS failed to start:', err.message);
    console.log('[Discovery] Continuing without auto-discovery (manual IP access still works)');
  }
}

function stopDiscovery() {
  try {
    browser?.stop();
    advertiser?.stop();
    bonjour?.destroy();
  } catch (err) { /* ignore */ }
}

module.exports = { startDiscovery, stopDiscovery };
