<template>
  <div class="toolbar-color-picker" ref="colorPickerRef">
    <div 
      class="color-trigger"
      :title="title"
      @click="toggleColorMenu"
    >
      <div 
        class="color-preview"
        :style="{ backgroundColor: currentColor }"
      />
    </div>
    
    <div 
      v-if="isOpen"
      class="color-menu"
    >
      <div
        v-for="color in colorOptions"
        :key="color.value"
        class="color-option"
        :class="{ 'is-selected': color.value === currentColor }"
        :style="{ backgroundColor: color.value }"
        :title="color.label"
        @click="selectColor(color.value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface ToolbarColorPickerProps {
  currentColor?: string
  title?: string
}

const props = withDefaults(defineProps<ToolbarColorPickerProps>(), {
  currentColor: '#ffffff',
  title: 'Text Color'
})

const emit = defineEmits<{
  select: [color: string]
}>()

const isOpen = ref(false)
const colorPickerRef = ref<HTMLElement>()

// Color palette options
const colorOptions = [
  { label: 'Default', value: '#ffffff' },
  { label: 'Gray', value: '#9b9a97' },
  { label: 'Brown', value: '#64473a' },
  { label: 'Orange', value: '#d9730d' },
  { label: 'Yellow', value: '#dfab01' },
  { label: 'Green', value: '#0f7b6c' },
  { label: 'Blue', value: '#0b6794' },
  { label: 'Purple', value: '#6940a5' },
  { label: 'Pink', value: '#ad1a72' },
  { label: 'Red', value: '#e03e3e' },
  { label: 'Light Gray', value: '#787774' },
  { label: 'Light Brown', value: '#9a6759' },
  { label: 'Light Orange', value: '#d9730d' },
  { label: 'Light Yellow', value: '#dfab01' },
  { label: 'Light Green', value: '#4d6461' },
  { label: 'Light Blue', value: '#336ea6' },
  { label: 'Light Purple', value: '#9065b0' },
  { label: 'Light Pink', value: '#c14f8a' },
  { label: 'Light Red', value: '#e03e3e' },
]

const toggleColorMenu = () => {
  isOpen.value = !isOpen.value
}

const selectColor = (color: string) => {
  emit('select', color)
  isOpen.value = false
}

// Close color menu when clicking outside
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (colorPickerRef.value && !colorPickerRef.value.contains(event.target as Node)) {
      isOpen.value = false
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>