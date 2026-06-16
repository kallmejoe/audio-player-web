import { app, BrowserWindow, ipcMain, dialog, globalShortcut, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import chokidar from 'chokidar';

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { bypassCSP: true, supportFetchAPI: true, standard: true, stream: true, secure: true, corsEnabled: true } },
  { scheme: 'id3-cover', privileges: { bypassCSP: true, supportFetchAPI: true, standard: true, stream: true, secure: true, corsEnabled: true } }
]);

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.wma']);

interface FileInfo {
  name: string;
  path: string;
  size: number;
  relativePath: string;
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
    hasCover?: boolean;
  };
}

let mainWindow: BrowserWindow | null = null;
let folderWatcher: chokidar.FSWatcher | null = null;
let libraryPath: string | null = null;

// --- Config persistence ---
const CONFIG_FILE = path.join(app.getPath('userData'), 'molly-config.json');

function loadConfig(): { libraryPath?: string } {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return {};
}

function saveConfig(config: { libraryPath?: string }) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

function isAudioFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return AUDIO_EXTENSIONS.has(ext);
}

function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
}

async function scanDirectory(dirPath: string): Promise<{ audioFiles: FileInfo[]; imageFiles: FileInfo[] }> {
  const audioFiles: FileInfo[] = [];
  const imageFiles: FileInfo[] = [];

  let parseFile: any;
  try {
    const mm = await import('music-metadata');
    parseFile = mm.parseFile;
  } catch (e) {
    console.error('Failed to load music-metadata', e);
  }

  async function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const relativePath = path.relative(dirPath, fullPath);
          const stat = fs.statSync(fullPath);
          
          if (isAudioFile(fullPath)) {
            let metadata = undefined;
            if (parseFile) {
              try {
                const parsed = await parseFile(fullPath);
                metadata = {
                  title: parsed.common.title,
                  artist: parsed.common.artist,
                  album: parsed.common.album,
                  duration: parsed.format.duration,
                  hasCover: parsed.common.picture && parsed.common.picture.length > 0
                };
              } catch (e) {}
            }
            audioFiles.push({ name: entry.name, path: fullPath, size: stat.size, relativePath, metadata });
          } else if (isImageFile(fullPath)) {
            imageFiles.push({ name: entry.name, path: fullPath, size: stat.size, relativePath });
          }
        }
      }
    } catch (err) {
      console.error('Error scanning directory:', err);
    }
  }

  await walk(dirPath);
  return { audioFiles, imageFiles };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: {
      color: '#0a0a0a',
      symbolColor: '#ffffff',
      height: 36,
    },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerLocalFileProtocol() {
  // Handle audio/image file serving via local-file:// protocol
  protocol.handle('local-file', async (request) => {
    try {
      const url = new URL(request.url);
      const absolutePath = url.searchParams.get('path');
      if (!absolutePath) return new Response(null, { status: 400 });
      const fileUrl = pathToFileURL(absolutePath);
      
      const response = await net.fetch(fileUrl.toString(), {
        headers: request.headers, // forward Range headers
        bypassCustomProtocolHandlers: true
      });

      const headers = new Headers(response.headers);
      let contentType = headers.get('content-type');
      
      // Explicitly set MIME types for audio if net.fetch couldn't deduce it properly
      if (!contentType || contentType === 'application/octet-stream' || contentType.includes('text/')) {
        const ext = path.extname(absolutePath).toLowerCase();
        if (ext === '.mp3') headers.set('Content-Type', 'audio/mpeg');
        else if (ext === '.m4a') headers.set('Content-Type', 'audio/mp4');
        else if (ext === '.wav') headers.set('Content-Type', 'audio/wav');
        else if (ext === '.flac') headers.set('Content-Type', 'audio/flac');
        else if (ext === '.ogg') headers.set('Content-Type', 'audio/ogg');
        else if (ext === '.aac') headers.set('Content-Type', 'audio/aac');
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (e) {
      console.error('local-file protocol error:', e);
      return new Response(null, { status: 404 });
    }
  });

  protocol.handle('id3-cover', async (request) => {
    try {
      const url = new URL(request.url);
      const absolutePath = url.searchParams.get('path');
      if (!absolutePath) return new Response(null, { status: 400 });
      const { parseFile } = await import('music-metadata');
      const parsed = await parseFile(absolutePath);
      if (parsed.common.picture && parsed.common.picture.length > 0) {
        const pic = parsed.common.picture[0];
        return new Response(pic.data, { headers: { 'Content-Type': pic.format } });
      }
    } catch (e) {}
    return new Response(null, { status: 404 });
  });
}

function startWatching(dirPath: string) {
  if (folderWatcher) {
    folderWatcher.close();
  }

  const debounceTimer = 300;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  folderWatcher = chokidar.watch(dirPath, {
    ignored: /(^|[/\\])\./,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  });

  const sendUpdate = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      const { audioFiles, imageFiles } = await scanDirectory(dirPath);
      mainWindow?.webContents.send('library-files-updated', { audioFiles, imageFiles, libraryPath: dirPath });
    }, debounceTimer);
  };

  folderWatcher.on('add', sendUpdate);
  folderWatcher.on('unlink', sendUpdate);
  folderWatcher.on('change', sendUpdate);

  folderWatcher.on('error', (err) => {
    console.error('Watcher error:', err);
  });
}

function stopWatching() {
  if (folderWatcher) {
    folderWatcher.close();
    folderWatcher = null;
  }
}

function registerIpcHandlers() {
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select Music Library Folder',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('get-library-files', async (_event, dirPath: string) => {
    const { audioFiles, imageFiles } = await scanDirectory(dirPath);
    return { audioFiles, imageFiles, libraryPath: dirPath };
  });

  ipcMain.handle('watch-folder', async (_event, dirPath: string) => {
    libraryPath = dirPath;
    saveConfig({ libraryPath: dirPath });
    startWatching(dirPath);
    // Immediately scan and send existing files to the renderer
    const { audioFiles, imageFiles } = await scanDirectory(dirPath);
    mainWindow?.webContents.send('library-files-updated', { audioFiles, imageFiles, libraryPath: dirPath });
    return true;
  });

  ipcMain.handle('stop-watching', async () => {
    stopWatching();
    return true;
  });

  ipcMain.handle('get-library-path', async () => {
    return libraryPath;
  });

  ipcMain.handle('clear-library-path', async () => {
    libraryPath = null;
    stopWatching();
    saveConfig({ libraryPath: undefined });
    return true;
  });
}

function registerGlobalShortcuts() {
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow?.webContents.send('media-key', 'play-pause');
  });
  globalShortcut.register('MediaNextTrack', () => {
    mainWindow?.webContents.send('media-key', 'next');
  });
  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow?.webContents.send('media-key', 'previous');
  });
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(async () => {
  registerLocalFileProtocol();
  createWindow();
  registerIpcHandlers();
  registerGlobalShortcuts();

  // Restore saved library path and auto-scan
  const config = loadConfig();
  if (config.libraryPath && fs.existsSync(config.libraryPath)) {
    libraryPath = config.libraryPath;
    startWatching(config.libraryPath);
    const { audioFiles, imageFiles } = await scanDirectory(config.libraryPath);
    mainWindow?.webContents.send('library-files-updated', { audioFiles, imageFiles, libraryPath: config.libraryPath });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopWatching();
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  stopWatching();
  globalShortcut.unregisterAll();
});
