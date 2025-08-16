<template>
  <div 
    class="callout-block"
    :class="[
      `callout-${type}`,
      { 'is-focused': isFocused }
    ]"
  >
    <!-- Callout Header -->
    <div class="callout-header">
      <div class="callout-icon-selector">
        <button 
          @click="toggleIconPicker"
          class="icon-button"
          :title="`Change icon (${type})`"
        >
          <i :class="`pi ${currentIcon}`" />
        </button>
        
        <!-- Icon Picker Dropdown -->
        <div 
          v-if="showIconPicker"
          class="icon-picker"
          ref="iconPickerRef"
        >
          <div class="icon-grid">
            <button
              v-for="iconOption in iconOptions"
              :key="iconOption.icon"
              @click="selectIcon(iconOption)"
              class="icon-option"
              :class="{ 'is-selected': iconOption.icon === currentIcon }"
              :title="iconOption.label"
            >
              <i :class="`pi ${iconOption.icon}`" />
            </button>
          </div>
        </div>
      </div>
      
      <div class="callout-type-selector">
        <select 
          v-model="selectedType"
          @change="updateType"
          class="type-select"
        >
          <option v-for="typeOption in typeOptions" :key="typeOption.value" :value="typeOption.value">
            {{ typeOption.label }}
          </option>
        </select>
      </div>
      
      <div class="callout-actions">
        <button 
          @click="deleteBlock"
          class="action-button"
          title="Delete callout"
        >
          <i class="pi pi-trash" />
        </button>
      </div>
    </div>
    
    <!-- Callout Content -->
    <div class="callout-content">
      <div 
        class="callout-text"
        contenteditable
        :placeholder="placeholder"
        @input="updateContent"
        @focus="handleFocus"
        @blur="handleBlur"
        ref="contentRef"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
export type CalloutType = 'info' | 'warning' | 'error' | 'success' | 'note' | 'tip'

export interface CalloutBlockProps {
  type?: CalloutType
  icon?: string
  content?: string
  isFocused?: boolean
  onUpdate?: (data: { type: CalloutType; icon: string; content: string }) => void
  onDelete?: () => void
}

const props = withDefaults(defineProps<CalloutBlockProps>(), {
  type: 'info',
  icon: 'pi-info-circle',
  content: '',
  isFocused: false
})

const emit = defineEmits<{
  update: [data: { type: CalloutType; icon: string; content: string }]
  delete: []
  focus: []
  blur: []
}>()

const contentRef = ref<HTMLElement>()
const iconPickerRef = ref<HTMLElement>()
const selectedType = ref<CalloutType>(props.type)
const currentIcon = ref(props.icon)
const showIconPicker = ref(false)

// Callout type options
const typeOptions = [
  { label: 'Info', value: 'info' as CalloutType },
  { label: 'Warning', value: 'warning' as CalloutType },
  { label: 'Error', value: 'error' as CalloutType },
  { label: 'Success', value: 'success' as CalloutType },
  { label: 'Note', value: 'note' as CalloutType },
  { label: 'Tip', value: 'tip' as CalloutType }
]

// Available icons
const iconOptions = [
  { icon: 'pi-info-circle', label: 'Info' },
  { icon: 'pi-exclamation-triangle', label: 'Warning' },
  { icon: 'pi-times-circle', label: 'Error' },
  { icon: 'pi-check-circle', label: 'Success' },
  { icon: 'pi-bookmark', label: 'Note' },
  { icon: 'pi-lightbulb', label: 'Tip' },
  { icon: 'pi-question-circle', label: 'Question' },
  { icon: 'pi-star', label: 'Star' },
  { icon: 'pi-heart', label: 'Heart' },
  { icon: 'pi-thumbs-up', label: 'Thumbs Up' },
  { icon: 'pi-fire', label: 'Fire' },
  { icon: 'pi-eye', label: 'Eye' },
  { icon: 'pi-bell', label: 'Bell' },
  { icon: 'pi-clock', label: 'Clock' },
  { icon: 'pi-calendar', label: 'Calendar' },
  { icon: 'pi-map', label: 'Map' }
]

// Placeholder text based on type
const placeholder = computed(() => {
  switch (selectedType.value) {
    case 'info':
      return 'Add some information...'
    case 'warning':
      return 'Add a warning...'
    case 'error':
      return 'Describe the error...'
    case 'success':
      return 'Share your success...'
    case 'note':
      return 'Take a note...'
    case 'tip':
      return 'Share a tip...'
    default:
      return 'Type something...'
  }
})

// Event handlers
const updateContent = (event: Event) => {
  const target = event.target as HTMLElement
  const content = target.textContent || ''
  
  emitUpdate(content)
}

const updateType = () => {
  // Update icon based on type if using default icons
  const defaultIcons: Record<CalloutType, string> = {
    info: 'pi-info-circle',
    warning: 'pi-exclamation-triangle',
    error: 'pi-times-circle',
    success: 'pi-check-circle',
    note: 'pi-bookmark',
    tip: 'pi-lightbulb'
  }
  
  currentIcon.value = defaultIcons[selectedType.value]
  emitUpdate()
}

const toggleIconPicker = () => {
  showIconPicker.value = !showIconPicker.value
}

const selectIcon = (iconOption: { icon: string; label: string }) => {
  currentIcon.value = iconOption.icon
  showIconPicker.value = false
  emitUpdate()
}

const deleteBlock = () => {
  emit('delete')
  props.onDelete?.()
}

const handleFocus = () => {
  emit('focus')
}

const handleBlur = () => {
  emit('blur')
}

