/**
 * Databases Pinia Store
 * Manages database operations, views, filtering, and data
 */

import { defineStore } from 'pinia'
import { 
  createDatabase, 
  createColumn, 
  createView, 
  createRow,
  validateDatabase,
  applyFilters,
  applySorts,
  groupRows,
  calculateFormula,
  touchDatabase,
  touchRow,
  getColumnDefaultValue,
  COLUMN_TYPES,
  VIEW_TYPES,
  SORT_DIRECTIONS
} from '~/utils/database.js'
import { useWorkspaceStore } from './workspace.js'

export const useDatabasesStore = defineStore('databases', {
  state: () => ({
    // Current database being viewed
    currentDatabase: null,
    currentDatabaseId: null,
    
    // Current view state
    currentView: null,
    currentViewId: null,
    
    // Loading states
    isLoading: false,
    isSaving: false,
    
    // View data (processed)
    viewData: {
      rows: [],
      filteredRows: [],
      sortedRows: [],
      groupedRows: new Map(),
      totalCount: 0
    },
    
    // Edit states
    editingRow: null,
    editingCell: null,
    selectedRows: new Set(),
    
    // Filter and sort state
    activeFilters: [],
    activeSorts: [],
    groupBy: null,
    
    // Search
    searchQuery: '',
    
    // UI state
    showFilters: false,
    showGrouping: false,
    columnWidths: new Map(),
    
    // Multi-database operations
    clipboard: null,
    
    // Relations cache
    relationsCache: new Map(),
    
    // Auto-save
    autoSaveTimeout: null
  }),

  getters: {
    /**
     * Get current database data
     */
    currentDatabaseData: (state) => {
      if (!state.currentDatabaseId) return null
      const workspace = useWorkspaceStore()
      return workspace.structure.databases?.get(state.currentDatabaseId)
    },

    /**
     * Get current view data
     */
    currentViewData: (state) => {
      if (!state.currentDatabase || !state.currentViewId) return null
      return state.currentDatabase.views.find(view => view.id === state.currentViewId)
    },

    /**
     * Get visible columns for current view
     */
    visibleColumns: (state) => {
      if (!state.currentDatabase || !state.currentView) return []
      
      const allColumns = state.currentDatabase.columns
      const visibleColumnIds = state.currentView.config.visible_columns
      
      if (visibleColumnIds && visibleColumnIds.length > 0) {
        return visibleColumnIds
          .map(id => allColumns.find(col => col.id === id))
          .filter(Boolean)
      }
      
      return allColumns.filter(col => col.visible !== false)
    },

    /**
     * Get filtered and processed rows
     */
    processedRows: (state) => {
      return state.viewData.sortedRows
    },

    /**
     * Get grouped data for board/grouped views
     */
    groupedData: (state) => {
      return state.viewData.groupedRows
    },

    /**
     * Check if database has unsaved changes
     */
    hasUnsavedChanges: (state) => {
      return state.editingRow !== null || state.autoSaveTimeout !== null
    },

    /**
     * Get all databases
     */
    allDatabases: (state) => {
      const workspace = useWorkspaceStore()
      return Array.from(workspace.structure.databases?.values() || [])
        .filter(db => !db.deleted)
    },

    /**
     * Get database by ID
     */
    getDatabaseById: (state) => (id) => {
      const workspace = useWorkspaceStore()
      return workspace.structure.databases?.get(id)
    },

    /**
     * Get relation options for a column
     */
    getRelationOptions: (state) => (column) => {
      if (column.type !== COLUMN_TYPES.RELATION) return []
      
      const targetDatabaseId = column.config.database_id
      if (!targetDatabaseId) return []
      
      const workspace = useWorkspaceStore()
      const targetDatabase = workspace.structure.databases?.get(targetDatabaseId)
      if (!targetDatabase) return []
      
      return targetDatabase.rows.map(row => {
        const primaryColumn = targetDatabase.columns.find(col => col.primary)
        const title = primaryColumn ? row.data[primaryColumn.id] : row.id
        
        return {
          id: row.id,
          title: title || 'Untitled',
          database: targetDatabase.title
        }
      })
    }
  },

  actions: {
    /**
     * Create a new database
     * @param {Object} options - Database creation options
     * @returns {Object} Created database
     */
    async createDatabase(options = {}) {
      this.isLoading = true

      try {
        const workspace = useWorkspaceStore()
        const database = createDatabase(options)

        // Validate database
        const validation = validateDatabase(database)
        if (!validation.isValid) {
          throw new Error(`Invalid database: ${validation.errors.join(', ')}`)
        }

        // Add to workspace
        if (!workspace.structure.databases) {
          workspace.structure.databases = new Map()
        }
        workspace.structure.databases.set(database.id, database)

        // Save to storage
        await this.saveDatabase(database)

        console.log('Database created:', database.id)
        return database
      } catch (error) {
        console.error('Failed to create database:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Load database by ID
     * @param {string} databaseId - Database ID
     */
    async loadDatabase(databaseId) {
      this.isLoading = true

      try {
        const workspace = useWorkspaceStore()
        let database = workspace.structure.databases?.get(databaseId)

        if (!database) {
          // Load from storage
          const databaseData = await workspace.loadFile(`databases/${databaseId}.json`)
          
          if (databaseData) {
            const validation = validateDatabase(databaseData)
            if (validation.isValid) {
              if (!workspace.structure.databases) {
                workspace.structure.databases = new Map()
              }
              workspace.structure.databases.set(databaseId, databaseData)
              database = databaseData
            } else {
              throw new Error(`Invalid database data: ${validation.errors.join(', ')}`)
            }
          }
        }

        if (!database) {
          throw new Error('Database not found')
        }

        this.currentDatabase = { ...database }
        this.currentDatabaseId = databaseId

        // Load default view
        const defaultView = database.views.find(view => view.is_default) || database.views[0]
        if (defaultView) {
          await this.setCurrentView(defaultView.id)
        }

        return database
      } catch (error) {
        console.error('Failed to load database:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Set current view
     * @param {string} viewId - View ID
     */
    async setCurrentView(viewId) {
      if (!this.currentDatabase) return

      const view = this.currentDatabase.views.find(v => v.id === viewId)
      if (!view) {
        throw new Error('View not found')
      }

      this.currentView = { ...view }
      this.currentViewId = viewId

      // Apply view configuration
      this.activeFilters = [...view.config.filters || []]
      this.activeSorts = [...view.config.sorts || []]
      this.groupBy = view.config.group_by || null

      // Process data for the view
      await this.processViewData()
    },

    /**
     * Process view data (filter, sort, group)
     */
    async processViewData() {
      if (!this.currentDatabase) return

      let rows = [...this.currentDatabase.rows]

      // Apply search
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        rows = rows.filter(row => {
          return this.currentDatabase.columns.some(column => {
            const value = row.data[column.id]
            return String(value || '').toLowerCase().includes(query)
          })
        })
      }

      // Apply filters
      const filteredRows = applyFilters(
        rows, 
        this.currentDatabase.columns, 
        this.activeFilters,
        this.currentView?.config.filter_operator || 'and'
      )

      // Apply sorts
      const sortedRows = applySorts(
        filteredRows,
        this.currentDatabase.columns,
        this.activeSorts
      )

      // Group rows if needed
      let groupedRows = new Map()
      if (this.groupBy) {
        groupedRows = groupRows(
          sortedRows,
          this.currentDatabase.columns,
          this.groupBy
        )
      }

      this.viewData = {
        rows: [...this.currentDatabase.rows],
        filteredRows,
        sortedRows,
        groupedRows,
        totalCount: this.currentDatabase.rows.length
      }
    },

    /**
     * Add new column to database
     * @param {Object} columnOptions - Column options
     */
    async addColumn(columnOptions = {}) {
      if (!this.currentDatabase) return

      const column = createColumn(columnOptions)
      this.currentDatabase.columns.push(column)

      // Update rows with default value
      this.currentDatabase.rows.forEach(row => {
        if (!(column.id in row.data)) {
          row.data[column.id] = getColumnDefaultValue(column)
        }
      })

      await this.saveCurrentDatabase()
      await this.processViewData()

      return column
    },

    /**
     * Update column
     * @param {string} columnId - Column ID
     * @param {Object} updates - Column updates
     */
    async updateColumn(columnId, updates) {
      if (!this.currentDatabase) return

      const columnIndex = this.currentDatabase.columns.findIndex(col => col.id === columnId)
      if (columnIndex === -1) return

      const oldColumn = this.currentDatabase.columns[columnIndex]
      const updatedColumn = { ...oldColumn, ...updates }

      // Handle type changes
      if (oldColumn.type !== updatedColumn.type) {
        // Convert values if needed
        this.currentDatabase.rows.forEach(row => {
          row.data[columnId] = this.convertCellValue(
            row.data[columnId], 
            oldColumn.type, 
            updatedColumn.type
          )
        })
      }

      this.currentDatabase.columns[columnIndex] = updatedColumn

      await this.saveCurrentDatabase()
      await this.processViewData()
    },

    /**
     * Delete column
     * @param {string} columnId - Column ID
     */
    async deleteColumn(columnId) {
      if (!this.currentDatabase) return

      const column = this.currentDatabase.columns.find(col => col.id === columnId)
      if (!column || column.primary) {
        throw new Error('Cannot delete primary column')
      }

      // Remove column
      this.currentDatabase.columns = this.currentDatabase.columns.filter(col => col.id !== columnId)

      // Remove data from rows
      this.currentDatabase.rows.forEach(row => {
        delete row.data[columnId]
      })

      await this.saveCurrentDatabase()
      await this.processViewData()
    },

    /**
     * Add new row to database
     * @param {Object} initialData - Initial row data
     * @returns {Object} Created row
     */
    async addRow(initialData = {}) {
      if (!this.currentDatabase) return

      const rowData = {}

      // Set default values for all columns
      this.currentDatabase.columns.forEach(column => {
        if (column.id in initialData) {
          rowData[column.id] = initialData[column.id]
        } else {
          rowData[column.id] = getColumnDefaultValue(column)
        }
      })

      const row = createRow({ data: rowData })
      this.currentDatabase.rows.push(row)

      await this.saveCurrentDatabase()
      await this.processViewData()

      return row
    },

    /**
     * Update row data
     * @param {string} rowId - Row ID
     * @param {Object} updates - Data updates
     */
    async updateRow(rowId, updates) {
      if (!this.currentDatabase) return

      const row = this.currentDatabase.rows.find(r => r.id === rowId)
      if (!row) return

      // Update row data
      Object.assign(row.data, updates)
      
      // Touch row
      Object.assign(row, touchRow(row))

      // Recalculate formulas
      this.recalculateFormulas(row)

      await this.saveCurrentDatabase()
      await this.processViewData()
    },

    /**
     * Delete row
     * @param {string} rowId - Row ID
     */
    async deleteRow(rowId) {
      if (!this.currentDatabase) return

      this.currentDatabase.rows = this.currentDatabase.rows.filter(r => r.id !== rowId)
      
      await this.saveCurrentDatabase()
      await this.processViewData()
    },

    /**
     * Duplicate row
     * @param {string} rowId - Row ID to duplicate
     * @returns {Object} Duplicated row
     */
    async duplicateRow(rowId) {
      if (!this.currentDatabase) return

      const originalRow = this.currentDatabase.rows.find(r => r.id === rowId)
      if (!originalRow) return

      const duplicatedRow = createRow({ 
        data: { ...originalRow.data }
      })

      this.currentDatabase.rows.push(duplicatedRow)

      await this.saveCurrentDatabase()
      await this.processViewData()

      return duplicatedRow
    },

    /**
     * Add filter to current view
     * @param {Object} filter - Filter definition
     */
    async addFilter(filter) {
      this.activeFilters.push(filter)
      
      if (this.currentView) {
        this.currentView.config.filters = [...this.activeFilters]
        await this.saveCurrentDatabase()
      }
      
      await this.processViewData()
    },

    /**
     * Update filter
     * @param {number} index - Filter index
     * @param {Object} updates - Filter updates
     */
    async updateFilter(index, updates) {
      if (index >= 0 && index < this.activeFilters.length) {
        this.activeFilters[index] = { ...this.activeFilters[index], ...updates }
        
        if (this.currentView) {
          this.currentView.config.filters = [...this.activeFilters]
          await this.saveCurrentDatabase()
        }
        
        await this.processViewData()
      }
    },

    /**
     * Remove filter
     * @param {number} index - Filter index
     */
    async removeFilter(index) {
      this.activeFilters.splice(index, 1)
      
      if (this.currentView) {
        this.currentView.config.filters = [...this.activeFilters]
        await this.saveCurrentDatabase()
      }
      
      await this.processViewData()
    },

    /**
     * Add sort to current view
     * @param {Object} sort - Sort definition
     */
    async addSort(sort) {
      // Remove existing sort for the same column
      this.activeSorts = this.activeSorts.filter(s => s.column !== sort.column)
      this.activeSorts.push(sort)
      
      if (this.currentView) {
        this.currentView.config.sorts = [...this.activeSorts]
        await this.saveCurrentDatabase()
      }
      
      await this.processViewData()
    },

    /**
     * Remove sort
     * @param {string} columnId - Column ID to remove sort for
     */
    async removeSort(columnId) {
      this.activeSorts = this.activeSorts.filter(s => s.column !== columnId)
      
      if (this.currentView) {
        this.currentView.config.sorts = [...this.activeSorts]
        await this.saveCurrentDatabase()
      }
      
      await this.processViewData()
    },

    /**
     * Set group by column
     * @param {string} columnId - Column ID to group by
     */
    async setGroupBy(columnId) {
      this.groupBy = columnId
      
      if (this.currentView) {
        this.currentView.config.group_by = columnId
        await this.saveCurrentDatabase()
      }
      
      await this.processViewData()
    },

    /**
     * Create new view
     * @param {Object} viewOptions - View options
     * @returns {Object} Created view
     */
    async createView(viewOptions = {}) {
      if (!this.currentDatabase) return

      const view = createView(viewOptions)
      this.currentDatabase.views.push(view)

      await this.saveCurrentDatabase()

      return view
    },

    /**
     * Update view
     * @param {string} viewId - View ID
     * @param {Object} updates - View updates
     */
    async updateView(viewId, updates) {
      if (!this.currentDatabase) return

      const viewIndex = this.currentDatabase.views.findIndex(v => v.id === viewId)
      if (viewIndex === -1) return

      this.currentDatabase.views[viewIndex] = {
        ...this.currentDatabase.views[viewIndex],
        ...updates
      }

      // Update current view if it's the one being updated
      if (this.currentViewId === viewId) {
        this.currentView = { ...this.currentDatabase.views[viewIndex] }
      }

      await this.saveCurrentDatabase()
    },

    /**
     * Delete view
     * @param {string} viewId - View ID
     */
    async deleteView(viewId) {
      if (!this.currentDatabase) return

      const view = this.currentDatabase.views.find(v => v.id === viewId)
      if (!view || view.is_default) {
        throw new Error('Cannot delete default view')
      }

      this.currentDatabase.views = this.currentDatabase.views.filter(v => v.id !== viewId)

      // Switch to default view if current view was deleted
      if (this.currentViewId === viewId) {
        const defaultView = this.currentDatabase.views.find(v => v.is_default)
        if (defaultView) {
          await this.setCurrentView(defaultView.id)
        }
      }

      await this.saveCurrentDatabase()
    },

    /**
     * Search in database
     * @param {string} query - Search query
     */
    async search(query) {
      this.searchQuery = query
      await this.processViewData()
    },

    /**
     * Save current database
     */
    async saveCurrentDatabase() {
      if (!this.currentDatabase) return

      this.isSaving = true

      try {
        const updatedDatabase = touchDatabase(this.currentDatabase)
        await this.saveDatabase(updatedDatabase)
        
        // Update workspace
        const workspace = useWorkspaceStore()
        if (!workspace.structure.databases) {
          workspace.structure.databases = new Map()
        }
        workspace.structure.databases.set(updatedDatabase.id, updatedDatabase)
        
        this.currentDatabase = updatedDatabase
      } catch (error) {
        console.error('Failed to save database:', error)
        throw error
      } finally {
        this.isSaving = false
      }
    },

    /**
     * Save database to storage
     * @param {Object} database - Database object
     */
    async saveDatabase(database) {
      const workspace = useWorkspaceStore()
      const filePath = `databases/${database.id}.json`
      
      await workspace.saveFile(filePath, database)
    },

    /**
     * Helper: Convert cell value when column type changes
     */
    convertCellValue(value, fromType, toType) {
      if (fromType === toType) return value
      if (value === null || value === undefined) return getColumnDefaultValue({ type: toType })

      try {
        switch (toType) {
          case COLUMN_TYPES.TEXT:
          case COLUMN_TYPES.URL:
          case COLUMN_TYPES.EMAIL:
          case COLUMN_TYPES.PHONE:
            return String(value)
          
          case COLUMN_TYPES.NUMBER:
            return Number(value) || 0
          
          case COLUMN_TYPES.CHECKBOX:
            return Boolean(value)
          
          case COLUMN_TYPES.DATE:
            if (typeof value === 'string' || typeof value === 'number') {
              const date = new Date(value)
              return isNaN(date.getTime()) ? null : date.toISOString()
            }
            return null
          
          case COLUMN_TYPES.SELECT:
            return Array.isArray(value) ? value[0] || null : String(value)
          
          case COLUMN_TYPES.MULTI_SELECT:
            return Array.isArray(value) ? value : [String(value)]
          
          default:
            return getColumnDefaultValue({ type: toType })
        }
      } catch (error) {
        return getColumnDefaultValue({ type: toType })
      }
    },

    /**
     * Helper: Recalculate formulas for a row
     */
    recalculateFormulas(row) {
      if (!this.currentDatabase) return

      this.currentDatabase.columns.forEach(column => {
        if (column.type === COLUMN_TYPES.FORMULA) {
          row.data[column.id] = calculateFormula(
            column.config.formula,
            row.data,
            this.currentDatabase.columns
          )
        }
      })
    },

    /**
     * Start editing a row
     * @param {string} rowId - Row ID
     */
    startEditingRow(rowId) {
      this.editingRow = rowId
    },

    /**
     * Stop editing row
     */
    stopEditingRow() {
      this.editingRow = null
    },

    /**
     * Start editing a cell
     * @param {string} rowId - Row ID
     * @param {string} columnId - Column ID
     */
    startEditingCell(rowId, columnId) {
      this.editingCell = { rowId, columnId }
    },

    /**
     * Stop editing cell
     */
    stopEditingCell() {
      this.editingCell = null
    },

    /**
     * Toggle row selection
     * @param {string} rowId - Row ID
     */
    toggleRowSelection(rowId) {
      if (this.selectedRows.has(rowId)) {
        this.selectedRows.delete(rowId)
      } else {
        this.selectedRows.add(rowId)
      }
    },

    /**
     * Clear row selection
     */
    clearRowSelection() {
      this.selectedRows.clear()
    },

    /**
     * Clear current database and view
     */
    clearCurrent() {
      this.currentDatabase = null
      this.currentDatabaseId = null
      this.currentView = null
      this.currentViewId = null
      this.viewData = {
        rows: [],
        filteredRows: [],
        sortedRows: [],
        groupedRows: new Map(),
        totalCount: 0
      }
      this.editingRow = null
      this.editingCell = null
      this.selectedRows.clear()
      this.activeFilters = []
      this.activeSorts = []
      this.groupBy = null
      this.searchQuery = ''
    }
  }
})