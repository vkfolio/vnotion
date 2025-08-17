<template>
  <div class="select-cell-display w-full">
    <div v-if="isMultiSelect && Array.isArray(value) && value.length > 0" class="flex flex-wrap gap-1">
      <span
        v-for="option in value"
        :key="option"
        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      >
        {{ option }}
      </span>
    </div>
    <span
      v-else-if="!isMultiSelect && value"
      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    >
      {{ value }}
    </span>
    <span v-else class="text-sm text-gray-400 dark:text-gray-500 italic">
      Empty
    </span>
  </div>
</template>

<script>
import { COLUMN_TYPES } from '~/utils/database'

export default {
  name: 'SelectCellDisplay',
  
  props: {
    value: {
      type: [String, Array],
      default: null
    },
    column: {
      type: Object,
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    isMultiSelect() {
      return this.column.type === COLUMN_TYPES.MULTI_SELECT
    }
  }
}
</script>