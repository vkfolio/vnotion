import { ipcMain } from 'electron';
import { 
  readFileSync, 
  writeFileSync, 
  unlinkSync, 
  copyFileSync, 
  renameSync, 
  existsSync, 
  statSync,
  mkdirSync,
  readdirSync,
  rmSync,
  watch
} from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

// File watchers storage
const fileWatchers = new Map();

// Utility functions
function ensureDirectoryExists(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function isValidPath(filePath, workspacePath = null) {
  try {
    // Basic path validation
    if (!filePath || typeof filePath !== 'string') {
      return false;
    }

    // If workspace path is provided, ensure file is within workspace
    if (workspacePath) {
      const normalizedPath = filePath.replace(/\\/g, '/');
      const normalizedWorkspace = workspacePath.replace(/\\/g, '/');
      
      if (!normalizedPath.startsWith(normalizedWorkspace)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function readJsonFile(filePath, defaultValue = {}) {
  try {
    if (!existsSync(filePath)) {
      return defaultValue;
    }
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading JSON file:', filePath, error);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    ensureDirectoryExists(dirname(filePath));
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing JSON file:', filePath, error);
    return false;
  }
}

function updateWorkspaceIndex(workspacePath, type, id, operation, data = null) {
  try {
    const indexPath = join(workspacePath, '.vnotions', 'index.json');
    const index = readJsonFile(indexPath, { pages: {}, databases: {}, templates: {}, trash: {} });

    if (!index[type]) {
      index[type] = {};
    }

    switch (operation) {
      case 'create':
      case 'update':
        index[type][id] = {
          id,
          title: data?.title || 'Untitled',
          created: data?.created || new Date().toISOString(),
          lastModified: new Date().toISOString(),
          ...data
        };
        break;
      case 'delete':
        delete index[type][id];
        break;
      case 'move_to_trash':
        if (index[type][id]) {
          index.trash[id] = {
            ...index[type][id],
            deletedAt: new Date().toISOString(),
            originalType: type
          };
          delete index[type][id];
        }
        break;
      case 'restore_from_trash':
        if (index.trash[id]) {
          const originalType = index.trash[id].originalType || 'pages';
          index[originalType][id] = { ...index.trash[id] };
          delete index[originalType][id].deletedAt;
          delete index[originalType][id].originalType;
          delete index.trash[id];
        }
        break;
    }

    return writeJsonFile(indexPath, index);
  } catch (error) {
    console.error('Error updating workspace index:', error);
    return false;
  }
}

// Basic file operations
ipcMain.handle('files:read', async (event, filePath) => {
  try {
    if (!isValidPath(filePath)) {
      throw new Error('Invalid file path');
    }

    if (!existsSync(filePath)) {
      throw new Error('File does not exist');
    }

    const content = readFileSync(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    console.error('Error reading file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:write', async (event, filePath, content) => {
  try {
    if (!isValidPath(filePath)) {
      throw new Error('Invalid file path');
    }

    ensureDirectoryExists(dirname(filePath));
    writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error writing file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:delete', async (event, filePath) => {
  try {
    if (!isValidPath(filePath)) {
      throw new Error('Invalid file path');
    }

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:copy', async (event, sourcePath, destinationPath) => {
  try {
    if (!isValidPath(sourcePath) || !isValidPath(destinationPath)) {
      throw new Error('Invalid file path');
    }

    ensureDirectoryExists(dirname(destinationPath));
    copyFileSync(sourcePath, destinationPath);
    return { success: true };
  } catch (error) {
    console.error('Error copying file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:move', async (event, sourcePath, destinationPath) => {
  try {
    if (!isValidPath(sourcePath) || !isValidPath(destinationPath)) {
      throw new Error('Invalid file path');
    }

    ensureDirectoryExists(dirname(destinationPath));
    renameSync(sourcePath, destinationPath);
    return { success: true };
  } catch (error) {
    console.error('Error moving file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:exists', async (event, filePath) => {
  try {
    if (!isValidPath(filePath)) {
      return { exists: false };
    }

    const exists = existsSync(filePath);
    return { exists };
  } catch (error) {
    console.error('Error checking file existence:', error);
    return { exists: false, error: error.message };
  }
});

ipcMain.handle('files:getStats', async (event, filePath) => {
  try {
    if (!isValidPath(filePath)) {
      throw new Error('Invalid file path');
    }

    if (!existsSync(filePath)) {
      throw new Error('File does not exist');
    }

    const stats = statSync(filePath);
    return {
      success: true,
      stats: {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        created: stats.birthtime?.toISOString(),
        modified: stats.mtime?.toISOString(),
        accessed: stats.atime?.toISOString(),
      }
    };
  } catch (error) {
    console.error('Error getting file stats:', error);
    return { success: false, error: error.message };
  }
});

// Directory operations
ipcMain.handle('files:createDirectory', async (event, dirPath) => {
  try {
    if (!isValidPath(dirPath)) {
      throw new Error('Invalid directory path');
    }

    ensureDirectoryExists(dirPath);
    return { success: true };
  } catch (error) {
    console.error('Error creating directory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:readDirectory', async (event, dirPath) => {
  try {
    if (!isValidPath(dirPath)) {
      throw new Error('Invalid directory path');
    }

    if (!existsSync(dirPath)) {
      throw new Error('Directory does not exist');
    }

    const items = readdirSync(dirPath, { withFileTypes: true });
    const contents = items.map(item => ({
      name: item.name,
      isFile: item.isFile(),
      isDirectory: item.isDirectory(),
      path: join(dirPath, item.name)
    }));

    return { success: true, contents };
  } catch (error) {
    console.error('Error reading directory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:deleteDirectory', async (event, dirPath) => {
  try {
    if (!isValidPath(dirPath)) {
      throw new Error('Invalid directory path');
    }

    if (existsSync(dirPath)) {
      rmSync(dirPath, { recursive: true, force: true });
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting directory:', error);
    return { success: false, error: error.message };
  }
});

// VNotions-specific JSON operations
ipcMain.handle('files:readPage', async (event, workspacePath, pageId) => {
  try {
    if (!isValidPath(workspacePath) || !pageId) {
      throw new Error('Invalid workspace path or page ID');
    }

    const pagePath = join(workspacePath, 'pages', `${pageId}.json`);
    const pageData = readJsonFile(pagePath, null);

    if (!pageData) {
      throw new Error('Page not found');
    }

    return { success: true, page: pageData };
  } catch (error) {
    console.error('Error reading page:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:writePage', async (event, workspacePath, pageId, pageData) => {
  try {
    if (!isValidPath(workspacePath) || !pageId || !pageData) {
      throw new Error('Invalid parameters');
    }

    // Ensure page has required fields
    const page = {
      id: pageId,
      title: pageData.title || 'Untitled',
      content: pageData.content || '',
      created: pageData.created || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      type: pageData.type || 'page',
      properties: pageData.properties || {},
      ...pageData
    };

    const pagePath = join(workspacePath, 'pages', `${pageId}.json`);
    const success = writeJsonFile(pagePath, page);

    if (success) {
      // Update workspace index
      updateWorkspaceIndex(workspacePath, 'pages', pageId, 'update', page);
    }

    return { success };
  } catch (error) {
    console.error('Error writing page:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:deletePage', async (event, workspacePath, pageId) => {
  try {
    if (!isValidPath(workspacePath) || !pageId) {
      throw new Error('Invalid workspace path or page ID');
    }

    const pagePath = join(workspacePath, 'pages', `${pageId}.json`);
    
    if (existsSync(pagePath)) {
      // Move to trash instead of permanent deletion
      const trashPath = join(workspacePath, 'trash', `${pageId}.json`);
      ensureDirectoryExists(dirname(trashPath));
      renameSync(pagePath, trashPath);
      
      // Update workspace index
      updateWorkspaceIndex(workspacePath, 'pages', pageId, 'move_to_trash');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting page:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:readDatabase', async (event, workspacePath, databaseId) => {
  try {
    if (!isValidPath(workspacePath) || !databaseId) {
      throw new Error('Invalid workspace path or database ID');
    }

    const databasePath = join(workspacePath, 'databases', `${databaseId}.json`);
    const databaseData = readJsonFile(databasePath, null);

    if (!databaseData) {
      throw new Error('Database not found');
    }

    return { success: true, database: databaseData };
  } catch (error) {
    console.error('Error reading database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:writeDatabase', async (event, workspacePath, databaseId, databaseData) => {
  try {
    if (!isValidPath(workspacePath) || !databaseId || !databaseData) {
      throw new Error('Invalid parameters');
    }

    // Ensure database has required fields
    const database = {
      id: databaseId,
      title: databaseData.title || 'Untitled Database',
      schema: databaseData.schema || {},
      rows: databaseData.rows || [],
      views: databaseData.views || [],
      created: databaseData.created || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      ...databaseData
    };

    const databasePath = join(workspacePath, 'databases', `${databaseId}.json`);
    const success = writeJsonFile(databasePath, database);

    if (success) {
      // Update workspace index
      updateWorkspaceIndex(workspacePath, 'databases', databaseId, 'update', database);
    }

    return { success };
  } catch (error) {
    console.error('Error writing database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:deleteDatabase', async (event, workspacePath, databaseId) => {
  try {
    if (!isValidPath(workspacePath) || !databaseId) {
      throw new Error('Invalid workspace path or database ID');
    }

    const databasePath = join(workspacePath, 'databases', `${databaseId}.json`);
    
    if (existsSync(databasePath)) {
      // Move to trash instead of permanent deletion
      const trashPath = join(workspacePath, 'trash', `${databaseId}.json`);
      ensureDirectoryExists(dirname(trashPath));
      renameSync(databasePath, trashPath);
      
      // Update workspace index
      updateWorkspaceIndex(workspacePath, 'databases', databaseId, 'move_to_trash');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:listPages', async (event, workspacePath) => {
  try {
    if (!isValidPath(workspacePath)) {
      throw new Error('Invalid workspace path');
    }

    const indexPath = join(workspacePath, '.vnotions', 'index.json');
    const index = readJsonFile(indexPath, { pages: {} });

    return { success: true, pages: index.pages || {} };
  } catch (error) {
    console.error('Error listing pages:', error);
    return { success: false, error: error.message, pages: {} };
  }
});

ipcMain.handle('files:listDatabases', async (event, workspacePath) => {
  try {
    if (!isValidPath(workspacePath)) {
      throw new Error('Invalid workspace path');
    }

    const indexPath = join(workspacePath, '.vnotions', 'index.json');
    const index = readJsonFile(indexPath, { databases: {} });

    return { success: true, databases: index.databases || {} };
  } catch (error) {
    console.error('Error listing databases:', error);
    return { success: false, error: error.message, databases: {} };
  }
});

// File watching
ipcMain.handle('files:watch', async (event, filePath) => {
  try {
    if (!isValidPath(filePath)) {
      throw new Error('Invalid file path');
    }

    if (fileWatchers.has(filePath)) {
      return { success: true, message: 'File already being watched' };
    }

    const watcher = watch(filePath, (eventType, filename) => {
      event.sender.send('files:changed', filePath, eventType);
    });

    fileWatchers.set(filePath, watcher);
    return { success: true };
  } catch (error) {
    console.error('Error watching file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:unwatch', async (event, filePath) => {
  try {
    const watcher = fileWatchers.get(filePath);
    if (watcher) {
      watcher.close();
      fileWatchers.delete(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error unwatching file:', error);
    return { success: false, error: error.message };
  }
});

// Utility IPC handlers
ipcMain.handle('utils:joinPath', async (event, ...parts) => {
  return join(...parts);
});

ipcMain.handle('utils:dirname', async (event, filePath) => {
  return dirname(filePath);
});

ipcMain.handle('utils:basename', async (event, filePath, ext) => {
  return basename(filePath, ext);
});

ipcMain.handle('utils:extname', async (event, filePath) => {
  return extname(filePath);
});

ipcMain.handle('utils:isAbsolute', async (event, filePath) => {
  return require('path').isAbsolute(filePath);
});

ipcMain.handle('utils:normalize', async (event, filePath) => {
  return require('path').normalize(filePath);
});

ipcMain.handle('utils:generateUUID', async () => {
  return uuidv4();
});

ipcMain.handle('utils:formatDate', async (event, date, format) => {
  try {
    const dateObj = new Date(date);
    if (format === 'iso') {
      return dateObj.toISOString();
    }
    return dateObj.toLocaleString();
  } catch {
    return new Date().toISOString();
  }
});

console.log('File operations IPC handlers registered');