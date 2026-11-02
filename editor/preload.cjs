const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('questBrowser', Object.freeze({
  openBoard: () => ipcRenderer.invoke('board:open'),
  saveQuest: (id, fields) => ipcRenderer.invoke('quest:save', id, fields),
  createQuest: fields => ipcRenderer.invoke('quest:create', fields),
  setDirty: value => ipcRenderer.invoke('quest:dirty', value),
  confirmDiscard: () => ipcRenderer.invoke('quest:discard'),
  listImages: () => ipcRenderer.invoke('assets:list'),
  previewImage: src => ipcRenderer.invoke('assets:preview', src),
  importImage: () => ipcRenderer.invoke('assets:import')
}));
