<template>
  <input
    ref="inputRef"
    v-model="localValue"
    type="text"
    class="w-full px-1 py-0.5 text-sm bg-transparent border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    @blur="handleBlur"
    @keydown.enter="handleEnter"
    @keydown.escape="handleEscape"
  />
</template>

<script>
export default {
  name: 'TextCellEdit',
  
  props: {
    value: {
      type: [String, Number],
      default: ''
    },
    column: {
      type: Object,
      required: true
    }
  },

  emits: ['value-changed', 'edit-end'],

  data() {
    return {
      localValue: String(this.value || '')
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
      this.localValue = String(this.value || '')
      this.$emit('edit-end')
    },

    saveValue() {
      if (this.localValue !== String(this.value || '')) {
        this.$emit('value-changed', this.localValue)
      }
      this.$emit('edit-end')
    }
  }
}
</script>