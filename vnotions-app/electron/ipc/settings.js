import { ipcMain } from 'electron';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

// Settings file paths
const appDataPath = join(homedir(), '.vnotions');
const appSettingsPath = join(appDataPath, 'settings.json');

// Default settings
const DEFAULT_APP_SETTINGS = {
  version: '1.0.0',
  theme: 'dark',
  language: 'en',
  autoSave: true,
  autoBackup: true,
  checkForUpdates: true,
  telemetryEnabled: false,
  recentWorkspaces: [],
  windowState: {
    width: 1400,
    height: 900,
    maximized: false,
    fullscreen: false
  },
  editor: {
    fontSize: 14,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    lineHeight: 1.6,
    wordWrap: true,
    showLineNumbers: false,
    tabSize: 2,
    insertSpaces: true
  },
  ai: {
    enabled: false,
    provider: 'openai',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000
  },
  git: {
    enabled: false,
    autoCommit: false,
    commitMessage: 'Auto-commit: {timestamp}',
    userName: '',
    userEmail: ''
  },
  export: {
    defaultFormat: 'markdown',
    includeAssets: true,
    preserveStructure: true
  }
};

const DEFAULT_WORKSPACE_SETTINGS = {
  name: '',
  description: '',
  icon: '',
  color: '#6366f1',
  template: 'default',
  features: {
    git: false,
    ai: false,
    templates: true,
    trash: true
  },
  permissions: {
    allowExternalFiles: true,
    allowScripts: false,
    allowNetwork: false
  },
  backup: {
    enabled: true,
    frequency: 'daily',
    retention: 30,
    location: 'local'
  }
};

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

function mergeDeep(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  
  target[lastKey] = value;
}

function deleteNestedValue(obj, path) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    return current && current[key] ? current[key] : null;
  }, obj);
  
  if (target && lastKey in target) {
    delete target[lastKey];
    return true;
  }
  return false;
}

// Initialize app settings if they don't exist
function initializeAppSettings() {
  ensureDirectoryExists(appDataPath);
  
  if (!existsSync(appSettingsPath)) {
    writeJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
  } else {
    // Merge with defaults to ensure new settings are added
    const currentSettings = readJsonFile(appSettingsPath, {});
    const mergedSettings = mergeDeep(DEFAULT_APP_SETTINGS, currentSettings);
    writeJsonFile(appSettingsPath, mergedSettings);
  }
}

// Initialize on startup
initializeAppSettings();

// App-level settings IPC handlers
ipcMain.handle('settings:get', async (event, key) => {
  try {
    const settings = readJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
    
    if (!key) {
      return { success: true, value: settings };
    }
    
    const value = getNestedValue(settings, key);
    return { success: true, value };
  } catch (error) {
    console.error('Error getting setting:', error);
    return { success: false, error: error.message, value: null };
  }
});

