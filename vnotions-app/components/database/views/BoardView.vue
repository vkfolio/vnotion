<template>
  <div class="board-view h-full flex flex-col">
    <!-- Board Header -->
    <div v-if="!groupByColumn" class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-center">
        <div class="text-center">
          <Icon name="heroicons:view-columns" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p class="text-sm font-medium text-gray-900 dark:text-white">Configure Board View</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Select a property to group by to display as board columns
          </p>
          <select
            :value="view.config?.group_by_column || ''"
            @change="handleGroupByChange($event.target.value)"
            class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
          >
            <option value="">Select property...</option>
            <option
              v-for="column in selectableColumns"
              :key="column.id"
              :value="column.id"
            >
              {{ column.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Board Content -->
    <div v-else class="board-content flex-1 overflow-hidden">
      <div class="h-full overflow-x-auto">
        <div class="flex h-full space-x-4 p-4 min-w-max">
          <!-- Board Columns -->
          <div
            v-for="[groupValue, groupRows] in groupedRows"
            :key="groupValue"
            class="board-column flex-shrink-0 w-80"
          >
            <!-- Column Header -->
            <div class="column-header mb-4">
              <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ formatGroupValue(groupValue) }}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {{ groupRows.length }}
                  </span>
                </div>
                <button
                  @click="handleAddRowToGroup(groupValue)"
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Add card"
                >
                  <Icon name="heroicons:plus" class="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <!-- Column Cards -->
            <div 
              class="column-cards space-y-3 max-h-full overflow-y-auto pb-4"
              @drop="handleDrop($event, groupValue)"
              @dragover="handleDragOver"
              @dragenter="handleDragEnter"
            >
              <BoardCard
                v-for="row in groupRows"
                :key="row.id"
                :row="row"
                :columns="visibleCardColumns"
                :primary-column="primaryColumn"
                :is-selected="selectedRows.has(row.id)"
                :card-size="view.config?.card_size || 'medium'"
                @card-clicked="handleCardClicked"
                @card-edited="handleCardEdited"
                @card-deleted="handleCardDeleted"
                @card-duplicated="handleCardDuplicated"
                @selection-changed="handleCardSelectionChanged"
                @drag-start="handleDragStart($event, row)"
              />

              <!-- Empty State -->
              <div
                v-if="groupRows.length === 0"
                class="empty-column-state p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Icon name="heroicons:document-plus" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p class="text-sm text-gray-500 dark:text-gray-400">No cards in this column</p>
                <button
                  @click="handleAddRowToGroup(groupValue)"
                  class="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Add a card
                </button>
              </div>
            </div>
          </div>

          <!-- Add Group Column (for select types) -->
          <div
            v-if="canAddGroups"
            class="add-group-column flex-shrink-0 w-80"
          >
            <div class="h-32 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <button
                @click="showAddGroupModal = true"
                class="flex flex-col items-center space-y-2 p-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <Icon name="heroicons:plus" class="w-6 h-6" />
                <span class="text-sm">Add group</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Group Modal -->
    <AddGroupModal
      v-if="showAddGroupModal"
      :column="groupByColumn"
      @group-added="handleGroupAdded"
      @close="showAddGroupModal = false"
    />
  </div>
</template>

<script>
import { COLUMN_TYPES } from '~/utils/database'
import BoardCard from '../BoardCard.vue'
import AddGroupModal from '../AddGroupModal.vue'

