import { ipcMain, dialog } from 'electron';
import { join, basename } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';

// Default workspace structure
const WORKSPACE_STRUCTURE = {
  '.vnotions': {
    'config.json': {
      version: '1.0.0',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      settings: {
        theme: 'dark',
        autoSave: true,
        gitEnabled: false,
      }
    },
    'index.json': {
      pages: {},
      databases: {},
      templates: {},
      trash: {},
    }
  },
  'pages': {},
  'databases': {},
  'assets': {},
  'templates': {},
  'trash': {}
};

// Recent workspaces file path
const recentWorkspacesPath = join(homedir(), '.vnotions', 'recent-workspaces.json');

// Utility functions
function ensureDirectoryExists(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
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
    ensureDirectoryExists(join(filePath, '..'));
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing JSON file:', filePath, error);
    return false;
  }
}

function isValidWorkspace(workspacePath) {
  if (!workspacePath || !existsSync(workspacePath)) {
    return false;
  }

  // Check if it's a directory
  try {
    const stats = statSync(workspacePath);
    if (!stats.isDirectory()) {
      return false;
    }
  } catch {
    return false;
  }

  // Check if it has .vnotions directory or can be initialized
  const vnotionsPath = join(workspacePath, '.vnotions');
  return existsSync(vnotionsPath) || true; // Allow initialization of new workspaces
}

function createWorkspaceStructure(workspacePath) {
  try {
    // Create main workspace directory
    ensureDirectoryExists(workspacePath);

    // Create .vnotions directory and config
    const vnotionsPath = join(workspacePath, '.vnotions');
    ensureDirectoryExists(vnotionsPath);

    // Write config.json
    const configPath = join(vnotionsPath, 'config.json');
    if (!existsSync(configPath)) {
      writeJsonFile(configPath, WORKSPACE_STRUCTURE['.vnotions']['config.json']);
    }

    // Write index.json
    const indexPath = join(vnotionsPath, 'index.json');
    if (!existsSync(indexPath)) {
      writeJsonFile(indexPath, WORKSPACE_STRUCTURE['.vnotions']['index.json']);
    }

    // Create other directories
    const directories = ['pages', 'databases', 'assets', 'templates', 'trash'];
    directories.forEach(dir => {
      ensureDirectoryExists(join(workspacePath, dir));
    });

    return true;
  } catch (error) {
    console.error('Error creating workspace structure:', error);
    return false;
  }
}

function getWorkspaceInfo(workspacePath) {
  try {
    if (!isValidWorkspace(workspacePath)) {
      return null;
    }

    const configPath = join(workspacePath, '.vnotions', 'config.json');
    const indexPath = join(workspacePath, '.vnotions', 'index.json');

    const config = readJsonFile(configPath, {});
    const index = readJsonFile(indexPath, { pages: {}, databases: {}, templates: {}, trash: {} });

    const stats = statSync(workspacePath);

    return {
      path: workspacePath,
      name: basename(workspacePath),
      version: config.version || '1.0.0',
      created: config.created || stats.birthtime?.toISOString() || new Date().toISOString(),
      lastModified: config.lastModified || stats.mtime?.toISOString() || new Date().toISOString(),
      settings: config.settings || {},
      pageCount: Object.keys(index.pages || {}).length,
      databaseCount: Object.keys(index.databases || {}).length,
      templateCount: Object.keys(index.templates || {}).length,
      trashCount: Object.keys(index.trash || {}).length,
    };
  } catch (error) {
    console.error('Error getting workspace info:', error);
    return null;
  }
}

function loadRecentWorkspaces() {
  return readJsonFile(recentWorkspacesPath, []);
}

function saveRecentWorkspaces(workspaces) {
  return writeJsonFile(recentWorkspacesPath, workspaces);
}

