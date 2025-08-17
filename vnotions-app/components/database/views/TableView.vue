<template>
  <div class="table-view h-full flex flex-col">
    <!-- Table Container -->
    <div class="table-container flex-1 overflow-auto">
      <table class="w-full border-collapse bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <thead class="sticky top-0 z-10">
          <tr>
            <!-- Row Selection Header -->
            <th class="w-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-center p-2">
                <input
                  type="checkbox"
                  :checked="allRowsSelected"
                  :indeterminate="someRowsSelected"
                  @change="handleSelectAll"
                  class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </th>

            <!-- Column Headers -->
            <th
              v-for="column in columns"
              :key="column.id"
              class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-0"
            >
              <ColumnHeader
                :column="column"
                :sort-direction="getSortDirection(column.id)"
                :available-databases="availableDatabases"
                @column-updated="handleColumnUpdated"
                @column-deleted="handleColumnDeleted"
                @column-duplicated="handleColumnDuplicated"
                @sort-requested="handleSortRequested"
                @filter-requested="handleFilterRequested"
                @width-changed="handleColumnWidthChanged"
              />
            </th>

            <!-- Add Column Button -->
            <th class="w-12 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-center p-2">
                <button
                  @click="showAddColumnModal = true"
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Add column"
                >
                  <Icon name="heroicons:plus" class="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody>
          <!-- Data Rows -->
          <tr
            v-for="row in rows"
            :key="row.id"
            class="group"
          >
            <DatabaseRow
              :row="row"
              :columns="columns"
              :is-selected="selectedRows.has(row.id)"
              :is-editing="editingRow === row.id"
              :editing-cell="editingCell"
              @row-updated="handleRowUpdated"
              @row-deleted="handleRowDeleted"
              @row-duplicated="handleRowDuplicated"
              @row-inserted="handleRowInserted"
              @selection-changed="handleRowSelectionChanged"
              @cell-clicked="handleCellClicked"
              @edit-start="handleEditStart"
              @edit-end="handleEditEnd"
            />
          </tr>

          <!-- Add Row -->
          <tr v-if="rows.length === 0" class="empty-state">
            <td :colspan="columns.length + 2" class="p-8 text-center">
              <div class="flex flex-col items-center justify-center space-y-3">
                <Icon name="heroicons:table-cells" class="w-12 h-12 text-gray-400" />
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">No rows yet</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Add your first row to get started</p>
                </div>
                <button
                  @click="handleAddRow"
                  class="flex items-center space-x-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Icon name="heroicons:plus" class="w-4 h-4" />
                  <span>Add row</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Table Footer -->
    <div class="table-footer border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800">
      <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div class="flex items-center space-x-4">
          <span>{{ rows.length }} {{ rows.length === 1 ? 'row' : 'rows' }}</span>
          <span v-if="selectedRows.size > 0">
            {{ selectedRows.size }} selected
          </span>
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- Bulk Actions -->
          <div v-if="selectedRows.size > 0" class="flex items-center space-x-2">
            <button
              @click="handleBulkDuplicate"
              class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Duplicate
            </button>
            <button
              @click="handleBulkDelete"
              class="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            >
              Delete
            </button>
          </div>

          <!-- Add Row Button -->
          <button
            @click="handleAddRow"
            class="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Icon name="heroicons:plus" class="w-3 h-3" />
            <span>Add row</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Add Column Modal -->
    <AddColumnModal
      v-if="showAddColumnModal"
      @column-added="handleColumnAdded"
      @close="showAddColumnModal = false"
    />
  </div>
</template>

<script>
import ColumnHeader from '../ColumnHeader.vue'
import DatabaseRow from '../DatabaseRow.vue'
import AddColumnModal from '../AddColumnModal.vue'