ipcMain.handle('settings:set', async (event, key, value) => {
  try {
    if (!key) {
      throw new Error('Setting key is required');
    }
    
    const settings = readJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
    setNestedValue(settings, key, value);
    
    const success = writeJsonFile(appSettingsPath, settings);
    return { success };
  } catch (error) {
    console.error('Error setting value:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:getAll', async () => {
  try {
    const settings = readJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
    return { success: true, settings };
  } catch (error) {
    console.error('Error getting all settings:', error);
    return { success: false, error: error.message, settings: {} };
  }
});

ipcMain.handle('settings:setAll', async (event, newSettings) => {
  try {
    if (!newSettings || typeof newSettings !== 'object') {
      throw new Error('Invalid settings object');
    }
    
    // Merge with defaults to preserve structure
    const mergedSettings = mergeDeep(DEFAULT_APP_SETTINGS, newSettings);
    const success = writeJsonFile(appSettingsPath, mergedSettings);
    
    return { success };
  } catch (error) {
    console.error('Error setting all settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:delete', async (event, key) => {
  try {
    if (!key) {
      throw new Error('Setting key is required');
    }
    
    const settings = readJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
    const deleted = deleteNestedValue(settings, key);
    
    if (deleted) {
      const success = writeJsonFile(appSettingsPath, settings);
      return { success };
    }
    
    return { success: true }; // Key didn't exist, but that's fine
  } catch (error) {
    console.error('Error deleting setting:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:clear', async () => {
  try {
    const success = writeJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
    return { success };
  } catch (error) {
    console.error('Error clearing settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:has', async (event, key) => {
  try {
    const settings = readJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
    const value = getNestedValue(settings, key);
    return { success: true, exists: value !== undefined };
  } catch (error) {
    console.error('Error checking setting existence:', error);
    return { success: false, error: error.message, exists: false };
  }
});

// Specialized settings handlers
ipcMain.handle('settings:getAppSettings', async () => {
  try {
    const settings = readJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
    return { success: true, settings };
  } catch (error) {
    console.error('Error getting app settings:', error);
    return { success: false, error: error.message, settings: DEFAULT_APP_SETTINGS };
  }
});

ipcMain.handle('settings:setAppSettings', async (event, newSettings) => {
  try {
    if (!newSettings || typeof newSettings !== 'object') {
      throw new Error('Invalid settings object');
    }
    
    // Merge with existing settings
    const currentSettings = readJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
    const mergedSettings = mergeDeep(currentSettings, newSettings);
    
    const success = writeJsonFile(appSettingsPath, mergedSettings);
    return { success };
  } catch (error) {
    console.error('Error setting app settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:getWorkspaceSettings', async (event, workspacePath) => {
  try {
    if (!workspacePath) {
      throw new Error('Workspace path is required');
    }
    
    const settingsPath = join(workspacePath, '.vnotions', 'settings.json');
    const settings = readJsonFile(settingsPath, DEFAULT_WORKSPACE_SETTINGS);
    
    return { success: true, settings };
  } catch (error) {
    console.error('Error getting workspace settings:', error);
    return { success: false, error: error.message, settings: DEFAULT_WORKSPACE_SETTINGS };
  }
});

ipcMain.handle('settings:setWorkspaceSettings', async (event, workspacePath, newSettings) => {
  try {
    if (!workspacePath) {
      throw new Error('Workspace path is required');
    }
    
    if (!newSettings || typeof newSettings !== 'object') {
      throw new Error('Invalid settings object');
    }
    
    const settingsPath = join(workspacePath, '.vnotions', 'settings.json');
    
    // Merge with existing settings
    const currentSettings = readJsonFile(settingsPath, DEFAULT_WORKSPACE_SETTINGS);
    const mergedSettings = mergeDeep(currentSettings, newSettings);
    
    const success = writeJsonFile(settingsPath, mergedSettings);
    return { success };
  } catch (error) {
    console.error('Error setting workspace settings:', error);
    return { success: false, error: error.message };
  }
});

// Settings validation
ipcMain.handle('settings:validate', async (event, settings, type = 'app') => {
  try {
    const schema = type === 'app' ? DEFAULT_APP_SETTINGS : DEFAULT_WORKSPACE_SETTINGS;
    
    // Basic validation - check if all required keys exist
    const validate = (obj, schemaObj, path = '') => {
      const errors = [];
      
      for (const [key, value] of Object.entries(schemaObj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (!(key in obj)) {
          errors.push(`Missing required setting: ${currentPath}`);
        } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          // Recursively validate nested objects
          const nestedErrors = validate(obj[key], value, currentPath);
          errors.push(...nestedErrors);
        }
      }
      
      return errors;
    };
    
    const errors = validate(settings, schema);
    const isValid = errors.length === 0;
    
    return { success: true, isValid, errors };
  } catch (error) {
    console.error('Error validating settings:', error);
    return { success: false, error: error.message, isValid: false, errors: [] };
  }
});

// Settings export/import
ipcMain.handle('settings:export', async (event, type = 'app') => {
  try {
    let settings;
    
    if (type === 'app') {
      settings = readJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
    } else {
      throw new Error('Workspace export requires workspace path');
    }
    
    return { success: true, settings };
  } catch (error) {
    console.error('Error exporting settings:', error);
    return { success: false, error: error.message, settings: null };
  }
});

ipcMain.handle('settings:import', async (event, settings, type = 'app') => {
  try {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings object');
    }
    
    let success;
    
    if (type === 'app') {
      // Merge with defaults to ensure structure
      const mergedSettings = mergeDeep(DEFAULT_APP_SETTINGS, settings);
      success = writeJsonFile(appSettingsPath, mergedSettings);
    } else {
      throw new Error('Workspace import requires workspace path');
    }
    
    return { success };
  } catch (error) {
    console.error('Error importing settings:', error);
    return { success: false, error: error.message };
  }
});

// Settings reset
ipcMain.handle('settings:reset', async (event, type = 'app') => {
  try {
    let success;
    
    if (type === 'app') {
      success = writeJsonFile(appSettingsPath, DEFAULT_APP_SETTINGS);
    } else {
      throw new Error('Workspace reset requires workspace path');
    }
    
    return { success };
  } catch (error) {
    console.error('Error resetting settings:', error);
    return { success: false, error: error.message };
  }
});

console.log('Settings IPC handlers registered');