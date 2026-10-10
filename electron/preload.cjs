const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'rider',
  Object.freeze({
    getSettings: () => ipcRenderer.invoke('settings:get'),
    saveSettings: (settings, token) => ipcRenderer.invoke('settings:save', settings, token),
    removeToken: () => ipcRenderer.invoke('token:remove'),
    refresh: () => ipcRenderer.invoke('metrics:refresh'),
    openWebsite: (url) => ipcRenderer.invoke('website:open', url),
    windowAction: (action) => ipcRenderer.invoke('window:action', action),
    onSnapshot: (callback) => {
      const handler = (_event, snapshot) => callback(snapshot);
      ipcRenderer.on('metrics:snapshot', handler);
      return () => ipcRenderer.removeListener('metrics:snapshot', handler);
    },
  }),
);