export default {
  name: 'TableView',

  components: {
    ColumnHeader,
    DatabaseRow,
    AddColumnModal
  },

  props: {
    database: {
      type: Object,
      required: true
    },
    view: {
      type: Object,
      required: true
    },
    columns: {
      type: Array,
      required: true
    },
    rows: {
      type: Array,
      required: true
    },
    groupedRows: {
      type: Map,
      default: () => new Map()
    },
    editingRow: {
      type: String,
      default: null
    },
    editingCell: {
      type: Object,
      default: null
    },
    selectedRows: {
      type: Set,
      default: () => new Set()
    }
  },

  emits: [
    'row-updated',
    'row-deleted',
    'row-duplicated',
    'cell-clicked',
    'row-selection-changed',
    'column-added',
    'column-updated',
    'column-deleted'
  ],

  data() {
    return {
      showAddColumnModal: false,
      availableDatabases: [] // TODO: Get from store
    }
  },

  computed: {
    allRowsSelected() {
      return this.rows.length > 0 && this.selectedRows.size === this.rows.length
    },

    someRowsSelected() {
      return this.selectedRows.size > 0 && this.selectedRows.size < this.rows.length
    }
  },

  methods: {
    // Row operations
    handleAddRow() {
      this.$emit('row-added')
    },

    handleRowUpdated(rowId, updates) {
      this.$emit('row-updated', rowId, updates)
    },

    handleRowDeleted(rowId) {
      this.$emit('row-deleted', rowId)
    },

    handleRowDuplicated(rowId) {
      this.$emit('row-duplicated', rowId)
    },

    handleRowInserted(position, rowId) {
      // TODO: Implement row insertion at specific position
      this.$emit('row-added')
    },

    handleRowSelectionChanged(rowId, selected) {
      this.$emit('row-selection-changed', rowId, selected)
    },

    handleSelectAll(event) {
      const isChecked = event.target.checked
      this.rows.forEach(row => {
        this.$emit('row-selection-changed', row.id, isChecked)
      })
    },

    // Cell operations
    handleCellClicked(rowId, columnId) {
      this.$emit('cell-clicked', rowId, columnId)
    },

    handleEditStart(rowId, columnId) {
      this.$emit('edit-start', rowId, columnId)
    },

    handleEditEnd() {
      this.$emit('edit-end')
    },

    // Column operations
    handleColumnAdded(columnOptions) {
      this.$emit('column-added', columnOptions)
      this.showAddColumnModal = false
    },

    handleColumnUpdated(columnId, updates) {
      this.$emit('column-updated', columnId, updates)
    },

    handleColumnDeleted(columnId) {
      this.$emit('column-deleted', columnId)
    },

    handleColumnDuplicated(columnId) {
      this.$emit('column-duplicated', columnId)
    },

    handleColumnWidthChanged(columnId, width) {
      this.$emit('column-updated', columnId, { width })
    },

    // Sort and filter operations
    handleSortRequested(sort) {
      this.$emit('sort-requested', sort)
    },

    handleFilterRequested(filter) {
      this.$emit('filter-requested', filter)
    },

    getSortDirection(columnId) {
      // TODO: Get from view configuration
      return null
    },

    // Bulk operations
    handleBulkDuplicate() {
      if (this.selectedRows.size === 0) return
      
      if (confirm(`Duplicate ${this.selectedRows.size} selected rows?`)) {
        Array.from(this.selectedRows).forEach(rowId => {
          this.$emit('row-duplicated', rowId)
        })
      }
    },

    handleBulkDelete() {
      if (this.selectedRows.size === 0) return
      
      if (confirm(`Delete ${this.selectedRows.size} selected rows? This action cannot be undone.`)) {
        Array.from(this.selectedRows).forEach(rowId => {
          this.$emit('row-deleted', rowId)
        })
      }
    }
  }
}
</script>

<style scoped>
.table-view {
  /* Table-specific styles */
}

.table-container {
  /* Ensure table headers stay visible during scroll */
  overflow: auto;
}

.table-container table {
  border-collapse: separate;
  border-spacing: 0;
}

.empty-state td {
  border-bottom: none;
}

/* Custom scrollbar styles */
.table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: theme('colors.gray.100');
}

.dark .table-container::-webkit-scrollbar-track {
  background: theme('colors.gray.800');
}

.table-container::-webkit-scrollbar-thumb {
  background: theme('colors.gray.400');
  border-radius: 4px;
}

.dark .table-container::-webkit-scrollbar-thumb {
  background: theme('colors.gray.600');
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.500');
}

.dark .table-container::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.500');
}
</style>