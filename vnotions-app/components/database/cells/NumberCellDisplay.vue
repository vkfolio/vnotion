<template>
  <div class="number-cell-display w-full">
    <span
      v-if="displayValue !== null"
      :class="[
        'text-sm truncate block text-right',
        isPrimary ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
      ]"
    >
      {{ displayValue }}
    </span>
    <span v-else class="text-sm text-gray-400 dark:text-gray-500 italic">
      Empty
    </span>
  </div>
</template>

<script>
export default {
  name: 'NumberCellDisplay',
  
  props: {
    value: {
      type: [String, Number],
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
    displayValue() {
      if (this.value === null || this.value === undefined || this.value === '') {
        return null
      }

      const numValue = Number(this.value)
      if (isNaN(numValue)) {
        return String(this.value)
      }

      const format = this.column.config?.format || 'number'
      
      switch (format) {
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(numValue)
        
        case 'percent':
          return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(numValue / 100)
        
        default:
          return new Intl.NumberFormat('en-US').format(numValue)
      }
    }
  }
}
</script>