<template>
  <div class="gallery-view h-full flex flex-col">
    <!-- Gallery Controls -->
    <div class="gallery-controls border-b border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Card size:</span>
          <select
            :value="view.config?.card_size || 'medium'"
            @change="handleCardSizeChange($event.target.value)"
            class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ rows.length }} {{ rows.length === 1 ? 'card' : 'cards' }}
        </span>
      </div>
    </div>

    <!-- Gallery Grid -->
    <div class="gallery-grid flex-1 overflow-auto p-4">
      <div v-if="rows.length === 0" class="empty-state text-center py-12">
        <Icon name="heroicons:photo" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p class="text-sm font-medium text-gray-900 dark:text-white">No cards yet</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Add your first card to get started</p>
        <button @click="$emit('row-added')" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Add card
        </button>
      </div>
      
      <div v-else :class="gridClasses">
        <div
          v-for="row in rows"
          :key="row.id"
          :class="[
            'gallery-card bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all',
            selectedRows.has(row.id) ? 'ring-2 ring-blue-500' : '',
            cardSizeClasses
          ]"
          @click="handleCardClick(row)"
        >
          <!-- Card Image/Preview -->
          <div :class="['card-preview bg-gray-100 dark:bg-gray-700 flex items-center justify-center', previewHeightClasses]">
            <div v-if="getImageValue(row)" class="w-full h-full">
              <img
                :src="getImageValue(row)"
                :alt="getPrimaryValue(row)"
                class="w-full h-full object-cover"
              />
            </div>
            <div v-else class="text-center">
              <Icon name="heroicons:photo" class="w-8 h-8 text-gray-400 mx-auto mb-1" />
              <span class="text-xs text-gray-500 dark:text-gray-400">No image</span>
            </div>
          </div>
          
          <!-- Card Content -->
          <div class="card-content p-3">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                {{ getPrimaryValue(row) || 'Untitled' }}
              </h3>
              <input
                type="checkbox"
                :checked="selectedRows.has(row.id)"
                @change="handleSelectionChange(row.id, $event.target.checked)"
                @click.stop
                class="ml-2 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            <div v-if="visibleColumns.length > 0" class="space-y-1">
              <div
                v-for="column in visibleColumns.slice(0, cardSize === 'large' ? 4 : 2)"
                :key="column.id"
                class="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400"
              >
                <Icon :name="getColumnIcon(column.type)" class="w-3 h-3 flex-shrink-0" />
                <span class="truncate">{{ formatValue(row.data[column.id], column) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { COLUMN_TYPES, getCellDisplayValue } from '~/utils/database'

export default {
  name: 'GalleryView',
  
  props: {
    database: Object,
    view: Object,
    columns: Array,
    rows: Array,
    selectedRows: Set
  },

  emits: ['cell-clicked', 'row-selection-changed', 'row-added', 'card-size-changed'],

  computed: {
    cardSize() {
      return this.view.config?.card_size || 'medium'
    },
    
    gridClasses() {
      const sizeMap = {
        small: 'grid grid-cols-6 gap-4',
        medium: 'grid grid-cols-4 gap-4',
        large: 'grid grid-cols-3 gap-6'
      }
      return sizeMap[this.cardSize] || sizeMap.medium
    },
    
    cardSizeClasses() {
      const sizeMap = {
        small: 'h-48',
        medium: 'h-64',
        large: 'h-80'
      }
      return sizeMap[this.cardSize] || sizeMap.medium
    },
    
    previewHeightClasses() {
      const sizeMap = {
        small: 'h-24',
        medium: 'h-32',
        large: 'h-40'
      }
      return sizeMap[this.cardSize] || sizeMap.medium
    },
    
    primaryColumn() {
      return this.database.columns.find(col => col.primary)
    },
    
    visibleColumns() {
      return this.columns.filter(col => !col.primary && col.type !== COLUMN_TYPES.FILE)
    },
    
    fileColumn() {
      return this.database.columns.find(col => col.type === COLUMN_TYPES.FILE)
    }
  },

  methods: {
    getPrimaryValue(row) {
      return this.primaryColumn ? row.data[this.primaryColumn.id] : null
    },
    
    getImageValue(row) {
      if (!this.fileColumn) return null
      const files = row.data[this.fileColumn.id]
      if (Array.isArray(files) && files.length > 0) {
        return files[0].url || files[0].path
      }
      return null
    },
    
    formatValue(value, column) {
      return getCellDisplayValue(value, column) || 'Empty'
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
    
    handleCardClick(row) {
      this.$emit('cell-clicked', row.id, this.primaryColumn?.id)
    },
    
    handleSelectionChange(rowId, selected) {
      this.$emit('row-selection-changed', rowId, selected)
    },
    
    handleCardSizeChange(size) {
      this.$emit('card-size-changed', size)
    }
  }
}
</script>