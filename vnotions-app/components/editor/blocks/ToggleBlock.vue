<template>
  <div 
    class="toggle-block"
    :class="{ 
      'is-expanded': isExpanded,
      'is-focused': isFocused 
    }"
  >
    <!-- Toggle Header -->
    <div 
      class="toggle-header"
      @click="toggleExpanded"
    >
      <div class="toggle-icon">
        <i 
          class="pi pi-chevron-right"
          :class="{ 'rotate-90': isExpanded }"
        />
      </div>
      
      <div 
        class="toggle-title"
        contenteditable
        :placeholder="titlePlaceholder"
        @input="updateTitle"
        @focus="handleTitleFocus"
        @blur="handleTitleBlur"
        @click.stop
        ref="titleRef"
      />
      
      <div class="toggle-actions">
        <button 
          @click.stop="deleteBlock"
          class="action-button"
          title="Delete toggle"
        >
          <i class="pi pi-trash" />
        </button>
      </div>
    </div>
    
    <!-- Toggle Content -->
    <div 
      class="toggle-content"
      :class="{ 'is-visible': isExpanded }"
    >
      <div class="toggle-content-inner">
        <div 
          class="toggle-text"
          contenteditable
          :placeholder="contentPlaceholder"
          @input="updateContent"
          @focus="handleContentFocus"
          @blur="handleContentBlur"
          ref="contentRef"
        />
      </div>
    </div>
  </div>
</template>

<script setup>

const props = withDefaults(defineProps(), {
  title: '',
  content: '',
  isExpanded: false,
  isFocused: false,
  titlePlaceholder: 'Toggle title',
  contentPlaceholder: 'Add some content...'
})

const emit = defineEmits<{
  update: [data: { title; content; isExpanded }]
  delete: []
  focus: []
  blur: []
}>()

const titleRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()
const isExpanded = ref(props.isExpanded)

// Event handlers
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  emitUpdate()
}

const updateTitle = (event) => {
  const target = event.target as HTMLElement
  const title = target.textContent || ''
  emitUpdate(title)
}

const updateContent = (event) => {
  const target = event.target as HTMLElement
  const content = target.textContent || ''
  emitUpdate(undefined, content)
}

const handleTitleFocus = () => {
  emit('focus')
}

const handleTitleBlur = () => {
  emit('blur')
}

const handleContentFocus = () => {
  emit('focus')
}

const handleContentBlur = () => {
  emit('blur')
}

const deleteBlock = () => {
  emit('delete')
  props.onDelete?.()
}

const emitUpdate = (title?, content?) => {
  const data = {
    title: title ?? titleRef.value?.textContent || '',
    content: content ?? contentRef.value?.textContent || '',
    isExpanded: isExpanded.value
  }
  
  emit('update', data)
  props.onUpdate?.(data)
}

// Set initial content
onMounted(() => {
  if (titleRef.value && props.title) {
    titleRef.value.textContent = props.title
  }
  
  if (contentRef.value && props.content) {
    contentRef.value.textContent = props.content
  }
})

// Watch for external changes
watch(() => props.title, (newTitle) => {
  if (titleRef.value && titleRef.value.textContent !== newTitle) {
    titleRef.value.textContent = newTitle
  }
})

watch(() => props.content, (newContent) => {
  if (contentRef.value && contentRef.value.textContent !== newContent) {
    contentRef.value.textContent = newContent
  }
})

watch(() => props.isExpanded, (newExpanded) => {
  isExpanded.value = newExpanded
})

// Keyboard shortcuts
const handleKeydown = (event) => {
  // Enter key to expand/collapse when focused on title
  if (event.key === 'Enter' && document.activeElement === titleRef.value) {
    event.preventDefault()
    toggleExpanded()
  }
  
  // Tab key to move from title to content
  if (event.key === 'Tab' && document.activeElement === titleRef.value && isExpanded.value) {
    event.preventDefault()
    contentRef.value?.focus()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})

// Auto-expand when content is added
watch(() => contentRef.value?.textContent, (newContent) => {
  if (newContent && newContent.trim() && !isExpanded.value) {
    isExpanded.value = true
    emitUpdate()
  }
})
</script>

