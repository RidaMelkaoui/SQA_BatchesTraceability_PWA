// electron-main.js — Root Electron entry point
// ALL Electron API usage MUST be here. Sub-required modules cannot call require('electron').
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const APP_DIR = path.join(__dirname, 'backend');
const OUT_DIR = path.join(__dirname, 'out');

let mainWindow = null;
let tray = null;
let embeddedServer = null;

// ─── Single Instance Lock ────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show(); mainWindow.focus();
  }
});

// ─── Get Local IP ────────────────────────────────────────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

// ─── Start embedded server (Prod and Dev) ───────────────────────────────────
function startEmbeddedServer() {
  try {
    embeddedServer = require(path.join(APP_DIR, 'server.js'));
    embeddedServer.start(app.getPath('userData'));
    console.log('[Electron] Embedded server started on port 8765');
  } catch (err) {
    console.error('[Electron] Failed to start embedded server:', err.message);
  }
}

// ─── Create Tray ─────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(APP_DIR, 'assets', 'tray-icon.png');
  const trayIcon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(trayIcon);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });

  function updateTrayMenu() {
    const isDev = !fs.existsSync(OUT_DIR);
    const port = isDev ? 3000 : 8765; // The UI port
    const localIP = getLocalIP();
    const peerCount = embeddedServer?.getPeerCount?.() || 0;

    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'SQA Traceability', enabled: false },
      { label: isDev ? '🔧 DEV MODE' : '🏭 PRODUCTION', enabled: false },
      { type: 'separator' },
      { label: `📡 ${localIP}:${port}`, enabled: false },
      { label: `🔗 Peers: ${peerCount}`, enabled: false },
      { type: 'separator' },
      { label: 'Show App', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: 'Open in Browser', click: () => shell.openExternal(`http://${localIP}:${port}`) },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
    ]));
    tray.setToolTip(`SQA Traceability | ${localIP}:${port} | ${peerCount} peers`);
  }

  updateTrayMenu();
  setInterval(updateTrayMenu, 5000);
}

// ─── Create Main Window ──────────────────────────────────────────────────────
function createWindow() {
  const isDev = !fs.existsSync(OUT_DIR);
  const startURL = isDev ? 'http://localhost:3000' : 'http://localhost:8765';
  console.log(`[Electron] Loading ${isDev ? 'DEV :3000' : 'PROD :8765'}`);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SQA Traceability',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(APP_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    show: false,
  });

  function tryLoad(retries = 20) {
    mainWindow.loadURL(startURL).catch(err => {
      if (retries > 0) {
        setTimeout(() => tryLoad(retries - 1), 1500);
      } else {
        console.error('[Electron] Server unreachable:', err.message);
      }
    });
  }

  setTimeout(() => tryLoad(), 1500);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', event => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
ipcMain.handle('get-local-ip', () => getLocalIP());
ipcMain.handle('get-peer-count', () => embeddedServer?.getPeerCount?.() || 0);
ipcMain.handle('get-server-port', () => fs.existsSync(OUT_DIR) ? 8765 : 3000);

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startEmbeddedServer();
  createTray();
  createWindow();
  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('before-quit', () => { app.isQuitting = true; });
app.on('window-all-closed', () => { if (process.platform === 'darwin') app.quit(); });
