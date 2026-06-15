const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;


function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── IPC: Open file dialog ──────────────────────────────────────────────────
ipcMain.handle('dialog:openFiles', async (_, opts) => {
  const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], ...opts });
  if (result.canceled) return [];
  return result.filePaths.map(fp => ({
    path: fp,
    name: path.basename(fp),
    data: fs.readFileSync(fp).toString('base64'),
  }));
});

// ── IPC: Save file dialog ──────────────────────────────────────────────────
ipcMain.handle('dialog:saveFile', async (_, opts) => {
  const result = await dialog.showSaveDialog(opts);
  return result.canceled ? null : result.filePath;
});

// ── IPC: Write file ────────────────────────────────────────────────────────
ipcMain.handle('fs:writeFile', async (_, filePath, base64Data) => {
  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
  return true;
});

// ── IPC: Write multiple files ──────────────────────────────────────────────
ipcMain.handle('fs:writeFiles', async (_, files) => {
  // files = [{ path, data (base64) }]
  for (const f of files) {
    fs.writeFileSync(f.path, Buffer.from(f.data, 'base64'));
  }
  return true;
});


// ── IPC: Show in Finder ───────────────────────────────────────────────────
ipcMain.handle('shell:showItem', async (_, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

// ── IPC: Get temp dir ──────────────────────────────────────────────────────
ipcMain.handle('os:tmpDir', async () => require('os').tmpdir());