// IPC Handlers
ipcMain.handle('workspace:selectFolder', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Select Workspace Folder',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Select Workspace',
    });

    if (result.canceled || !result.filePaths.length) {
      return { canceled: true };
    }

    const selectedPath = result.filePaths[0];
    return { 
      canceled: false, 
      path: selectedPath,
      isValid: isValidWorkspace(selectedPath)
    };
  } catch (error) {
    console.error('Error selecting workspace folder:', error);
    return { error: error.message };
  }
});

ipcMain.handle('workspace:initialize', async (event, workspacePath) => {
  try {
    if (!workspacePath) {
      throw new Error('Workspace path is required');
    }

    const success = createWorkspaceStructure(workspacePath);
    if (!success) {
      throw new Error('Failed to create workspace structure');
    }

    // Add to recent workspaces
    const recentWorkspaces = loadRecentWorkspaces();
    const filteredWorkspaces = recentWorkspaces.filter(ws => ws.path !== workspacePath);
    filteredWorkspaces.unshift({
      path: workspacePath,
      name: basename(workspacePath),
      lastAccessed: new Date().toISOString()
    });

    // Keep only the 10 most recent workspaces
    const limitedWorkspaces = filteredWorkspaces.slice(0, 10);
    saveRecentWorkspaces(limitedWorkspaces);

    return { success: true, workspaceInfo: getWorkspaceInfo(workspacePath) };
  } catch (error) {
    console.error('Error initializing workspace:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('workspace:getInfo', async (event, workspacePath) => {
  try {
    const info = getWorkspaceInfo(workspacePath);
    return { success: true, info };
  } catch (error) {
    console.error('Error getting workspace info:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('workspace:validate', async (event, workspacePath) => {
  try {
    const isValid = isValidWorkspace(workspacePath);
    return { isValid, path: workspacePath };
  } catch (error) {
    console.error('Error validating workspace:', error);
    return { isValid: false, error: error.message };
  }
});

ipcMain.handle('workspace:createStructure', async (event, workspacePath) => {
  try {
    const success = createWorkspaceStructure(workspacePath);
    return { success };
  } catch (error) {
    console.error('Error creating workspace structure:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('workspace:getRecent', async () => {
  try {
    const recentWorkspaces = loadRecentWorkspaces();
    
    // Validate that recent workspaces still exist
    const validWorkspaces = recentWorkspaces.filter(workspace => {
      return existsSync(workspace.path) && isValidWorkspace(workspace.path);
    });

    // Save the filtered list
    if (validWorkspaces.length !== recentWorkspaces.length) {
      saveRecentWorkspaces(validWorkspaces);
    }

    return { success: true, workspaces: validWorkspaces };
  } catch (error) {
    console.error('Error getting recent workspaces:', error);
    return { success: false, error: error.message, workspaces: [] };
  }
});

ipcMain.handle('workspace:addRecent', async (event, workspacePath) => {
  try {
    if (!isValidWorkspace(workspacePath)) {
      throw new Error('Invalid workspace path');
    }

    const recentWorkspaces = loadRecentWorkspaces();
    const filteredWorkspaces = recentWorkspaces.filter(ws => ws.path !== workspacePath);
    
    filteredWorkspaces.unshift({
      path: workspacePath,
      name: basename(workspacePath),
      lastAccessed: new Date().toISOString()
    });

    // Keep only the 10 most recent workspaces
    const limitedWorkspaces = filteredWorkspaces.slice(0, 10);
    const success = saveRecentWorkspaces(limitedWorkspaces);

    return { success };
  } catch (error) {
    console.error('Error adding recent workspace:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('workspace:removeRecent', async (event, workspacePath) => {
  try {
    const recentWorkspaces = loadRecentWorkspaces();
    const filteredWorkspaces = recentWorkspaces.filter(ws => ws.path !== workspacePath);
    
    const success = saveRecentWorkspaces(filteredWorkspaces);
    return { success };
  } catch (error) {
    console.error('Error removing recent workspace:', error);
    return { success: false, error: error.message };
  }
});

console.log('Workspace IPC handlers registered');