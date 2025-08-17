<template>
  <div class="select-cell-edit w-full">
    <select
      ref="selectRef"
      v-model="localValue"
      class="w-full px-1 py-0.5 text-sm bg-transparent border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      @blur="handleBlur"
      @keydown.enter="handleEnter"
      @keydown.escape="handleEscape"
    >
      <option value="">Select...</option>
      <option v-for="option in options" :key="option" :value="option">
        {{ option }}
      </option>
    </select>
  </div>
</template>

<script>
export default {
  name: 'SelectCellEdit',
  
  props: {
    value: {
      type: [String, Array],
      default: null
    },
    column: {
      type: Object,
      required: true
    }
  },

  emits: ['value-changed', 'edit-end'],

  data() {
    return {
      localValue: this.value || ''
    }
  },

  computed: {
    options() {
      return this.column.config?.options || []
    }
  },

  mounted() {
    this.$refs.selectRef?.focus()
  },

  methods: {
    handleBlur() {
      this.saveValue()
    },

    handleEnter() {
      this.saveValue()
    },

    handleEscape() {
      this.localValue = this.value || ''
      this.$emit('edit-end')
    },

    saveValue() {
      if (this.localValue !== this.value) {
        this.$emit('value-changed', this.localValue)
      }
      this.$emit('edit-end')
    }
  }
}
</script>