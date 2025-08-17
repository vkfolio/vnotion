<template>
  <div class="toolbar-dropdown" ref="dropdownRef">
    <div 
      class="dropdown-trigger"
      :class="{ 'is-open': isOpen }"
      @click="toggleDropdown"
    >
      <span class="dropdown-text">{{ currentLabel }}</span>
      <i class="pi pi-chevron-down dropdown-icon" />
    </div>
    
    <div 
      v-if="isOpen"
      class="dropdown-menu"
    >
      <div
        v-for="option in options"
        :key="option.value"
        class="dropdown-item"
        :class="{ 'is-active': option.value === currentValue }"
        @click="selectOption(option)"
      >
        {{ option.label }}
      </div>
    </div>
  </div>
</template>

<script setup>


const props = withDefaults(defineProps(), {
  placeholder: 'Select...'
})

const emit = defineEmits<{
  select: [value]
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement>()

const currentLabel = computed(() => {
  const currentOption = props.options.find(opt => opt.value === props.currentValue)
  return currentOption?.label || props.placeholder
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectOption = (option: DropdownOption) => {
  emit('select', option.value)
  option.command?.()
  isOpen.value = false
}

// Close dropdown when clicking outside
onMounted(() => {
  const handleClickOutside = (event) => {
    if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
      isOpen.value = false
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>