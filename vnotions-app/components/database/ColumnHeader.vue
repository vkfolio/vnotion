<template>
  <div
    ref="headerRef"
    :class="[
      'column-header relative bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none',
      {
        'cursor-col-resize': isResizing,
        'hover:bg-gray-100 dark:hover:bg-gray-700': !isResizing
      }
    ]"
    :style="{ width: `${column.width || 150}px`, minWidth: '100px' }"
    @click="handleHeaderClick"
    @contextmenu="handleContextMenu"
  >
    <!-- Header Content -->
    <div class="flex items-center px-3 py-2 h-10">
      <!-- Column Type Icon -->
      <div class="flex-shrink-0 mr-2">
        <Icon :name="getColumnTypeIcon(column.type)" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </div>

      <!-- Column Name -->
      <div class="flex-1 min-w-0">
        <div
          v-if="!isEditing"
          class="text-sm font-medium text-gray-900 dark:text-white truncate"
          @dblclick="startEditing"
        >
          {{ column.name }}
          <span v-if="column.required" class="text-red-500 ml-1">*</span>
        </div>
        
        <input
          v-else
          ref="nameInput"
          v-model="editedName"
          @blur="saveEdit"
          @keydown.enter="saveEdit"
          @keydown.escape="cancelEdit"
          class="w-full text-sm font-medium bg-white dark:bg-gray-700 border border-blue-500 rounded px-1 py-0.5 focus:outline-none"
          @click.stop
        />
      </div>

      <!-- Sort Indicator -->
      <div v-if="sortDirection" class="flex-shrink-0 ml-1">
        <Icon
          :name="sortDirection === 'ascending' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
          class="w-3 h-3 text-blue-600 dark:text-blue-400"
        />
      </div>

      <!-- Dropdown Arrow -->
      <div class="flex-shrink-0 ml-1">
        <button
          @click.stop="showDropdown = !showDropdown"
          class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <Icon name="heroicons:chevron-down" class="w-3 h-3 text-gray-400" />
        </button>
      </div>
    </div>

    <!-- Resize Handle -->
    <div
      class="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
      @mousedown="startResize"
    ></div>

    <!-- Column Dropdown Menu -->
    <div
      v-if="showDropdown"
      v-click-outside="() => showDropdown = false"
      class="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20"
    >
      <div class="py-1">
        <!-- Column Type -->
        <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Property Type
          </label>
          <select
            :value="column.type"
            @change="handleTypeChange($event.target.value)"
            class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
          >
            <option v-for="type in availableColumnTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>

        <!-- Column Configuration -->
        <div v-if="hasTypeConfiguration" class="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <!-- Select/Multi-select Options -->
          <div v-if="isSelectType" class="space-y-2">
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Options
            </label>
            <div class="space-y-1">
              <div
                v-for="(option, index) in column.config?.options || []"
                :key="index"
                class="flex items-center space-x-2"
              >
                <input
                  :value="option"
                  @input="updateOption(index, $event.target.value)"
                  type="text"
                  class="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                />
                <button
                  @click="removeOption(index)"
                  class="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                >
                  <Icon name="heroicons:x-mark" class="w-3 h-3" />
                </button>
              </div>
              <button
                @click="addOption"
                class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add option
              </button>
            </div>
          </div>

          <!-- Number Format -->
          <div v-if="column.type === 'number'" class="space-y-2">
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Format
            </label>
            <select
              :value="column.config?.format || 'number'"
              @change="updateConfig({ format: $event.target.value })"
              class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="percent">Percent</option>
            </select>
          </div>

          <!-- Date Format -->
          <div v-if="column.type === 'date'" class="space-y-2">
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Format
            </label>
            <select
              :value="column.config?.format || 'MM/DD/YYYY'"
              @change="updateConfig({ format: $event.target.value })"
              class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MMM DD, YYYY">MMM DD, YYYY</option>
            </select>
            
            <label class="flex items-center text-sm">
              <input
                type="checkbox"
                :checked="column.config?.include_time || false"
                @change="updateConfig({ include_time: $event.target.checked })"
                class="mr-2"
              />
              Include time
            </label>
          </div>

          <!-- Formula -->
          <div v-if="column.type === 'formula'" class="space-y-2">
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Formula
            </label>
            <textarea
              :value="column.config?.formula || ''"
              @input="updateConfig({ formula: $event.target.value })"
              rows="3"
              placeholder="Enter formula..."
              class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            />
          </div>

          <!-- Relation Configuration -->
          <div v-if="column.type === 'relation'" class="space-y-2">
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Related Database
            </label>
            <select
              :value="column.config?.database_id || ''"
              @change="updateConfig({ database_id: $event.target.value })"
              class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option value="">Select database...</option>
              <option v-for="db in availableDatabases" :key="db.id" :value="db.id">
                {{ db.title }}
              </option>
            </select>
            
            <label class="flex items-center text-sm">
              <input
                type="checkbox"
                :checked="column.config?.multiple || false"
                @change="updateConfig({ multiple: $event.target.checked })"
                class="mr-2"
              />
              Allow multiple relations
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="py-1">
          <button
            @click="handleSort('ascending')"
            class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Icon name="heroicons:chevron-up" class="w-4 h-4" />
            <span>Sort Ascending</span>
          </button>
          
          <button
            @click="handleSort('descending')"
            class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Icon name="heroicons:chevron-down" class="w-4 h-4" />
            <span>Sort Descending</span>
          </button>
          
          <button
            @click="handleFilter"
            class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Icon name="heroicons:funnel" class="w-4 h-4" />
            <span>Filter</span>
          </button>
          
          <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          
          <button
            @click="handleDuplicate"
            class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Icon name="heroicons:document-duplicate" class="w-4 h-4" />
            <span>Duplicate Property</span>
          </button>
          
          <button
            v-if="!column.primary"
            @click="handleDelete"
            class="flex items-center space-x-2 w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Icon name="heroicons:trash" class="w-4 h-4" />
            <span>Delete Property</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { COLUMN_TYPES } from '~/utils/database'

