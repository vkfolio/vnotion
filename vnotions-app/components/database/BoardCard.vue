<template>
  <div
    :class="[
      'board-card bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-150',
      {
        'ring-2 ring-blue-500': isSelected,
        'hover:shadow-md': !isSelected,
        'transform scale-105 shadow-lg': isDragging
      },
      cardSizeClasses
    ]"
    draggable="true"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @contextmenu="handleContextMenu"
  >
    <!-- Card Header -->
    <div class="card-header p-3 pb-2">
      <div class="flex items-start justify-between">
        <!-- Primary Content -->
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate">
            {{ primaryValue || 'Untitled' }}
          </h3>
        </div>

        <!-- Selection Checkbox -->
        <div class="flex-shrink-0 ml-2">
          <input
            type="checkbox"
            :checked="isSelected"
            @change="handleSelectionChange"
            @click.stop
            class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Card Content -->
    <div v-if="columns.length > 0" class="card-content px-3 pb-3">
      <div class="space-y-2">
        <div
          v-for="column in columns"
          :key="column.id"
          class="flex items-center space-x-2 text-xs"
        >
          <!-- Column Icon -->
          <Icon :name="getColumnIcon(column.type)" class="w-3 h-3 text-gray-400 flex-shrink-0" />
          
          <!-- Column Value -->
          <div class="flex-1 min-w-0">
            <span class="text-gray-600 dark:text-gray-400 truncate block">
              {{ formatValue(row.data[column.id], column) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Card Footer (if needed) -->
    <div v-if="showFooter" class="card-footer px-3 py-2 border-t border-gray-100 dark:border-gray-700">
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{{ formatDate(row.modified) }}</span>
        
        <!-- Quick Actions -->
        <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            @click.stop="handleEdit"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Edit"
          >
            <Icon name="heroicons:pencil" class="w-3 h-3" />
          </button>
          <button
            @click.stop="handleDuplicate"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Duplicate"
          >
            <Icon name="heroicons:document-duplicate" class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <ContextMenu
      v-if="showContextMenu"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
      @item-clicked="handleContextMenuAction"
      @close="showContextMenu = false"
    />
  </div>
</template>

<script>
import { COLUMN_TYPES, getCellDisplayValue } from '~/utils/database'

export default {
  name: 'BoardCard',

  props: {
    row: {
      type: Object,
      required: true
    },
    columns: {
      type: Array,
      default: () => []
    },
    primaryColumn: {
      type: Object,
      default: null
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    cardSize: {
      type: String,
      default: 'medium' // 'small', 'medium', 'large'
    }
  },

  emits: [
    'card-clicked',
    'card-edited',
    'card-deleted',
    'card-duplicated',
    'selection-changed',
    'drag-start'
  ],

  data() {
    return {
      isDragging: false,
      showContextMenu: false,
      contextMenuX: 0,
      contextMenuY: 0
    }
  },

  computed: {
    primaryValue() {
      if (!this.primaryColumn) return null
      return this.row.data[this.primaryColumn.id]
    },

    cardSizeClasses() {
      const sizeMap = {
        small: 'p-2',
        medium: 'p-0',
        large: 'p-0'
      }
      return sizeMap[this.cardSize] || sizeMap.medium
    },

    showFooter() {
      return this.cardSize === 'large'
    },

    contextMenuItems() {
      return [
        { id: 'edit', label: 'Edit', icon: 'heroicons:pencil' },
        { id: 'duplicate', label: 'Duplicate', icon: 'heroicons:document-duplicate' },
        { id: 'divider', type: 'divider' },
        { id: 'delete', label: 'Delete', icon: 'heroicons:trash', danger: true }
      ]
    }
  },

  methods: {
    getColumnIcon(type) {
      const iconMap = {
        [COLUMN_TYPES.TEXT]: 'heroicons:document-text',
        [COLUMN_TYPES.NUMBER]: 'heroicons:hashtag',
        [COLUMN_TYPES.SELECT]: 'heroicons:chevron-down',
        [COLUMN_TYPES.MULTI_SELECT]: 'heroicons:squares-2x2',
        [COLUMN_TYPES.DATE]: 'heroicons:calendar-days',
        [COLUMN_TYPES.CHECKBOX]: 'heroicons:check-box',
        [COLUMN_TYPES.URL]: 'heroicons:link',
        [COLUMN_TYPES.EMAIL]: 'heroicons:at-symbol',
        [COLUMN_TYPES.PHONE]: 'heroicons:phone'
      }
      return iconMap[type] || 'heroicons:document-text'
    },

    formatValue(value, column) {
      return getCellDisplayValue(value, column) || 'Empty'
    },

    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString()
    },

    // Event handlers
    handleClick() {
      this.$emit('card-clicked', this.row)
    },

    handleSelectionChange(event) {
      this.$emit('selection-changed', this.row.id, event.target.checked)
    },

    handleEdit() {
      this.$emit('card-edited', this.row.id, {})
    },

    handleDuplicate() {
      this.$emit('card-duplicated', this.row.id)
    },

    handleDelete() {
      if (confirm('Are you sure you want to delete this card?')) {
        this.$emit('card-deleted', this.row.id)
      }
    },

    // Drag and drop
    handleDragStart(event) {
      this.isDragging = true
      this.$emit('drag-start', event, this.row)
    },

    handleDragEnd() {
      this.isDragging = false
    },

    // Context menu
    handleContextMenu(event) {
      event.preventDefault()
      this.contextMenuX = event.clientX
      this.contextMenuY = event.clientY
      this.showContextMenu = true
    },

    handleContextMenuAction(action) {
      this.showContextMenu = false
      
      switch (action.id) {
        case 'edit':
          this.handleEdit()
          break
        case 'duplicate':
          this.handleDuplicate()
          break
        case 'delete':
          this.handleDelete()
          break
      }
    }
  }
}
</script>

<style scoped>
.board-card {
  /* Card-specific styles */
}

.board-card.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}
</style>