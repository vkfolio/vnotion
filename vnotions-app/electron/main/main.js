import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

// Import IPC handlers
import '../ipc/workspace.js';
import '../ipc/files.js';
import '../ipc/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Keep a global reference of the window object
let mainWindow;

// App data directory
const appDataPath = join(homedir(), '.vnotions');

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready-to-show
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false, // Disabled for IPC communication
      preload: join(__dirname, '../preload/preload.js'),
      webSecurity: true,
    },
    icon: join(__dirname, '../../public/favicon.ico'),
  });

  // Set dark theme by default
  if (process.platform === 'darwin') {
    app.dock?.setIcon(join(__dirname, '../../public/favicon.ico'));
  }

  // Load the app
  if (isDevelopment) {
    // Development: Load from Nuxt dev server
    mainWindow.loadURL('http://localhost:3000');
    
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
    
    // Enable live reload
    if (process.env.NODE_ENV === 'development') {
      import('electron-reload').then(({ default: electronReload }) => {
        electronReload(__dirname, {
          electron: join(__dirname, '../../node_modules/.bin/electron'),
          hardResetMethod: 'exit'
        });
      }).catch(() => {
        // electron-reload is optional in development
      });
    }
  } else {
    // Production: Load built files
    const indexPath = join(__dirname, '../../.output/public/index.html');
    if (existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      // Fallback for different build outputs
      mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
    }
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus window on creation
    if (isDevelopment) {
      mainWindow.focus();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external websites
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });

  return mainWindow;
}

// Initialize app data directory
function initializeAppData() {
  if (!existsSync(appDataPath)) {
    try {
      mkdirSync(appDataPath, { recursive: true });
      console.log('Created app data directory:', appDataPath);
    } catch (error) {
      console.error('Failed to create app data directory:', error);
    }
  }
}

// App event handlers
app.whenReady().then(() => {
  // Initialize app data directory
  initializeAppData();
  
  // Create main window
  createWindow();

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Global IPC handlers
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

ipcMain.handle('app:getAppDataPath', () => {
  return appDataPath;
});

ipcMain.handle('app:showOpenDialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('app:showSaveDialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('app:showMessageBox', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// Export for testing
export { mainWindow, appDataPath };