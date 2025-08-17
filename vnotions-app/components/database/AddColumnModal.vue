<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex min-h-full items-center justify-center p-4">
      <!-- Overlay -->
      <div 
        class="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
        @click="$emit('close')"
      ></div>

      <!-- Modal -->
      <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            Add Property
          </h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4">
          <!-- Property Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Property Name
            </label>
            <input
              ref="nameInput"
              v-model="columnName"
              type="text"
              placeholder="Enter property name"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700"
              @keydown.enter="handleCreate"
            />
          </div>

          <!-- Property Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Property Type
            </label>
            <select
              v-model="columnType"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700"
            >
              <option v-for="type in availableTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <!-- Type-specific Configuration -->
          <div v-if="showTypeConfiguration" class="space-y-3">
            <!-- Select Options -->
            <div v-if="isSelectType">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Options
              </label>
              <div class="space-y-2">
                <div
                  v-for="(option, index) in selectOptions"
                  :key="index"
                  class="flex items-center space-x-2"
                >
                  <input
                    v-model="selectOptions[index]"
                    type="text"
                    placeholder="Option"
                    class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <button
                    @click="removeSelectOption(index)"
                    class="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  >
                    <Icon name="heroicons:x-mark" class="w-4 h-4" />
                  </button>
                </div>
                <button
                  @click="addSelectOption"
                  class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Add option
                </button>
              </div>
            </div>

            <!-- Number Format -->
            <div v-if="columnType === 'number'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Format
              </label>
              <select
                v-model="numberFormat"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="percent">Percent</option>
              </select>
            </div>

            <!-- Date Configuration -->
            <div v-if="columnType === 'date'" class="space-y-2">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Format
                </label>
                <select
                  v-model="dateFormat"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="MMM DD, YYYY">MMM DD, YYYY</option>
                </select>
              </div>
              
              <label class="flex items-center">
                <input
                  v-model="includeTime"
                  type="checkbox"
                  class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Include time</span>
              </label>
            </div>
          </div>

          <!-- Property Options -->
          <div class="space-y-2">
            <label class="flex items-center">
              <input
                v-model="isRequired"
                type="checkbox"
                class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 mr-2"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Required</span>
            </label>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleCreate"
            :disabled="!columnName.trim()"
            class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Property
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { COLUMN_TYPES } from '~/utils/database'

export default {
  name: 'AddColumnModal',

  emits: ['column-added', 'close'],

  data() {
    return {
      columnName: '',
      columnType: COLUMN_TYPES.TEXT,
      isRequired: false,
      
      // Type-specific options
      selectOptions: [''],
      numberFormat: 'number',
      dateFormat: 'MM/DD/YYYY',
      includeTime: false,

      availableTypes: [
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
        { value: COLUMN_TYPES.FORMULA, label: 'Formula' }
      ]
    }
  },

  computed: {
    showTypeConfiguration() {
      return this.isSelectType || 
             this.columnType === COLUMN_TYPES.NUMBER ||
             this.columnType === COLUMN_TYPES.DATE
    },

    isSelectType() {
      return this.columnType === COLUMN_TYPES.SELECT || 
             this.columnType === COLUMN_TYPES.MULTI_SELECT
    }
  },

  mounted() {
    this.$refs.nameInput?.focus()
  },

  methods: {
    addSelectOption() {
      this.selectOptions.push('')
    },

    removeSelectOption(index) {
      this.selectOptions.splice(index, 1)
      if (this.selectOptions.length === 0) {
        this.selectOptions.push('')
      }
    },

    handleCreate() {
      if (!this.columnName.trim()) return

      const columnConfig = {
        name: this.columnName.trim(),
        type: this.columnType,
        required: this.isRequired
      }

      // Add type-specific configuration
      const config = {}

      if (this.isSelectType) {
        config.options = this.selectOptions.filter(option => option.trim())
      }

      if (this.columnType === COLUMN_TYPES.NUMBER) {
        config.format = this.numberFormat
      }

      if (this.columnType === COLUMN_TYPES.DATE) {
        config.format = this.dateFormat
        config.include_time = this.includeTime
      }

      if (Object.keys(config).length > 0) {
        columnConfig.config = config
      }

      this.$emit('column-added', columnConfig)
    }
  }
}
</script>