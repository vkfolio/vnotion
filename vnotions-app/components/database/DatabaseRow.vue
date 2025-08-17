<template>
  <div
    :class="[
      'database-row border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
      {
        'bg-blue-50 dark:bg-blue-900/20': isSelected,
        'bg-yellow-50 dark:bg-yellow-900/20': isEditing
      }
    ]"
    @click="handleRowClick"
    @contextmenu="handleContextMenu"
  >
    <div class="flex items-center min-h-[40px]">
      <!-- Row Selection Checkbox -->
      <div class="flex-shrink-0 w-10 flex items-center justify-center">
        <input
          type="checkbox"
          :checked="isSelected"
          @change="handleSelectionChange"
          @click.stop
          class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
        />
      </div>

      <!-- Row Cells -->
      <div class="flex-1 flex">
        <div
          v-for="column in columns"
          :key="column.id"
          :style="{ width: `${column.width || 150}px`, minWidth: '100px' }"
          class="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
        >
          <DatabaseCell
            :column="column"
            :value="row.data[column.id]"
            :is-editing="isEditingCell(column.id)"
            :is-primary="column.primary"
            @value-changed="handleCellValueChange(column.id, $event)"
            @edit-start="handleCellEditStart(column.id)"
            @edit-end="handleCellEditEnd"
            @click="handleCellClick(column.id)"
          />
        </div>
      </div>

      <!-- Row Actions -->
      <div class="flex-shrink-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          @click.stop="showRowMenu = !showRowMenu"
          class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Icon name="heroicons:ellipsis-horizontal" class="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>

    <!-- Row Menu -->
    <div
      v-if="showRowMenu"
      v-click-outside="() => showRowMenu = false"
      class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10"
    >
      <div class="py-1">
        <button
          @click="handleDuplicateRow"
          class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Icon name="heroicons:document-duplicate" class="w-4 h-4" />
          <span>Duplicate</span>
        </button>
        
        <button
          @click="handleInsertAbove"
          class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Icon name="heroicons:plus" class="w-4 h-4" />
          <span>Insert above</span>
        </button>
        
        <button
          @click="handleInsertBelow"
          class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Icon name="heroicons:plus" class="w-4 h-4" />
          <span>Insert below</span>
        </button>
        
        <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
        
        <button
          @click="handleDeleteRow"
          class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Icon name="heroicons:trash" class="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import DatabaseCell from './DatabaseCell.vue'

export default {
  name: 'DatabaseRow',

  components: {
    DatabaseCell
  },

  props: {
    row: {
      type: Object,
      required: true
    },
    columns: {
      type: Array,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    isEditing: {
      type: Boolean,
      default: false
    },
    editingCell: {
      type: Object,
      default: null // { rowId, columnId }
    }
  },

  emits: [
    'row-updated',
    'row-deleted',
    'row-duplicated',
    'row-inserted',
    'selection-changed',
    'cell-clicked',
    'edit-start',
    'edit-end'
  ],

  data() {
    return {
      showRowMenu: false,
      pendingChanges: {}
    }
  },

  methods: {
    isEditingCell(columnId) {
      return this.editingCell?.rowId === this.row.id && this.editingCell?.columnId === columnId
    },

    handleRowClick() {
      // Emit row click event for potential row selection
      this.$emit('row-clicked', this.row.id)
    },

    handleContextMenu(event) {
      event.preventDefault()
      this.showRowMenu = true
    },

    handleSelectionChange(event) {
      this.$emit('selection-changed', this.row.id, event.target.checked)
    },

    handleCellClick(columnId) {
      this.$emit('cell-clicked', this.row.id, columnId)
    },

    handleCellEditStart(columnId) {
      this.$emit('edit-start', this.row.id, columnId)
    },

    handleCellEditEnd() {
      this.$emit('edit-end')
      
      // Apply any pending changes
      if (Object.keys(this.pendingChanges).length > 0) {
        this.$emit('row-updated', this.row.id, { ...this.pendingChanges })
        this.pendingChanges = {}
      }
    },

    handleCellValueChange(columnId, newValue) {
      // Store the change to be applied when editing ends
      this.pendingChanges[columnId] = newValue
    },

    // Row actions
    handleDuplicateRow() {
      this.showRowMenu = false
      this.$emit('row-duplicated', this.row.id)
    },

    handleInsertAbove() {
      this.showRowMenu = false
      this.$emit('row-inserted', 'above', this.row.id)
    },

    handleInsertBelow() {
      this.showRowMenu = false
      this.$emit('row-inserted', 'below', this.row.id)
    },

    handleDeleteRow() {
      this.showRowMenu = false
      if (confirm('Are you sure you want to delete this row?')) {
        this.$emit('row-deleted', this.row.id)
      }
    }
  }
}
</script>

<style scoped>
.database-row {
  position: relative;
}

.database-row:hover .group-hover\:opacity-100 {
  opacity: 1;
}
</style>