const emitUpdate = (content?: string) => {
  const data = {
    type: selectedType.value,
    icon: currentIcon.value,
    content: content || contentRef.value?.textContent || ''
  }
  
  emit('update', data)
  props.onUpdate?.(data)
}

// Set initial content
onMounted(() => {
  if (contentRef.value && props.content) {
    contentRef.value.textContent = props.content
  }
})

// Watch for external changes
watch(() => props.content, (newContent) => {
  if (contentRef.value && contentRef.value.textContent !== newContent) {
    contentRef.value.textContent = newContent
  }
})

watch(() => props.type, (newType) => {
  selectedType.value = newType
})

watch(() => props.icon, (newIcon) => {
  currentIcon.value = newIcon
})

// Close icon picker when clicking outside
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (iconPickerRef.value && !iconPickerRef.value.contains(event.target as Node)) {
      showIconPicker.value = false
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<style lang="scss">
.callout-block {
  @apply relative rounded-lg border-l-4 mb-4 overflow-hidden;
  @apply transition-all duration-200;
  
  &.is-focused {
    @apply shadow-sm ring-1 ring-opacity-25;
  }
  
  // Callout type styles
  &.callout-info {
    @apply border-l-blue-500 bg-blue-50 dark:bg-blue-950 dark:bg-opacity-20;
    
    &.is-focused {
      @apply ring-blue-500;
    }
    
    .callout-header {
      @apply bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30;
    }
    
    .callout-icon-selector .icon-button {
      @apply text-blue-600 dark:text-blue-400;
    }
  }
  
  &.callout-warning {
    @apply border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950 dark:bg-opacity-20;
    
    &.is-focused {
      @apply ring-yellow-500;
    }
    
    .callout-header {
      @apply bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-30;
    }
    
    .callout-icon-selector .icon-button {
      @apply text-yellow-600 dark:text-yellow-400;
    }
  }
  
  &.callout-error {
    @apply border-l-red-500 bg-red-50 dark:bg-red-950 dark:bg-opacity-20;
    
    &.is-focused {
      @apply ring-red-500;
    }
    
    .callout-header {
      @apply bg-red-100 dark:bg-red-900 dark:bg-opacity-30;
    }
    
    .callout-icon-selector .icon-button {
      @apply text-red-600 dark:text-red-400;
    }
  }
  
  &.callout-success {
    @apply border-l-green-500 bg-green-50 dark:bg-green-950 dark:bg-opacity-20;
    
    &.is-focused {
      @apply ring-green-500;
    }
    
    .callout-header {
      @apply bg-green-100 dark:bg-green-900 dark:bg-opacity-30;
    }
    
    .callout-icon-selector .icon-button {
      @apply text-green-600 dark:text-green-400;
    }
  }
  
  &.callout-note {
    @apply border-l-gray-500 bg-gray-50 dark:bg-gray-950 dark:bg-opacity-20;
    
    &.is-focused {
      @apply ring-gray-500;
    }
    
    .callout-header {
      @apply bg-gray-100 dark:bg-gray-900 dark:bg-opacity-30;
    }
    
    .callout-icon-selector .icon-button {
      @apply text-gray-600 dark:text-gray-400;
    }
  }
  
  &.callout-tip {
    @apply border-l-purple-500 bg-purple-50 dark:bg-purple-950 dark:bg-opacity-20;
    
    &.is-focused {
      @apply ring-purple-500;
    }
    
    .callout-header {
      @apply bg-purple-100 dark:bg-purple-900 dark:bg-opacity-30;
    }
    
    .callout-icon-selector .icon-button {
      @apply text-purple-600 dark:text-purple-400;
    }
  }
  
  .callout-header {
    @apply flex items-center justify-between px-3 py-2;
    @apply transition-colors duration-200;
    
    .callout-icon-selector {
      @apply relative;
      
      .icon-button {
        @apply flex items-center justify-center w-8 h-8 rounded-md;
        @apply hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10;
        @apply transition-all duration-150 cursor-pointer;
        
        i {
          @apply text-lg;
        }
      }
      
      .icon-picker {
        @apply absolute top-full left-0 mt-1 z-10;
        @apply bg-surface-0 border border-border-color rounded-lg shadow-xl;
        @apply p-2 min-w-48;
        
        .icon-grid {
          @apply grid grid-cols-4 gap-1;
          
          .icon-option {
            @apply flex items-center justify-center w-8 h-8 rounded-md;
            @apply text-text-secondary hover:text-text-primary hover:bg-surface-100;
            @apply transition-all duration-150 cursor-pointer;
            
            &.is-selected {
              @apply text-accent-primary bg-accent-primary bg-opacity-10;
            }
            
            i {
              @apply text-sm;
            }
          }
        }
      }
    }
    
    .callout-type-selector {
      .type-select {
        @apply bg-transparent border-none text-sm font-medium;
        @apply text-inherit focus:outline-none cursor-pointer;
      }
    }
    
    .callout-actions {
      @apply opacity-0 transition-opacity duration-200;
      
      .action-button {
        @apply flex items-center justify-center w-7 h-7 rounded-md;
        @apply text-text-muted hover:text-text-primary;
        @apply hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10;
        @apply transition-all duration-150 cursor-pointer;
        
        i {
          @apply text-sm;
        }
      }
    }
  }
  
  &:hover .callout-actions {
    @apply opacity-100;
  }
  
  .callout-content {
    @apply p-4;
    
    .callout-text {
      @apply text-text-primary leading-relaxed outline-none;
      @apply min-h-6;
      
      &:empty::before {
        content: attr(placeholder);
        @apply text-text-muted pointer-events-none;
      }
      
      &:focus {
        @apply outline-none;
      }
    }
  }
}
</style>