<style lang="scss">
.toggle-block {
  @apply relative rounded-lg border border-border-color bg-surface-50 mb-4 overflow-hidden;
  @apply transition-all duration-200;
  
  &.is-focused {
    @apply border-accent-primary border-opacity-50 shadow-sm;
  }
  
  &:hover {
    .toggle-actions {
      @apply opacity-100;
    }
  }
  
  .toggle-header {
    @apply flex items-center gap-3 p-3 cursor-pointer;
    @apply hover:bg-surface-100 transition-colors duration-150;
    @apply select-none;
    
    .toggle-icon {
      @apply flex items-center justify-center w-6 h-6 rounded-sm;
      @apply text-text-muted hover:text-text-primary;
      @apply transition-all duration-200 flex-shrink-0;
      
      i {
        @apply text-sm transition-transform duration-200;
        
        &.rotate-90 {
          @apply transform rotate-90;
        }
      }
    }
    
    .toggle-title {
      @apply flex-1 text-text-primary font-medium outline-none;
      @apply cursor-text select-text;
      @apply min-h-6;
      
      &:empty::before {
        content: attr(placeholder);
        @apply text-text-muted pointer-events-none;
      }
      
      &:focus {
        @apply outline-none;
      }
    }
    
    .toggle-actions {
      @apply flex items-center gap-1 opacity-0 transition-opacity duration-200;
      @apply flex-shrink-0;
      
      .action-button {
        @apply flex items-center justify-center w-7 h-7 rounded-md;
        @apply text-text-muted hover:text-text-primary hover:bg-surface-200;
        @apply transition-all duration-150 cursor-pointer;
        
        i {
          @apply text-sm;
        }
      }
    }
  }
  
  .toggle-content {
    @apply max-h-0 overflow-hidden transition-all duration-300 ease-out;
    
    &.is-visible {
      @apply max-h-96;
    }
    
    .toggle-content-inner {
      @apply border-t border-border-color;
      
      .toggle-text {
        @apply p-4 text-text-primary leading-relaxed outline-none;
        @apply min-h-20;
        
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
  
  // Enhanced expanded state
  &.is-expanded {
    .toggle-header {
      @apply bg-surface-100;
    }
    
    .toggle-content {
      @apply max-h-none;
    }
  }
  
  // Nested content support
  .toggle-text {
    // Support for nested formatting
    strong {
      @apply font-bold;
    }
    
    em {
      @apply italic;
    }
    
    code {
      @apply bg-surface-200 text-accent-primary px-1 py-0.5 rounded text-sm font-mono;
    }
    
    // Support for lists in toggle content
    ul, ol {
      @apply pl-6 my-2;
      
      li {
        @apply mb-1;
        
        &::marker {
          @apply text-text-secondary;
        }
      }
    }
    
    // Support for links
    a {
      @apply text-accent-primary underline hover:text-accent-hover;
    }
  }
}

// Animation improvements
.toggle-content {
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// Focus states
.toggle-block:focus-within {
  @apply border-accent-primary border-opacity-50;
}

// Accessibility improvements
.toggle-header {
  &:focus {
    @apply outline-none ring-2 ring-accent-primary ring-opacity-25 rounded;
  }
  
  // Keyboard navigation hint
  &:focus-visible {
    @apply ring-2 ring-accent-primary ring-opacity-50;
  }
}

// Dark theme specific adjustments
:root.dark-mode {
  .toggle-block {
    .toggle-header:hover {
      @apply bg-surface-200;
    }
    
    &.is-expanded .toggle-header {
      @apply bg-surface-200;
    }
  }
}

// Compact variant (optional)
.toggle-block.compact {
  .toggle-header {
    @apply py-2;
  }
  
  .toggle-content .toggle-content-inner .toggle-text {
    @apply py-3;
  }
}

// Large variant (optional)
.toggle-block.large {
  .toggle-header {
    @apply py-4;
    
    .toggle-title {
      @apply text-lg;
    }
  }
  
  .toggle-content .toggle-content-inner .toggle-text {
    @apply py-6 text-lg;
  }
}
</style>