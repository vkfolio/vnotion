<template>
  <input
    ref="inputRef"
    v-model="localValue"
    type="number"
    class="w-full px-1 py-0.5 text-sm bg-transparent border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
    @blur="handleBlur"
    @keydown.enter="handleEnter"
    @keydown.escape="handleEscape"
  />
</template>

<script>
export default {
  name: 'NumberCellEdit',
  
  props: {
    value: {
      type: [String, Number],
      default: 0
    },
    column: {
      type: Object,
      required: true
    }
  },

  emits: ['value-changed', 'edit-end'],

  data() {
    return {
      localValue: this.value || 0
    }
  },

  mounted() {
    this.$refs.inputRef?.focus()
    this.$refs.inputRef?.select()
  },

  methods: {
    handleBlur() {
      this.saveValue()
    },

    handleEnter() {
      this.saveValue()
    },

    handleEscape() {
      this.localValue = this.value || 0
      this.$emit('edit-end')
    },

    saveValue() {
      const numValue = Number(this.localValue)
      if (!isNaN(numValue) && numValue !== Number(this.value || 0)) {
        this.$emit('value-changed', numValue)
      }
      this.$emit('edit-end')
    }
  }
}
</script>