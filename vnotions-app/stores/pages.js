/**
 * Pages Pinia Store
 * Manages page operations, content, and hierarchy
 */

import { defineStore } from 'pinia'
import { 
  createPage, 
  validatePage, 
  touchPage, 
  deletePage, 
  restorePage, 
  duplicatePage,
  getPageFilePath,
  searchPages,
  extractTextFromContent
} from '~/utils/page.js'
import { useWorkspaceStore } from './workspace.js'

export const usePagesStore = defineStore('pages', {
  state: () => ({
    // Current page being edited
    currentPage: null,
    currentPageId: null,
    
    // Page operations state
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    
    // Editor state
    editorContent: null,
    editorSelection: null,
    
    // Search and filters
    searchQuery: '',
    searchResults: [],
    filters: {
      showDeleted: false,
      tags: [],
      dateRange: null,
      sortBy: 'modified', // 'created', 'modified', 'title'
      sortOrder: 'desc' // 'asc', 'desc'
    },
    
    // Auto-save
    autoSaveTimeout: null,
    lastSaved: null,
    
    // Conflicts and versions
    conflicts: new Map(), // Page ID -> Conflict data
    
    // UI state
    expandedPages: new Set(), // Page IDs that are expanded in tree
    selectedPages: new Set(), // Multi-selection for bulk operations
    
    // Recent operations for undo/redo
    operationHistory: [],
    currentHistoryIndex: -1,
    maxHistorySize: 50
  }),

  getters: {
    /**
     * Get current page data
     */
    currentPageData: (state) => {
      if (!state.currentPageId) return null
      const workspace = useWorkspaceStore()
      return workspace.structure.pages.get(state.currentPageId)
    },

    /**
     * Check if current page exists
     */
    hasCurrentPage: (state) => {
      return state.currentPageId && state.currentPage
    },

    /**
     * Get filtered and sorted pages
     */
    filteredPages: (state) => {
      const workspace = useWorkspaceStore()
      let pages = Array.from(workspace.structure.pages.values())

      // Apply filters
      if (!state.filters.showDeleted) {
        pages = pages.filter(page => !page.deleted)
      }

      if (state.filters.tags.length > 0) {
        pages = pages.filter(page => {
          const pageTags = page.properties.tags || []
          return state.filters.tags.some(tag => pageTags.includes(tag))
        })
      }

      if (state.filters.dateRange) {
        const { start, end } = state.filters.dateRange
        pages = pages.filter(page => {
          const date = new Date(page.created)
          return date >= start && date <= end
        })
      }

      // Apply search
      if (state.searchQuery) {
        pages = searchPages(pages, state.searchQuery)
      }

      // Apply sorting
      pages.sort((a, b) => {
        let aValue, bValue
        
        switch (state.filters.sortBy) {
          case 'title':
            aValue = a.title.toLowerCase()
            bValue = b.title.toLowerCase()
            break
          case 'created':
            aValue = new Date(a.created)
            bValue = new Date(b.created)
            break
          case 'modified':
          default:
            aValue = new Date(a.modified)
            bValue = new Date(b.modified)
            break
        }

        if (state.filters.sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })

      return pages
    },

    /**
     * Get pages by parent ID
     */
    getPagesByParent: (state) => (parentId) => {
      const workspace = useWorkspaceStore()
      return workspace.getChildrenPages(parentId)
    },

    /**
     * Check if page has conflicts
     */
    hasConflicts: (state) => (pageId) => {
      return state.conflicts.has(pageId)
    },

    /**
     * Get page hierarchy depth
     */
    getPageDepth: (state) => (pageId) => {
      const workspace = useWorkspaceStore()
      let depth = 0
      let currentId = pageId
      const visited = new Set()

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const page = workspace.structure.pages.get(currentId)
        if (page && page.parent) {
          depth++
          currentId = page.parent
        } else {
          break
        }
      }

      return depth
    },

    /**
     * Check if can undo
     */
    canUndo: (state) => {
      return state.currentHistoryIndex > 0
    },

    /**
     * Check if can redo
     */
    canRedo: (state) => {
      return state.currentHistoryIndex < state.operationHistory.length - 1
    }
  },

  actions: {
    /**
     * Create a new page
     * @param {Object} options - Page creation options
     * @returns {Object} Created page object
     */
    async createPage(options = {}) {
      this.isLoading = true

      try {
        const workspace = useWorkspaceStore()
        const page = createPage(options)

        // Validate page
        const validation = validatePage(page)
        if (!validation.isValid) {
          throw new Error(`Invalid page data: ${validation.errors.join(', ')}`)
        }

        // Add to workspace
        workspace.structure.pages.set(page.id, page)

        // Update hierarchy
        if (page.parent) {
          if (!workspace.index.pagesByParent.has(page.parent)) {
            workspace.index.pagesByParent.set(page.parent, [])
          }
          workspace.index.pagesByParent.get(page.parent).push(page.id)
        } else {
          workspace.index.hierarchy.push(page.id)
        }

        // Save to storage
        await this.savePage(page)

        // Add to history
        this.addToHistory('create', { page })

        // Auto-save workspace
        if (workspace.settings.autoSave) {
          await workspace.saveWorkspaceData()
        }

        console.log('Page created:', page.id)
        return page
      } catch (error) {
        console.error('Failed to create page:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Load page by ID
     * @param {string} pageId - Page UUID
     * @returns {Object|null} Page object or null
     */
    async loadPage(pageId) {
      this.isLoading = true

      try {
        const workspace = useWorkspaceStore()
        
        // Check if already loaded
        let page = workspace.structure.pages.get(pageId)
        
        if (!page) {
          // Load from storage
          const pageData = await workspace.loadFile(getPageFilePath(pageId))
          
          if (pageData) {
            const validation = validatePage(pageData)
            if (validation.isValid) {
              workspace.structure.pages.set(pageId, pageData)
              page = pageData
            } else {
              throw new Error(`Invalid page data: ${validation.errors.join(', ')}`)
            }
          }
        }

        if (page) {
          // Add to recent pages
          workspace.addToRecentPages(pageId)
        }

        return page
      } catch (error) {
        console.error('Failed to load page:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Set current page for editing
     * @param {string} pageId - Page UUID
     */
    async setCurrentPage(pageId) {
      if (this.currentPageId === pageId) return

      // Save current page if has unsaved changes
      if (this.hasUnsavedChanges && this.currentPage) {
        await this.saveCurrentPage()
      }

      // Load new page
      const page = await this.loadPage(pageId)
      
      if (page) {
        this.currentPageId = pageId
        this.currentPage = { ...page }
        this.editorContent = page.content
        this.hasUnsavedChanges = false
        
        // Clear auto-save timeout
        if (this.autoSaveTimeout) {
          clearTimeout(this.autoSaveTimeout)
          this.autoSaveTimeout = null
        }
      }
    },

    /**
     * Update current page content
     * @param {Object} content - TipTap JSON content
     */
    updateCurrentPageContent(content) {
      if (!this.currentPage) return

      this.currentPage.content = content
      this.editorContent = content
      this.hasUnsavedChanges = true

      // Schedule auto-save
      this.scheduleAutoSave()
    },

    /**
     * Update current page properties
     * @param {Object} updates - Properties to update
     */
    updateCurrentPage(updates) {
      if (!this.currentPage) return

      this.currentPage = {
        ...this.currentPage,
        ...updates,
        modified: new Date().toISOString()
      }
      this.hasUnsavedChanges = true

      // Schedule auto-save
      this.scheduleAutoSave()
    },

    /**
     * Save current page
     */
    async saveCurrentPage() {
      if (!this.currentPage || !this.hasUnsavedChanges) return

      this.isSaving = true

      try {
        await this.savePage(this.currentPage)
        this.hasUnsavedChanges = false
        this.lastSaved = new Date().toISOString()

        // Update workspace
        const workspace = useWorkspaceStore()
        workspace.structure.pages.set(this.currentPage.id, { ...this.currentPage })

        console.log('Page saved:', this.currentPage.id)
      } catch (error) {
        console.error('Failed to save page:', error)
        throw error
      } finally {
        this.isSaving = false
      }
    },

    /**
     * Save page to storage
     * @param {Object} page - Page object to save
     */
    async savePage(page) {
      const workspace = useWorkspaceStore()
      const filePath = getPageFilePath(page.id)
      
      await workspace.saveFile(filePath, page)
    },

    /**
     * Move page to new parent
     * @param {string} pageId - Page to move
     * @param {string|null} newParentId - New parent ID (null for root)
     */
    async movePage(pageId, newParentId) {
      const workspace = useWorkspaceStore()
      const page = workspace.structure.pages.get(pageId)
      
      if (!page) {
        throw new Error('Page not found')
      }

      // Prevent circular references
      if (newParentId && this.wouldCreateCircularReference(pageId, newParentId)) {
        throw new Error('Cannot move page: would create circular reference')
      }

      const oldParentId = page.parent

      // Update page
      const updatedPage = touchPage({
        ...page,
        parent: newParentId
      })

      // Update workspace structure
      workspace.structure.pages.set(pageId, updatedPage)

      // Update hierarchy indexes
      this.updateHierarchyAfterMove(pageId, oldParentId, newParentId)

      // Save page
      await this.savePage(updatedPage)

      // Add to history
      this.addToHistory('move', { 
        pageId, 
        oldParentId, 
        newParentId 
      })

      // Update current page if it's the one being moved
      if (this.currentPageId === pageId) {
        this.currentPage = { ...updatedPage }
      }
    },

    /**
     * Delete page (move to trash)
     * @param {string} pageId - Page ID to delete
     */
    async deletePageToTrash(pageId) {
      const workspace = useWorkspaceStore()
      const page = workspace.structure.pages.get(pageId)
      
      if (!page) {
        throw new Error('Page not found')
      }

      // Delete page
      const deletedPage = deletePage(page)
      workspace.structure.pages.set(pageId, deletedPage)

      // Remove from hierarchy
      this.removeFromHierarchy(pageId)

      // Save page
      await this.savePage(deletedPage)

      // Add to history
      this.addToHistory('delete', { page: { ...page } })

      // If current page is deleted, clear it
      if (this.currentPageId === pageId) {
        this.currentPageId = null
        this.currentPage = null
        this.editorContent = null
        this.hasUnsavedChanges = false
      }
    },

    /**
     * Restore page from trash
     * @param {string} pageId - Page ID to restore
     */
    async restorePageFromTrash(pageId) {
      const workspace = useWorkspaceStore()
      const page = workspace.structure.pages.get(pageId)
      
      if (!page || !page.deleted) {
        throw new Error('Page not found in trash')
      }

      // Restore page
      const restoredPage = restorePage(page)
      workspace.structure.pages.set(pageId, restoredPage)

      // Add back to hierarchy
      this.addToHierarchy(pageId, restoredPage.parent)

      // Save page
      await this.savePage(restoredPage)

      // Add to history
      this.addToHistory('restore', { page: { ...restoredPage } })
    },

    /**
     * Permanently delete page
     * @param {string} pageId - Page ID to permanently delete
     */
    async permanentlyDeletePage(pageId) {
      const workspace = useWorkspaceStore()
      const page = workspace.structure.pages.get(pageId)
      
      if (!page) {
        throw new Error('Page not found')
      }

      // Remove from workspace
      workspace.structure.pages.delete(pageId)

      // Remove from hierarchy
      this.removeFromHierarchy(pageId)

      // Delete file
      try {
        const filePath = getPageFilePath(pageId)
        await $fetch('/api/workspace/file', {
          method: 'DELETE',
          body: {
            workspace: workspace.workspacePath,
            path: filePath
          }
        })
      } catch (error) {
        console.warn('Failed to delete page file:', error)
      }

      // Add to history
      this.addToHistory('permanentDelete', { page: { ...page } })

      // If current page is deleted, clear it
      if (this.currentPageId === pageId) {
        this.currentPageId = null
        this.currentPage = null
        this.editorContent = null
        this.hasUnsavedChanges = false
      }
    },

    /**
     * Duplicate page
     * @param {string} pageId - Page ID to duplicate
     * @param {Object} options - Duplication options
     * @returns {Object} Duplicated page
     */
    async duplicatePageAction(pageId, options = {}) {
      const workspace = useWorkspaceStore()
      const originalPage = workspace.structure.pages.get(pageId)
      
      if (!originalPage) {
        throw new Error('Page not found')
      }

      // Create duplicate
      const duplicatedPage = duplicatePage(originalPage, options)

      // Add to workspace
      workspace.structure.pages.set(duplicatedPage.id, duplicatedPage)

      // Add to hierarchy
      this.addToHierarchy(duplicatedPage.id, duplicatedPage.parent)

      // Save page
      await this.savePage(duplicatedPage)

      // Add to history
      this.addToHistory('duplicate', { 
        originalId: pageId, 
        duplicatedPage 
      })

      return duplicatedPage
    },

    /**
     * Search pages
     * @param {string} query - Search query
     */
    async searchPagesAction(query) {
      this.searchQuery = query
      
      if (!query) {
        this.searchResults = []
        return
      }

      const workspace = useWorkspaceStore()
      const pages = Array.from(workspace.structure.pages.values())
      this.searchResults = searchPages(pages, query)
    },

    /**
     * Schedule auto-save
     */
    scheduleAutoSave() {
      const workspace = useWorkspaceStore()
      
      if (!workspace.settings.autoSave) return

      // Clear existing timeout
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout)
      }

      // Schedule new auto-save
      this.autoSaveTimeout = setTimeout(() => {
        this.saveCurrentPage().catch(console.error)
      }, workspace.settings.autoSaveInterval)
    },

    /**
     * Add operation to history for undo/redo
     * @param {string} type - Operation type
     * @param {Object} data - Operation data
     */
    addToHistory(type, data) {
      const operation = {
        type,
        data,
        timestamp: new Date().toISOString()
      }

      // Remove any history after current index
      this.operationHistory = this.operationHistory.slice(0, this.currentHistoryIndex + 1)

      // Add new operation
      this.operationHistory.push(operation)
      this.currentHistoryIndex = this.operationHistory.length - 1

      // Limit history size
      if (this.operationHistory.length > this.maxHistorySize) {
        this.operationHistory.shift()
        this.currentHistoryIndex--
      }
    },

    /**
     * Helper methods for hierarchy management
     */
    updateHierarchyAfterMove(pageId, oldParentId, newParentId) {
      const workspace = useWorkspaceStore()

      // Remove from old parent
      if (oldParentId) {
        const oldSiblings = workspace.index.pagesByParent.get(oldParentId) || []
        const index = oldSiblings.indexOf(pageId)
        if (index > -1) {
          oldSiblings.splice(index, 1)
        }
      } else {
        const index = workspace.index.hierarchy.indexOf(pageId)
        if (index > -1) {
          workspace.index.hierarchy.splice(index, 1)
        }
      }

      // Add to new parent
      if (newParentId) {
        if (!workspace.index.pagesByParent.has(newParentId)) {
          workspace.index.pagesByParent.set(newParentId, [])
        }
        workspace.index.pagesByParent.get(newParentId).push(pageId)
      } else {
        workspace.index.hierarchy.push(pageId)
      }
    },

    removeFromHierarchy(pageId) {
      const workspace = useWorkspaceStore()
      const page = workspace.structure.pages.get(pageId)

      if (page?.parent) {
        const siblings = workspace.index.pagesByParent.get(page.parent) || []
        const index = siblings.indexOf(pageId)
        if (index > -1) {
          siblings.splice(index, 1)
        }
      } else {
        const index = workspace.index.hierarchy.indexOf(pageId)
        if (index > -1) {
          workspace.index.hierarchy.splice(index, 1)
        }
      }
    },

    addToHierarchy(pageId, parentId) {
      const workspace = useWorkspaceStore()

      if (parentId) {
        if (!workspace.index.pagesByParent.has(parentId)) {
          workspace.index.pagesByParent.set(parentId, [])
        }
        workspace.index.pagesByParent.get(parentId).push(pageId)
      } else {
        workspace.index.hierarchy.push(pageId)
      }
    },

    wouldCreateCircularReference(pageId, newParentId) {
      const workspace = useWorkspaceStore()
      let currentId = newParentId
      const visited = new Set()

      while (currentId && !visited.has(currentId)) {
        if (currentId === pageId) {
          return true
        }
        visited.add(currentId)
        const page = workspace.structure.pages.get(currentId)
        currentId = page?.parent
      }

      return false
    }
  }
})