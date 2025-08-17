<template>
  <div class="list-view h-full flex flex-col">
    <!-- List Content -->
    <div class="list-content flex-1 overflow-auto p-4">
      <div v-if="rows.length === 0" class="empty-state text-center py-12">
        <Icon name="heroicons:list-bullet" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p class="text-sm font-medium text-gray-900 dark:text-white">No items yet</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Add your first item to get started</p>
        <button @click="$emit('row-added')" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Add item
        </button>
      </div>
      
      <div v-else class="space-y-2">
        <div
          v-for="row in rows"
          :key="row.id"
          :class="[
            'list-item p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-sm transition-all',
            selectedRows.has(row.id) ? 'ring-2 ring-blue-500' : ''
          ]"
          @click="handleItemClick(row)"
        >
          <div class="flex items-center space-x-3">
            <input
              type="checkbox"
              :checked="selectedRows.has(row.id)"
              @change="handleSelectionChange(row.id, $event.target.checked)"
              @click.stop
              class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ getPrimaryValue(row) || 'Untitled' }}
                </h3>
                <div class="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{{ formatDate(row.modified) }}</span>
                </div>
              </div>
              
              <div v-if="visibleColumns.length > 0" class="mt-1 flex flex-wrap gap-2">
                <div
                  v-for="column in visibleColumns.slice(0, 3)"
                  :key="column.id"
                  class="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400"
                >
                  <Icon :name="getColumnIcon(column.type)" class="w-3 h-3" />
                  <span>{{ formatValue(row.data[column.id], column) }}</span>
                </div>
              </div>
            </div>
            
            <button
              @click.stop="handleItemMenu(row)"
              class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Icon name="heroicons:ellipsis-horizontal" class="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- List Footer -->
    <div class="list-footer border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ rows.length }} {{ rows.length === 1 ? 'item' : 'items' }}
        </span>
        <button
          @click="$emit('row-added')"
          class="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Icon name="heroicons:plus" class="w-3 h-3" />
          <span>Add item</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { COLUMN_TYPES, getCellDisplayValue } from '~/utils/database'

export default {
  name: 'ListView',
  
  props: {
    database: Object,
    view: Object,
    columns: Array,
    rows: Array,
    selectedRows: Set
  },

  emits: ['cell-clicked', 'row-selection-changed', 'row-added'],

  computed: {
    primaryColumn() {
      return this.database.columns.find(col => col.primary)
    },
    
    visibleColumns() {
      return this.columns.filter(col => !col.primary)
    }
  },

  methods: {
    getPrimaryValue(row) {
      return this.primaryColumn ? row.data[this.primaryColumn.id] : null
    },
    
    formatValue(value, column) {
      return getCellDisplayValue(value, column) || 'Empty'
    },
    
    formatDate(dateString) {
      return dateString ? new Date(dateString).toLocaleDateString() : ''
    },
    
    getColumnIcon(type) {
      const iconMap = {
        [COLUMN_TYPES.TEXT]: 'heroicons:document-text',
        [COLUMN_TYPES.NUMBER]: 'heroicons:hashtag',
        [COLUMN_TYPES.DATE]: 'heroicons:calendar-days',
        [COLUMN_TYPES.SELECT]: 'heroicons:chevron-down'
      }
      return iconMap[type] || 'heroicons:document-text'
    },
    
    handleItemClick(row) {
      this.$emit('cell-clicked', row.id, this.primaryColumn?.id)
    },
    
    handleSelectionChange(rowId, selected) {
      this.$emit('row-selection-changed', rowId, selected)
    },
    
    handleItemMenu(row) {
      // TODO: Show context menu
    }
  }
}
</script>

<style scoped>
.list-item:hover .group-hover\:opacity-100 {
  opacity: 1;
}
</style>