export default {
  name: 'BoardView',

  components: {
    BoardCard,
    AddGroupModal
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
      required: true
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
    'row-added',
    'cell-clicked',
    'row-selection-changed',
    'column-added',
    'column-updated',
    'column-deleted',
    'group-by-changed'
  ],

  data() {
    return {
      showAddGroupModal: false,
      draggedRow: null
    }
  },

  computed: {
    groupByColumn() {
      const groupByColumnId = this.view.config?.group_by_column
      return this.database.columns.find(col => col.id === groupByColumnId)
    },

    selectableColumns() {
      return this.database.columns.filter(col => 
        col.type === COLUMN_TYPES.SELECT || 
        col.type === COLUMN_TYPES.MULTI_SELECT ||
        col.type === COLUMN_TYPES.CHECKBOX
      )
    },

    primaryColumn() {
      return this.database.columns.find(col => col.primary)
    },

    visibleCardColumns() {
      // Show a subset of columns on cards to avoid clutter
      return this.columns.filter(col => 
        col.id !== this.groupByColumn?.id && 
        !col.primary
      ).slice(0, 3)
    },

    canAddGroups() {
      return this.groupByColumn && 
             (this.groupByColumn.type === COLUMN_TYPES.SELECT || 
              this.groupByColumn.type === COLUMN_TYPES.MULTI_SELECT)
    }
  },

  methods: {
    handleGroupByChange(columnId) {
      this.$emit('group-by-changed', columnId)
    },

    formatGroupValue(value) {
      if (value === 'No selection' || value === 'Empty') {
        return 'No Status'
      }
      return value
    },

    // Card operations
    handleCardClicked(row) {
      this.$emit('cell-clicked', row.id, this.primaryColumn?.id)
    },

    handleCardEdited(rowId, updates) {
      this.$emit('row-updated', rowId, updates)
    },

    handleCardDeleted(rowId) {
      this.$emit('row-deleted', rowId)
    },

    handleCardDuplicated(rowId) {
      this.$emit('row-duplicated', rowId)
    },

    handleCardSelectionChanged(rowId, selected) {
      this.$emit('row-selection-changed', rowId, selected)
    },

    // Row operations
    handleAddRowToGroup(groupValue) {
      const initialData = {}
      
      if (this.groupByColumn) {
        if (groupValue !== 'No selection' && groupValue !== 'Empty') {
          if (this.groupByColumn.type === COLUMN_TYPES.MULTI_SELECT) {
            initialData[this.groupByColumn.id] = [groupValue]
          } else {
            initialData[this.groupByColumn.id] = groupValue
          }
        }
      }

      this.$emit('row-added', initialData)
    },

    // Drag and drop
    handleDragStart(event, row) {
      this.draggedRow = row
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', row.id)
    },

    handleDragOver(event) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    },

    handleDragEnter(event) {
      event.preventDefault()
    },

    handleDrop(event, groupValue) {
      event.preventDefault()
      
      if (!this.draggedRow || !this.groupByColumn) return

      const updates = {}
      
      if (groupValue !== 'No selection' && groupValue !== 'Empty') {
        if (this.groupByColumn.type === COLUMN_TYPES.MULTI_SELECT) {
          // For multi-select, replace the array with the new group
          updates[this.groupByColumn.id] = [groupValue]
        } else {
          updates[this.groupByColumn.id] = groupValue
        }
      } else {
        // Clear the value
        updates[this.groupByColumn.id] = this.groupByColumn.type === COLUMN_TYPES.MULTI_SELECT ? [] : null
      }

      this.$emit('row-updated', this.draggedRow.id, updates)
      this.draggedRow = null
    },

    // Group management
    handleGroupAdded(groupValue) {
      if (this.groupByColumn) {
        // Add the new option to the column configuration
        const currentOptions = this.groupByColumn.config?.options || []
        if (!currentOptions.includes(groupValue)) {
          const updatedOptions = [...currentOptions, groupValue]
          this.$emit('column-updated', this.groupByColumn.id, {
            config: {
              ...this.groupByColumn.config,
              options: updatedOptions
            }
          })
        }
      }
      this.showAddGroupModal = false
    }
  }
}
</script>

<style scoped>
.board-view {
  /* Board-specific styles */
}

.board-content {
  /* Ensure proper scrolling for board */
}

.board-column {
  /* Column styles */
}

.column-cards {
  min-height: 200px;
}

.empty-column-state {
  transition: all 0.2s ease;
}

.empty-column-state:hover {
  border-color: theme('colors.blue.400');
  background-color: theme('colors.blue.50');
}

.dark .empty-column-state:hover {
  border-color: theme('colors.blue.500');
  background-color: rgba(59, 130, 246, 0.1);
}

/* Custom scrollbar for columns */
.column-cards::-webkit-scrollbar {
  width: 6px;
}

.column-cards::-webkit-scrollbar-track {
  background: transparent;
}

.column-cards::-webkit-scrollbar-thumb {
  background: theme('colors.gray.300');
  border-radius: 3px;
}

.dark .column-cards::-webkit-scrollbar-thumb {
  background: theme('colors.gray.600');
}

.column-cards::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.400');
}

.dark .column-cards::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.500');
}
</style>