export default {
  name: 'ColumnHeader',

  props: {
    column: {
      type: Object,
      required: true
    },
    sortDirection: {
      type: String,
      default: null // 'ascending', 'descending', or null
    },
    availableDatabases: {
      type: Array,
      default: () => []
    }
  },

  emits: [
    'column-updated',
    'column-deleted',
    'column-duplicated',
    'sort-requested',
    'filter-requested',
    'width-changed'
  ],

  data() {
    return {
      showDropdown: false,
      isEditing: false,
      editedName: '',
      isResizing: false,
      startX: 0,
      startWidth: 0,

      availableColumnTypes: [
        { value: COLUMN_TYPES.TEXT, label: 'Text' },
        { value: COLUMN_TYPES.NUMBER, label: 'Number' },
        { value: COLUMN_TYPES.SELECT, label: 'Select' },
        { value: COLUMN_TYPES.MULTI_SELECT, label: 'Multi-select' },
        { value: COLUMN_TYPES.DATE, label: 'Date' },
        { value: COLUMN_TYPES.CHECKBOX, label: 'Checkbox' },
        { value: COLUMN_TYPES.URL, label: 'URL' },
        { value: COLUMN_TYPES.EMAIL, label: 'Email' },
        { value: COLUMN_TYPES.PHONE, label: 'Phone' },
        { value: COLUMN_TYPES.FILE, label: 'File' },
        { value: COLUMN_TYPES.RELATION, label: 'Relation' },
        { value: COLUMN_TYPES.FORMULA, label: 'Formula' },
        { value: COLUMN_TYPES.CREATED_TIME, label: 'Created time' },
        { value: COLUMN_TYPES.LAST_EDITED_TIME, label: 'Last edited time' },
        { value: COLUMN_TYPES.CREATED_BY, label: 'Created by' },
        { value: COLUMN_TYPES.LAST_EDITED_BY, label: 'Last edited by' }
      ]
    }
  },

  computed: {
    hasTypeConfiguration() {
      return this.isSelectType || 
             this.column.type === 'number' || 
             this.column.type === 'date' || 
             this.column.type === 'formula' || 
             this.column.type === 'relation'
    },

    isSelectType() {
      return this.column.type === COLUMN_TYPES.SELECT || this.column.type === COLUMN_TYPES.MULTI_SELECT
    }
  },

  mounted() {
    // Add global resize event listeners
    document.addEventListener('mousemove', this.handleResize)
    document.addEventListener('mouseup', this.stopResize)
  },

  beforeUnmount() {
    // Remove global event listeners
    document.removeEventListener('mousemove', this.handleResize)
    document.removeEventListener('mouseup', this.stopResize)
  },

  methods: {
    getColumnTypeIcon(type) {
      const iconMap = {
        [COLUMN_TYPES.TEXT]: 'heroicons:document-text',
        [COLUMN_TYPES.NUMBER]: 'heroicons:hashtag',
        [COLUMN_TYPES.SELECT]: 'heroicons:chevron-down',
        [COLUMN_TYPES.MULTI_SELECT]: 'heroicons:squares-2x2',
        [COLUMN_TYPES.DATE]: 'heroicons:calendar-days',
        [COLUMN_TYPES.CHECKBOX]: 'heroicons:check-box',
        [COLUMN_TYPES.URL]: 'heroicons:link',
        [COLUMN_TYPES.EMAIL]: 'heroicons:at-symbol',
        [COLUMN_TYPES.PHONE]: 'heroicons:phone',
        [COLUMN_TYPES.FILE]: 'heroicons:paper-clip',
        [COLUMN_TYPES.RELATION]: 'heroicons:arrow-top-right-on-square',
        [COLUMN_TYPES.FORMULA]: 'heroicons:variable',
        [COLUMN_TYPES.CREATED_TIME]: 'heroicons:clock',
        [COLUMN_TYPES.LAST_EDITED_TIME]: 'heroicons:pencil-square',
        [COLUMN_TYPES.CREATED_BY]: 'heroicons:user-plus',
        [COLUMN_TYPES.LAST_EDITED_BY]: 'heroicons:user'
      }

      return iconMap[type] || 'heroicons:document-text'
    },

    handleHeaderClick() {
      if (!this.isResizing) {
        // Maybe handle column selection in the future
      }
    },

    handleContextMenu(event) {
      event.preventDefault()
      this.showDropdown = true
    },

    // Editing methods
    startEditing() {
      this.isEditing = true
      this.editedName = this.column.name
      this.$nextTick(() => {
        this.$refs.nameInput?.focus()
        this.$refs.nameInput?.select()
      })
    },

    saveEdit() {
      if (this.editedName.trim() && this.editedName !== this.column.name) {
        this.$emit('column-updated', this.column.id, { name: this.editedName.trim() })
      }
      this.cancelEdit()
    },

    cancelEdit() {
      this.isEditing = false
      this.editedName = ''
    },

    // Type and configuration methods
    handleTypeChange(newType) {
      this.$emit('column-updated', this.column.id, { type: newType })
    },

    updateConfig(configUpdates) {
      const newConfig = { ...this.column.config, ...configUpdates }
      this.$emit('column-updated', this.column.id, { config: newConfig })
    },

    // Select options methods
    addOption() {
      const options = [...(this.column.config?.options || []), '']
      this.updateConfig({ options })
    },

    updateOption(index, value) {
      const options = [...(this.column.config?.options || [])]
      options[index] = value
      this.updateConfig({ options })
    },

    removeOption(index) {
      const options = [...(this.column.config?.options || [])]
      options.splice(index, 1)
      this.updateConfig({ options })
    },

    // Action methods
    handleSort(direction) {
      this.showDropdown = false
      this.$emit('sort-requested', {
        column: this.column.id,
        direction
      })
    },

    handleFilter() {
      this.showDropdown = false
      this.$emit('filter-requested', {
        column: this.column.id,
        operator: 'equals',
        condition: ''
      })
    },

    handleDuplicate() {
      this.showDropdown = false
      this.$emit('column-duplicated', this.column.id)
    },

    handleDelete() {
      this.showDropdown = false
      if (confirm(`Are you sure you want to delete the "${this.column.name}" property?`)) {
        this.$emit('column-deleted', this.column.id)
      }
    },

    // Resize methods
    startResize(event) {
      this.isResizing = true
      this.startX = event.clientX
      this.startWidth = this.column.width || 150
      
      event.preventDefault()
      document.body.style.cursor = 'col-resize'
    },

    handleResize(event) {
      if (!this.isResizing) return

      const diff = event.clientX - this.startX
      const newWidth = Math.max(100, this.startWidth + diff)
      
      this.$emit('width-changed', this.column.id, newWidth)
    },

    stopResize() {
      if (this.isResizing) {
        this.isResizing = false
        document.body.style.cursor = ''
      }
    }
  }
}
</script>

<style scoped>
.column-header {
  /* Header-specific styles */
}

/* Focus styles for accessibility */
.column-header:focus-within {
  @apply ring-2 ring-blue-500 ring-inset;
}
</style>