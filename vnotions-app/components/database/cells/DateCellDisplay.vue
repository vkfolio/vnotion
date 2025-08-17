<template>
  <div class="date-cell-display w-full">
    <span v-if="displayValue" class="text-sm text-gray-700 dark:text-gray-300">
      {{ displayValue }}
    </span>
    <span v-else class="text-sm text-gray-400 dark:text-gray-500 italic">Empty</span>
  </div>
</template>

<script>
export default {
  name: 'DateCellDisplay',
  props: { value: [String, Date], column: Object, isPrimary: Boolean },
  computed: {
    displayValue() {
      if (!this.value) return null
      const date = new Date(this.value)
      return isNaN(date.getTime()) ? null : date.toLocaleDateString()
    }
  }
}
</script>