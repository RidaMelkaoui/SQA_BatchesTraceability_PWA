const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let tray = null;
let embeddedServer = null;

// ─── Single Instance Lock ───────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// ─── Get Local IP ───────────────────────────────────────────────────────────
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

// ─── Start embedded server (only in production) ─────────────────────────────
function startEmbeddedServer() {
  const isDevMode = !fs.existsSync(path.join(__dirname, '..', 'out'));
  if (isDevMode) {
    console.log('[Electron] DEV MODE — skipping embedded server, using Next.js dev server on :3000');
    return;
  }
  try {
    embeddedServer = require('./server');
    embeddedServer.start(app.getPath('userData'));
    console.log('[Electron] Embedded server started on port 8765');
  } catch (err) {
    console.error('[Electron] Failed to start embedded server:', err);
  }
}

// ─── Create Tray ────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;
  
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  
  function updateTrayMenu() {
    const peerCount = embeddedServer ? (embeddedServer.getPeerCount ? embeddedServer.getPeerCount() : 0) : 0;
    const localIP = getLocalIP();
    const isDev = !fs.existsSync(path.join(__dirname, '..', 'out'));
    const port = isDev ? 3000 : 8765;
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'SQA Traceability', enabled: false, type: 'normal' },
      { label: isDev ? '🔧 DEV MODE' : '🏭 PRODUCTION', enabled: false },
      { type: 'separator' },
      { label: `📡 IP: ${localIP}:${port}`, enabled: false },
      { label: `🔗 Peers connected: ${peerCount}`, enabled: false },
      { label: `✅ Server: Running`, enabled: false },
      { type: 'separator' },
      { label: 'Show App', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: 'Open in Browser', click: () => { shell.openExternal(`http://${localIP}:${port}`); } },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.setToolTip(`SQA Traceability — ${localIP}:${port} — ${peerCount} peers`);
  }

  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
  
  updateTrayMenu();
  setInterval(updateTrayMenu, 5000);
}

// ─── Create Main Window ─────────────────────────────────────────────────────
function createWindow() {
  // In dev mode (no out/ build), load Next.js dev server on port 3000
  // In production, load our embedded Express server on port 8765
  const isDevMode = !fs.existsSync(path.join(__dirname, '..', 'out'));
  const startURL = isDevMode ? 'http://localhost:3000' : 'http://localhost:8765';

  console.log(`[Electron] Loading ${isDevMode ? 'DEV (Next.js :3000)' : 'PROD (Embedded :8765)'}`);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SQA Traceability',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allow loading local files in prod
    },
    show: false, // Show only when ready
  });

  // Poll until server is ready, then load
  function tryLoad(retries = 20) {
    mainWindow.loadURL(startURL).catch((err) => {
      if (retries > 0) {
        console.log(`[Electron] Waiting for server... (${retries} retries left)`);
        setTimeout(() => tryLoad(retries - 1), 1500);
      } else {
        console.error('[Electron] Could not connect to server:', err.message);
      }
    });
  }

  setTimeout(() => tryLoad(), 2000);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // ─── Minimize to tray instead of close ──────────────────────────────────
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      tray?.displayBalloon?.({
        title: 'SQA Traceability',
        content: 'App is still running in the system tray. Right-click the tray icon to quit.',
        iconType: 'info',
      });
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────
ipcMain.handle('get-local-ip', () => getLocalIP());
ipcMain.handle('get-peer-count', () => {
  return embeddedServer?.getPeerCount ? embeddedServer.getPeerCount() : 0;
});
ipcMain.handle('get-server-port', () => 8765);

// ─── App Events ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startEmbeddedServer();
  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => { app.isQuitting = true; });

app.on('window-all-closed', () => {
  // Keep running in tray on Windows — don't quit
  if (process.platform === 'darwin') app.quit();
});
