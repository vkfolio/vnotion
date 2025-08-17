<template>
  <div class="text-cell-display w-full">
    <span
      v-if="displayValue"
      :class="[
        'text-sm truncate block',
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
  name: 'TextCellDisplay',
  
  props: {
    value: {
      type: [String, Number],
      default: ''
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
      return this.value ? String(this.value).trim() : ''
    }
  }
}
</script>