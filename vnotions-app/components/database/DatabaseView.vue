<template>
  <div class="database-view h-full flex flex-col">
    <!-- Database Header -->
    <div class="database-header border-b border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="text-2xl">{{ database?.icon || '📋' }}</div>
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ database?.title || 'Untitled Database' }}
            </h1>
            <p v-if="database?.description" class="text-sm text-gray-500 dark:text-gray-400">
              {{ database.description }}
            </p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- View count -->
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ viewData.filteredRows.length }} of {{ viewData.totalCount }} rows
          </span>
          
          <!-- Actions -->
          <button
            @click="showPropertiesPanel = !showPropertiesPanel"
            class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Properties"
          >
            <Icon name="heroicons:cog-6-tooth" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Database Toolbar -->
    <DatabaseToolbar
      :database="database"
      :current-view="currentView"
      :views="database?.views || []"
      :filters="activeFilters"
      :sorts="activeSorts"
      :group-by="groupBy"
      :search-query="searchQuery"
      @view-changed="handleViewChange"
      @filter-added="handleFilterAdded"
      @filter-updated="handleFilterUpdated"
      @filter-removed="handleFilterRemoved"
      @sort-added="handleSortAdded"
      @sort-removed="handleSortRemoved"
      @group-by-changed="handleGroupByChanged"
      @search-changed="handleSearchChanged"
      @add-row="handleAddRow"
    />

    <!-- Database Content -->
    <div class="database-content flex-1 flex min-h-0">
      <!-- Main View Area -->
      <div class="view-area flex-1 min-w-0">
        <div v-if="isLoading" class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p class="text-sm text-gray-500">Loading database...</p>
          </div>
        </div>

        <div v-else-if="!database" class="flex items-center justify-center h-64">
          <div class="text-center">
            <Icon name="heroicons:exclamation-triangle" class="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p class="text-sm text-gray-500">Database not found</p>
          </div>
        </div>

        <div v-else-if="!currentView" class="flex items-center justify-center h-64">
          <div class="text-center">
            <Icon name="heroicons:eye-slash" class="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p class="text-sm text-gray-500">No view selected</p>
          </div>
        </div>

        <!-- Dynamic View Component -->
        <component
          v-else
          :is="currentViewComponent"
          :database="database"
          :view="currentView"
          :columns="visibleColumns"
          :rows="processedRows"
          :grouped-rows="groupedData"
          :editing-row="editingRow"
          :editing-cell="editingCell"
          :selected-rows="selectedRows"
          @row-updated="handleRowUpdated"
          @row-deleted="handleRowDeleted"
          @row-duplicated="handleRowDuplicated"
          @cell-clicked="handleCellClicked"
          @row-selection-changed="handleRowSelectionChanged"
          @column-added="handleColumnAdded"
          @column-updated="handleColumnUpdated"
          @column-deleted="handleColumnDeleted"
        />
      </div>

      <!-- Properties Panel -->
      <div
        v-if="showPropertiesPanel"
        class="properties-panel w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4"
      >
        <div class="space-y-4">
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Database Properties
            </h3>
            
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  v-model="databaseTitle"
                  @input="handleDatabaseTitleChange"
                  type="text"
                  class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                />
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  v-model="databaseDescription"
                  @input="handleDatabaseDescriptionChange"
                  rows="2"
                  class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                />
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Icon
                </label>
                <input
                  v-model="databaseIcon"
                  @input="handleDatabaseIconChange"
                  type="text"
                  placeholder="📋"
                  class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          </div>

          <div v-if="currentView">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
              View Properties
            </h3>
            
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  View Name
                </label>
                <input
                  v-model="viewName"
                  @input="handleViewNameChange"
                  type="text"
                  class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Statistics
            </h3>
            
            <div class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div class="flex justify-between">
                <span>Total Rows:</span>
                <span>{{ viewData.totalCount }}</span>
              </div>
              <div class="flex justify-between">
                <span>Filtered Rows:</span>
                <span>{{ viewData.filteredRows.length }}</span>
              </div>
              <div class="flex justify-between">
                <span>Columns:</span>
                <span>{{ database?.columns?.length || 0 }}</span>
              </div>
              <div class="flex justify-between">
                <span>Views:</span>
                <span>{{ database?.views?.length || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <ContextMenu
      v-if="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenu.items"
      @item-clicked="handleContextMenuAction"
      @close="contextMenu.show = false"
    />
  </div>
</template>

<script>
import { useDatabasesStore } from '~/stores/databases'
import { storeToRefs } from 'pinia'
import { VIEW_TYPES } from '~/utils/database'

// Import view components
import TableView from './views/TableView.vue'
import BoardView from './views/BoardView.vue'
import CalendarView from './views/CalendarView.vue'
import ListView from './views/ListView.vue'
import GalleryView from './views/GalleryView.vue'
import TimelineView from './views/TimelineView.vue'

export default {
  name: 'DatabaseView',
  
  components: {
    TableView,
    BoardView,
    CalendarView,
    ListView,
    GalleryView,
    TimelineView,
    DatabaseToolbar: () => import('./DatabaseToolbar.vue')
  },

  props: {
    databaseId: {
      type: String,
      required: true
    }
  },

  setup(props) {
    const databasesStore = useDatabasesStore()
    
    const {
      currentDatabase: database,
      currentView,
      visibleColumns,
      processedRows,
      groupedData,
      viewData,
      isLoading,
      editingRow,
      editingCell,
      selectedRows,
      activeFilters,
      activeSorts,
      groupBy,
      searchQuery
    } = storeToRefs(databasesStore)

    return {
      databasesStore,
      database,
      currentView,
      visibleColumns,
      processedRows,
      groupedData,
      viewData,
      isLoading,
      editingRow,
      editingCell,
      selectedRows,
      activeFilters,
      activeSorts,
      groupBy,
      searchQuery
    }
  },

  data() {
    return {
      showPropertiesPanel: false,
      
      // Editable properties
      databaseTitle: '',
      databaseDescription: '',
      databaseIcon: '',
      viewName: '',
      
      // Context menu
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
        items: []
      },

      // Debounce timers
      titleChangeTimeout: null,
      descriptionChangeTimeout: null
    }
  },

  computed: {
    currentViewComponent() {
      if (!this.currentView) return null
      
      const componentMap = {
        [VIEW_TYPES.TABLE]: 'TableView',
        [VIEW_TYPES.BOARD]: 'BoardView',
        [VIEW_TYPES.CALENDAR]: 'CalendarView',
        [VIEW_TYPES.LIST]: 'ListView',
        [VIEW_TYPES.GALLERY]: 'GalleryView',
        [VIEW_TYPES.TIMELINE]: 'TimelineView'
      }
      
      return componentMap[this.currentView.type] || 'TableView'
    }
  },

  watch: {
    database: {
      handler(newDatabase) {
        if (newDatabase) {
          this.databaseTitle = newDatabase.title
          this.databaseDescription = newDatabase.description
          this.databaseIcon = newDatabase.icon
        }
      },
      immediate: true
    },
    
    currentView: {
      handler(newView) {
        if (newView) {
          this.viewName = newView.name
        }
      },
      immediate: true
    },

    databaseId: {
      handler(newId) {
        if (newId) {
          this.loadDatabase()
        }
      },
      immediate: true
    }
  },

  mounted() {
    this.loadDatabase()
  },

  beforeUnmount() {
    this.databasesStore.clearCurrent()
    
    if (this.titleChangeTimeout) {
      clearTimeout(this.titleChangeTimeout)
    }
    if (this.descriptionChangeTimeout) {
      clearTimeout(this.descriptionChangeTimeout)
    }
  },

  methods: {
    async loadDatabase() {
      if (!this.databaseId) return
      
      try {
        await this.databasesStore.loadDatabase(this.databaseId)
      } catch (error) {
        console.error('Failed to load database:', error)
        // TODO: Show error notification
      }
    },

    // View handlers
    async handleViewChange(viewId) {
      try {
        await this.databasesStore.setCurrentView(viewId)
      } catch (error) {
        console.error('Failed to change view:', error)
      }
    },

    // Filter handlers
    async handleFilterAdded(filter) {
      try {
        await this.databasesStore.addFilter(filter)
      } catch (error) {
        console.error('Failed to add filter:', error)
      }
    },

    async handleFilterUpdated(index, updates) {
      try {
        await this.databasesStore.updateFilter(index, updates)
      } catch (error) {
        console.error('Failed to update filter:', error)
      }
    },

    async handleFilterRemoved(index) {
      try {
        await this.databasesStore.removeFilter(index)
      } catch (error) {
        console.error('Failed to remove filter:', error)
      }
    },

    // Sort handlers
    async handleSortAdded(sort) {
      try {
        await this.databasesStore.addSort(sort)
      } catch (error) {
        console.error('Failed to add sort:', error)
      }
    },

    async handleSortRemoved(columnId) {
      try {
        await this.databasesStore.removeSort(columnId)
      } catch (error) {
        console.error('Failed to remove sort:', error)
      }
    },

    // Group handlers
    async handleGroupByChanged(columnId) {
      try {
        await this.databasesStore.setGroupBy(columnId)
      } catch (error) {
        console.error('Failed to change grouping:', error)
      }
    },

    // Search handlers
    async handleSearchChanged(query) {
      try {
        await this.databasesStore.search(query)
      } catch (error) {
        console.error('Failed to search:', error)
      }
    },

    // Row handlers
    async handleAddRow() {
      try {
        await this.databasesStore.addRow()
      } catch (error) {
        console.error('Failed to add row:', error)
      }
    },

    async handleRowUpdated(rowId, updates) {
      try {
        await this.databasesStore.updateRow(rowId, updates)
      } catch (error) {
        console.error('Failed to update row:', error)
      }
    },

    async handleRowDeleted(rowId) {
      try {
        await this.databasesStore.deleteRow(rowId)
      } catch (error) {
        console.error('Failed to delete row:', error)
      }
    },

    async handleRowDuplicated(rowId) {
      try {
        await this.databasesStore.duplicateRow(rowId)
      } catch (error) {
        console.error('Failed to duplicate row:', error)
      }
    },

    // Cell handlers
    handleCellClicked(rowId, columnId) {
      this.databasesStore.startEditingCell(rowId, columnId)
    },

    // Selection handlers
    handleRowSelectionChanged(rowId) {
      this.databasesStore.toggleRowSelection(rowId)
    },

    // Column handlers
    async handleColumnAdded(columnOptions) {
      try {
        await this.databasesStore.addColumn(columnOptions)
      } catch (error) {
        console.error('Failed to add column:', error)
      }
    },

    async handleColumnUpdated(columnId, updates) {
      try {
        await this.databasesStore.updateColumn(columnId, updates)
      } catch (error) {
        console.error('Failed to update column:', error)
      }
    },

    async handleColumnDeleted(columnId) {
      try {
        await this.databasesStore.deleteColumn(columnId)
      } catch (error) {
        console.error('Failed to delete column:', error)
      }
    },

    // Property change handlers (with debouncing)
    handleDatabaseTitleChange() {
      if (this.titleChangeTimeout) {
        clearTimeout(this.titleChangeTimeout)
      }
      
      this.titleChangeTimeout = setTimeout(async () => {
        if (this.database && this.databaseTitle !== this.database.title) {
          this.database.title = this.databaseTitle
          await this.databasesStore.saveCurrentDatabase()
        }
      }, 500)
    },

    handleDatabaseDescriptionChange() {
      if (this.descriptionChangeTimeout) {
        clearTimeout(this.descriptionChangeTimeout)
      }
      
      this.descriptionChangeTimeout = setTimeout(async () => {
        if (this.database && this.databaseDescription !== this.database.description) {
          this.database.description = this.databaseDescription
          await this.databasesStore.saveCurrentDatabase()
        }
      }, 500)
    },

    async handleDatabaseIconChange() {
      if (this.database && this.databaseIcon !== this.database.icon) {
        this.database.icon = this.databaseIcon
        await this.databasesStore.saveCurrentDatabase()
      }
    },

    async handleViewNameChange() {
      if (this.currentView && this.viewName !== this.currentView.name) {
        await this.databasesStore.updateView(this.currentView.id, {
          name: this.viewName
        })
      }
    },

    // Context menu handlers
    handleContextMenuAction(action) {
      this.contextMenu.show = false
      
      switch (action.id) {
        case 'add-row':
          this.handleAddRow()
          break
        case 'duplicate-selected':
          // Handle duplicate selected rows
          break
        case 'delete-selected':
          // Handle delete selected rows
          break
        default:
          console.log('Unhandled context menu action:', action)
      }
    }
  }
}
</script>

<style scoped>
.database-view {
  /* Custom styles for database view */
}

.database-header {
  min-height: 80px;
}

.view-area {
  overflow: hidden;
}

.properties-panel {
  max-height: 100vh;
  overflow-y: auto;
}
</style>