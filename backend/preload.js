const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  getPeerCount: () => ipcRenderer.invoke('get-peer-count'),
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  isElectron: true,
  onSyncEvent: (callback) => {
    ipcRenderer.on('sync-event', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('sync-event');
  }
});
