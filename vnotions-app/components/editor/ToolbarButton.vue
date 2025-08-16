<template>
  <button
    class="toolbar-button"
    :class="{ 
      'is-active': isActive,
      'is-disabled': disabled
    }"
    :disabled="disabled"
    :title="title"
    @click="$emit('click')"
  >
    <i v-if="icon" :class="`pi ${icon}`" />
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
export interface ToolbarButtonProps {
  isActive?: boolean
  disabled?: boolean
  title?: string
  icon?: string
}

defineProps<ToolbarButtonProps>()
defineEmits<{
  click: []
}>()
</script>