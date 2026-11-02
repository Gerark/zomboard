const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { QuestStore } = require('./quest-store.cjs');
const { AssetLibrary } = require('./asset-library.cjs');
const { inspectImage, closeImageInspectors } = require('./image-inspector.cjs');

async function createWindow() {
  const window = new BrowserWindow({
    title: 'ZomBoard Quest Editor',
    width: 1180,
    height: 820,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: '#111912',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  const pageURL = pathToFileURL(path.join(__dirname, 'index.html')).href;
  let operation = null;
  let dirty = false;
  let store;
  let assets;
  let lastDirectory;
  function trust(event) {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== pageURL) throw new Error('Untrusted quest browser request.');
  }
  function confirmDiscard() {
    if (operation) return false;
    return !dirty || dialog.showMessageBoxSync(window, {
      title: 'Unsaved quest changes', type: 'question',
      message: 'Discard your unsaved changes?',
      detail: 'Use Save quest to write them to the source file before leaving this quest.',
      buttons: ['Keep editing', 'Discard changes'], defaultId: 0, cancelId: 0
    }) === 1;
  }
  window.on('close', event => { if (!confirmDiscard()) event.preventDefault(); });
  window.on('closed', closeImageInspectors);
  ipcMain.handle('quest:dirty', (event, value) => {
    trust(event);
    if (!operation) { dirty = value === true; if (!dirty) assets?.clearStaged(); }
  });
  ipcMain.handle('quest:discard', event => { trust(event); return confirmDiscard(); });
  ipcMain.handle('board:open', async event => {
    trust(event);
    if (!confirmDiscard()) return { ok: true, canceled: true };
    operation = 'open';
    try {
      const choice = await dialog.showOpenDialog(window, {
        title: 'Open ZomBoard source folder',
        defaultPath: lastDirectory,
        properties: ['openDirectory']
      });
      if (choice.canceled || !choice.filePaths.length) return { ok: true, canceled: true };
      const candidate = await QuestStore.open(choice.filePaths[0]);
      store = candidate;
      assets = new AssetLibrary(store.board.root, inspectImage);
      dirty = false;
      lastDirectory = store.board.root;
      return { ok: true, board: store.board };
    } catch (error) {
      return { ok: false, error: error.message };
    } finally { operation = null; }
  });
  ipcMain.handle('quest:save', async (event, id, fields) => {
    trust(event);
    if (operation) return { ok: false, error: 'Another operation is in progress.' };
    if (!store) return { ok: false, error: 'Open a source folder first.' };
    operation = 'save';
    try {
      const result = await store.save(id, fields, { assets });
      dirty = false;
      return { ok: true, ...result };
    } catch (error) {
      return { ok: false, error: error.message, fieldErrors: error.fieldErrors, conflict: error.message.startsWith('CONFLICT:') };
    } finally { operation = null; }
  });
  ipcMain.handle('quest:create', async (event, fields) => {
    trust(event);
    if (operation) return { ok: false, error: 'Another operation is in progress.' };
    if (!store) return { ok: false, error: 'Open a source folder first.' };
    operation = 'save';
    try {
      const result = await store.create(fields, { assets });
      dirty = false;
      return { ok: true, ...result };
    } catch (error) {
      return { ok: false, error: error.message, fieldErrors: error.fieldErrors, conflict: error.message.startsWith('CONFLICT:') };
    } finally { operation = null; }
  });
  ipcMain.handle('assets:list', async event => {
    trust(event);
    try { if (!assets) throw new Error('Open a source folder first.'); return { ok: true, paths: await assets.list() }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
  ipcMain.handle('assets:preview', async (event, src) => {
    trust(event);
    try { if (!assets) throw new Error('Open a source folder first.'); return { ok: true, ...await assets.preview(src) }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
  ipcMain.handle('assets:import', async event => {
    trust(event);
    if (operation || !assets) return { ok: false, error: 'Open a source folder and finish the current operation first.' };
    operation = 'import';
    try {
      const choice = await dialog.showOpenDialog(window, { title: 'Import a quest image', properties: ['openFile'], filters: [{ name: 'Quest images', extensions: ['png', 'svg'] }] });
      if (choice.canceled || !choice.filePaths.length) return { ok: true, canceled: true };
      return { ok: true, image: await assets.stage(choice.filePaths[0]) };
    } catch (error) { return { ok: false, error: error.message }; }
    finally { operation = null; }
  });
  await window.loadFile(path.join(__dirname, 'index.html'));
  window.show();
}

app.whenReady().then(createWindow).catch(error => {
  console.error(error);
  dialog.showErrorBox('ZomBoard Quest Editor could not start', error.message);
  app.quit();
});

app.on('window-all-closed', () => app.quit());
