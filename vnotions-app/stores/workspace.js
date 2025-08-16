/**
 * Workspace Pinia Store
 * Manages workspace configuration, settings, and file operations
 */

import { defineStore } from 'pinia'

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    // Workspace configuration
    workspacePath: null,
    workspaceName: '',
    isInitialized: false,
    isLoading: false,
    
    // Workspace structure
    structure: {
      pages: new Map(),
      databases: new Map(),
      templates: new Map(),
      assets: new Map(),
      trash: new Map()
    },
    
    // Index for quick lookups
    index: {
      hierarchy: [], // Root level pages
      pagesByParent: new Map(), // Parent ID -> Children IDs
      recentPages: [], // Recently accessed pages
      favoritePages: [], // User-favorited pages
      tags: new Map() // Tag name -> Page IDs
    },
    
    // Settings
    settings: {
      theme: 'light',
      language: 'en',
      autoSave: true,
      autoSaveInterval: 5000, // ms
      maxRecentPages: 20,
      gitIntegration: false,
      gitAutoCommit: false,
      backupEnabled: true,
      backupInterval: 60000, // ms
      editorSettings: {
        fontSize: 14,
        fontFamily: 'Inter',
        lineHeight: 1.6,
        showLineNumbers: false,
        wordWrap: true
      }
    },
    
    // Error handling
    errors: [],
    lastError: null
  }),

  getters: {
    /**
     * Get workspace configuration
     */
    workspaceConfig: (state) => ({
      path: state.workspacePath,
      name: state.workspaceName,
      initialized: state.isInitialized
    }),

    /**
     * Get all root level pages (pages without parent)
     */
    rootPages: (state) => {
      return state.index.hierarchy
        .map(id => state.structure.pages.get(id))
        .filter(Boolean)
        .filter(page => !page.deleted)
        .sort((a, b) => new Date(a.created) - new Date(b.created))
    },

    /**
     * Get children pages for a given parent ID
     */
    getChildrenPages: (state) => (parentId) => {
      const childIds = state.index.pagesByParent.get(parentId) || []
      return childIds
        .map(id => state.structure.pages.get(id))
        .filter(Boolean)
        .filter(page => !page.deleted)
        .sort((a, b) => new Date(a.created) - new Date(b.created))
    },

    /**
     * Get recently accessed pages
     */
    recentPages: (state) => {
      return state.index.recentPages
        .map(id => state.structure.pages.get(id))
        .filter(Boolean)
        .filter(page => !page.deleted)
    },

    /**
     * Get favorite pages
     */
    favoritePages: (state) => {
      return state.index.favoritePages
        .map(id => state.structure.pages.get(id))
        .filter(Boolean)
        .filter(page => !page.deleted)
    },

    /**
     * Get pages in trash
     */
    trashedPages: (state) => {
      return Array.from(state.structure.pages.values())
        .filter(page => page.deleted)
        .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
    },

    /**
     * Check if workspace has unsaved changes
     */
    hasUnsavedChanges: (state) => {
      // This would track if there are any pending file operations
      return false // Placeholder
    },

    /**
     * Get workspace statistics
     */
    statistics: (state) => {
      const pages = Array.from(state.structure.pages.values())
      return {
        totalPages: pages.length,
        activePages: pages.filter(p => !p.deleted).length,
        trashedPages: pages.filter(p => p.deleted).length,
        totalDatabases: state.structure.databases.size,
        totalAssets: state.structure.assets.size
      }
    }
  },

  actions: {
    /**
     * Initialize workspace from path
     * @param {string} path - Workspace directory path
     */
    async initializeWorkspace(path) {
      this.isLoading = true
      this.clearErrors()

      try {
        // Use Electron IPC to initialize workspace
        const result = await $fetch('/api/workspace/init', {
          method: 'POST',
          body: { path }
        })

        if (result.success) {
          this.workspacePath = path
          this.workspaceName = result.name || 'Untitled Workspace'
          this.isInitialized = true
          
          // Load workspace data
          await this.loadWorkspaceData()
        } else {
          throw new Error(result.error || 'Failed to initialize workspace')
        }
      } catch (error) {
        this.addError(`Failed to initialize workspace: ${error.message}`)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Load workspace data from storage
     */
    async loadWorkspaceData() {
      try {
        // Load index file
        const indexData = await this.loadFile('index.json')
        if (indexData) {
          this.index = { ...this.index, ...indexData }
        }

        // Load settings
        const settingsData = await this.loadFile('.vnotions/settings.json')
        if (settingsData) {
          this.settings = { ...this.settings, ...settingsData }
        }

        // Load all pages
        await this.loadAllPages()

        console.log('Workspace data loaded successfully')
      } catch (error) {
        this.addError(`Failed to load workspace data: ${error.message}`)
        throw error
      }
    },

    /**
     * Load all pages from storage
     */
    async loadAllPages() {
      try {
        const pageFiles = await this.listFiles('pages/')
        
        for (const filename of pageFiles) {
          if (filename.endsWith('.json')) {
            const pageId = filename.replace('.json', '')
            const pageData = await this.loadFile(`pages/${filename}`)
            
            if (pageData && pageData.id === pageId) {
              this.structure.pages.set(pageId, pageData)
            }
          }
        }

        // Rebuild hierarchy index
        this.rebuildHierarchyIndex()
      } catch (error) {
        this.addError(`Failed to load pages: ${error.message}`)
        throw error
      }
    },

    /**
     * Save workspace data to storage
     */
    async saveWorkspaceData() {
      try {
        // Save index
        await this.saveFile('index.json', this.index)
        
        // Save settings
        await this.saveFile('.vnotions/settings.json', this.settings)

        console.log('Workspace data saved successfully')
      } catch (error) {
        this.addError(`Failed to save workspace data: ${error.message}`)
        throw error
      }
    },

    /**
     * Load file from workspace
     * @param {string} relativePath - Relative path within workspace
     * @returns {Object|null} Parsed JSON data or null
     */
    async loadFile(relativePath) {
      try {
        const response = await $fetch('/api/workspace/file', {
          method: 'GET',
          query: { 
            workspace: this.workspacePath,
            path: relativePath 
          }
        })

        return response.success ? response.data : null
      } catch (error) {
        console.warn(`Failed to load file ${relativePath}:`, error.message)
        return null
      }
    },

    /**
     * Save file to workspace
     * @param {string} relativePath - Relative path within workspace
     * @param {Object} data - Data to save
     */
    async saveFile(relativePath, data) {
      try {
        const response = await $fetch('/api/workspace/file', {
          method: 'POST',
          body: {
            workspace: this.workspacePath,
            path: relativePath,
            data
          }
        })

        if (!response.success) {
          throw new Error(response.error || 'Failed to save file')
        }
      } catch (error) {
        this.addError(`Failed to save file ${relativePath}: ${error.message}`)
        throw error
      }
    },

    /**
     * List files in workspace directory
     * @param {string} relativePath - Relative directory path
     * @returns {Array} Array of filenames
     */
    async listFiles(relativePath = '') {
      try {
        const response = await $fetch('/api/workspace/list', {
          method: 'GET',
          query: {
            workspace: this.workspacePath,
            path: relativePath
          }
        })

        return response.success ? response.files : []
      } catch (error) {
        console.warn(`Failed to list files in ${relativePath}:`, error.message)
        return []
      }
    },

    /**
     * Add page to recent pages list
     * @param {string} pageId - Page UUID
     */
    addToRecentPages(pageId) {
      // Remove if already exists
      const index = this.index.recentPages.indexOf(pageId)
      if (index > -1) {
        this.index.recentPages.splice(index, 1)
      }

      // Add to front
      this.index.recentPages.unshift(pageId)

      // Limit size
      if (this.index.recentPages.length > this.settings.maxRecentPages) {
        this.index.recentPages = this.index.recentPages.slice(0, this.settings.maxRecentPages)
      }

      // Auto-save index
      if (this.settings.autoSave) {
        this.saveWorkspaceData()
      }
    },

    /**
     * Toggle page favorite status
     * @param {string} pageId - Page UUID
     */
    togglePageFavorite(pageId) {
      const index = this.index.favoritePages.indexOf(pageId)
      
      if (index > -1) {
        this.index.favoritePages.splice(index, 1)
      } else {
        this.index.favoritePages.push(pageId)
      }

      // Auto-save index
      if (this.settings.autoSave) {
        this.saveWorkspaceData()
      }
    },

    /**
     * Rebuild hierarchy index from pages
     */
    rebuildHierarchyIndex() {
      this.index.hierarchy = []
      this.index.pagesByParent.clear()

      for (const page of this.structure.pages.values()) {
        if (!page.deleted) {
          if (!page.parent) {
            // Root level page
            this.index.hierarchy.push(page.id)
          } else {
            // Child page
            if (!this.index.pagesByParent.has(page.parent)) {
              this.index.pagesByParent.set(page.parent, [])
            }
            this.index.pagesByParent.get(page.parent).push(page.id)
          }
        }
      }
    },

    /**
     * Update workspace settings
     * @param {Object} newSettings - Settings to update
     */
    async updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings }
      
      if (this.settings.autoSave) {
        await this.saveWorkspaceData()
      }
    },

    /**
     * Create workspace backup
     */
    async createBackup() {
      try {
        const response = await $fetch('/api/workspace/backup', {
          method: 'POST',
          body: { workspace: this.workspacePath }
        })

        if (!response.success) {
          throw new Error(response.error || 'Failed to create backup')
        }

        console.log('Backup created successfully:', response.backupPath)
        return response.backupPath
      } catch (error) {
        this.addError(`Failed to create backup: ${error.message}`)
        throw error
      }
    },

    /**
     * Add error to error list
     * @param {string} message - Error message
     */
    addError(message) {
      const error = {
        id: Date.now(),
        message,
        timestamp: new Date().toISOString()
      }
      
      this.errors.push(error)
      this.lastError = error
      
      console.error('Workspace error:', message)
    },

    /**
     * Clear all errors
     */
    clearErrors() {
      this.errors = []
      this.lastError = null
    },

    /**
     * Reset workspace state
     */
    resetWorkspace() {
      this.workspacePath = null
      this.workspaceName = ''
      this.isInitialized = false
      this.isLoading = false
      this.structure.pages.clear()
      this.structure.databases.clear()
      this.structure.templates.clear()
      this.structure.assets.clear()
      this.structure.trash.clear()
      this.index.hierarchy = []
      this.index.pagesByParent.clear()
      this.index.recentPages = []
      this.index.favoritePages = []
      this.index.tags.clear()
      this.clearErrors()
    }
  }
})