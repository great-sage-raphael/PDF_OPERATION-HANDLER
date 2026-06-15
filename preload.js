const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFiles: (opts) => ipcRenderer.invoke('dialog:openFiles', opts),
  saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  writeFiles: (files) => ipcRenderer.invoke('fs:writeFiles', files),

  showInFinder: (filePath) => ipcRenderer.invoke('shell:showItem', filePath),
  getTmpDir: () => ipcRenderer.invoke('os:tmpDir'),
});
