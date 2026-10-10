const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'astraDesk',
  Object.freeze({
    getInfo: () => ipcRenderer.invoke('app:info'),
    openSupport: (target) => ipcRenderer.invoke('app:support', target),
    exportSettings: () => ipcRenderer.invoke('settings:export'),
    importSettings: () => ipcRenderer.invoke('settings:import'),
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
