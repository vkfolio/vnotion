import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App methods
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    getAppDataPath: () => ipcRenderer.invoke('app:getAppDataPath'),
    showOpenDialog: (options) => ipcRenderer.invoke('app:showOpenDialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('app:showSaveDialog', options),
    showMessageBox: (options) => ipcRenderer.invoke('app:showMessageBox', options),
  },

  // Workspace operations
  workspace: {
    selectFolder: () => ipcRenderer.invoke('workspace:selectFolder'),
    initializeWorkspace: (workspacePath) => ipcRenderer.invoke('workspace:initialize', workspacePath),
    getWorkspaceInfo: (workspacePath) => ipcRenderer.invoke('workspace:getInfo', workspacePath),
    validateWorkspace: (workspacePath) => ipcRenderer.invoke('workspace:validate', workspacePath),
    createWorkspaceStructure: (workspacePath) => ipcRenderer.invoke('workspace:createStructure', workspacePath),
    getRecentWorkspaces: () => ipcRenderer.invoke('workspace:getRecent'),
    addRecentWorkspace: (workspacePath) => ipcRenderer.invoke('workspace:addRecent', workspacePath),
    removeRecentWorkspace: (workspacePath) => ipcRenderer.invoke('workspace:removeRecent', workspacePath),
  },

  // File operations
  files: {
    readFile: (filePath) => ipcRenderer.invoke('files:read', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('files:write', filePath, content),
    deleteFile: (filePath) => ipcRenderer.invoke('files:delete', filePath),
    copyFile: (sourcePath, destinationPath) => ipcRenderer.invoke('files:copy', sourcePath, destinationPath),
    moveFile: (sourcePath, destinationPath) => ipcRenderer.invoke('files:move', sourcePath, destinationPath),
    exists: (filePath) => ipcRenderer.invoke('files:exists', filePath),
    getStats: (filePath) => ipcRenderer.invoke('files:getStats', filePath),
    createDirectory: (dirPath) => ipcRenderer.invoke('files:createDirectory', dirPath),
    readDirectory: (dirPath) => ipcRenderer.invoke('files:readDirectory', dirPath),
    deleteDirectory: (dirPath) => ipcRenderer.invoke('files:deleteDirectory', dirPath),
    watchFile: (filePath) => ipcRenderer.invoke('files:watch', filePath),
    unwatchFile: (filePath) => ipcRenderer.invoke('files:unwatch', filePath),
  },

  // JSON file operations (specialized for VNotions data)
  json: {
    readPage: (workspacePath, pageId) => ipcRenderer.invoke('files:readPage', workspacePath, pageId),
    writePage: (workspacePath, pageId, pageData) => ipcRenderer.invoke('files:writePage', workspacePath, pageId, pageData),
    deletePage: (workspacePath, pageId) => ipcRenderer.invoke('files:deletePage', workspacePath, pageId),
    readDatabase: (workspacePath, databaseId) => ipcRenderer.invoke('files:readDatabase', workspacePath, databaseId),
    writeDatabase: (workspacePath, databaseId, databaseData) => ipcRenderer.invoke('files:writeDatabase', workspacePath, databaseId, databaseData),
    deleteDatabase: (workspacePath, databaseId) => ipcRenderer.invoke('files:deleteDatabase', workspacePath, databaseId),
    listPages: (workspacePath) => ipcRenderer.invoke('files:listPages', workspacePath),
    listDatabases: (workspacePath) => ipcRenderer.invoke('files:listDatabases', workspacePath),
  },

  // Settings operations
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    setAll: (settings) => ipcRenderer.invoke('settings:setAll', settings),
    delete: (key) => ipcRenderer.invoke('settings:delete', key),
    clear: () => ipcRenderer.invoke('settings:clear'),
    has: (key) => ipcRenderer.invoke('settings:has', key),
    getAppSettings: () => ipcRenderer.invoke('settings:getAppSettings'),
    setAppSettings: (settings) => ipcRenderer.invoke('settings:setAppSettings', settings),
    getWorkspaceSettings: (workspacePath) => ipcRenderer.invoke('settings:getWorkspaceSettings', workspacePath),
    setWorkspaceSettings: (workspacePath, settings) => ipcRenderer.invoke('settings:setWorkspaceSettings', workspacePath, settings),
  },

  // Event listeners for file system changes
  onFileChanged: (callback) => {
    const listener = (event, filePath, eventType) => callback(filePath, eventType);
    ipcRenderer.on('files:changed', listener);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('files:changed', listener);
  },

  onWorkspaceChanged: (callback) => {
    const listener = (event, workspacePath, eventType) => callback(workspacePath, eventType);
    ipcRenderer.on('workspace:changed', listener);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('workspace:changed', listener);
  },

  // Utility methods
  utils: {
    joinPath: (...parts) => ipcRenderer.invoke('utils:joinPath', ...parts),
    dirname: (filePath) => ipcRenderer.invoke('utils:dirname', filePath),
    basename: (filePath, ext) => ipcRenderer.invoke('utils:basename', filePath, ext),
    extname: (filePath) => ipcRenderer.invoke('utils:extname', filePath),
    isAbsolute: (filePath) => ipcRenderer.invoke('utils:isAbsolute', filePath),
    normalize: (filePath) => ipcRenderer.invoke('utils:normalize', filePath),
    generateUUID: () => ipcRenderer.invoke('utils:generateUUID'),
    formatDate: (date, format) => ipcRenderer.invoke('utils:formatDate', date, format),
  },
});

// Also expose a simpler API for common operations
contextBridge.exposeInMainWorld('vnotions', {
  // Quick access to common operations
  selectWorkspace: () => ipcRenderer.invoke('workspace:selectFolder'),
  loadPage: (workspacePath, pageId) => ipcRenderer.invoke('files:readPage', workspacePath, pageId),
  savePage: (workspacePath, pageId, content) => ipcRenderer.invoke('files:writePage', workspacePath, pageId, content),
  getSettings: (key) => ipcRenderer.invoke('settings:get', key),
  setSettings: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  
  // Platform detection
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
});

// Log successful preload
console.log('VNotions preload script loaded successfully');