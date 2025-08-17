<template>
  <div 
    class="slash-commands-menu"
    :style="{ 
      left: position.x + 'px', 
      top: position.y + 'px' 
    }"
    ref="menuRef"
  >
    <div class="commands-header">
      <i class="pi pi-search" />
      <span>Basic blocks</span>
    </div>
    
    <div class="commands-list">
      <div
        v-for="(command, index) in filteredCommands"
        :key="command.name"
        class="command-item"
        :class="{ 'is-selected': selectedIndex === index }"
        @click="selectCommand(command)"
        @mouseenter="selectedIndex = index"
      >
        <div class="command-icon">
          <i :class="`pi ${command.icon}`" />
        </div>
        <div class="command-content">
          <div class="command-title">{{ command.title }}</div>
          <div class="command-description">{{ command.description }}</div>
        </div>
        <div class="command-shortcut">
          {{ command.shortcut }}
        </div>
      </div>
    </div>
    
    <div v-if="filteredCommands.length === 0" class="no-results">
      <i class="pi pi-info-circle" />
      <span>No blocks found</span>
    </div>
  </div>
</template>

<script setup>
// SlashCommand: { name, title, description, icon, shortcut, keywords, action }
// SlashCommandsProps: { editor, position, searchQuery? }

const props = withDefaults(defineProps(), {
  searchQuery: ''
})

const emit = defineEmits(['close', 'select'])

const menuRef = ref()
const selectedIndex = ref(0)

// Available slash commands
const commands = computed(() => [
  {
    name: 'h1',
    title: 'Heading 1',
    description: 'Big section heading',
    icon: 'pi-hashtag',
    shortcut: '/h1',
    keywords: ['heading', 'h1', 'title', 'big'],
    action: () => emit('select', 'h1')
  },
  {
    name: 'h2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'pi-hashtag',
    shortcut: '/h2',
    keywords: ['heading', 'h2', 'subtitle', 'medium'],
    action: () => emit('select', 'h2')
  },
  {
    name: 'h3',
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'pi-hashtag',
    shortcut: '/h3',
    keywords: ['heading', 'h3', 'small'],
    action: () => emit('select', 'h3')
  },
  {
    name: 'bullet',
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: 'pi-list',
    shortcut: '/bullet',
    keywords: ['bullet', 'list', 'unordered', 'ul'],
    action: () => emit('select', 'bullet')
  },
  {
    name: 'number',
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: 'pi-sort-numeric-up',
    shortcut: '/number',
    keywords: ['numbered', 'list', 'ordered', 'ol', 'number'],
    action: () => emit('select', 'number')
  },
  {
    name: 'todo',
    title: 'Todo List',
    description: 'Track tasks with a todo list',
    icon: 'pi-check-square',
    shortcut: '/todo',
    keywords: ['todo', 'task', 'check', 'checkbox', 'list'],
    action: () => emit('select', 'todo')
  },
  {
    name: 'quote',
    title: 'Quote',
    description: 'Capture a quote',
    icon: 'pi-quote-left',
    shortcut: '/quote',
    keywords: ['quote', 'blockquote', 'citation'],
    action: () => emit('select', 'quote')
  },
  {
    name: 'code',
    title: 'Code Block',
    description: 'Capture a code snippet',
    icon: 'pi-code',
    shortcut: '/code',
    keywords: ['code', 'snippet', 'programming', 'syntax'],
    action: () => emit('select', 'code')
  },
  {
    name: 'divider',
    title: 'Divider',
    description: 'Visually divide blocks',
    icon: 'pi-minus',
    shortcut: '/divider',
    keywords: ['divider', 'separator', 'line', 'hr'],
    action: () => emit('select', 'divider')
  },
  {
    name: 'callout',
    title: 'Callout',
    description: 'Make writing stand out',
    icon: 'pi-info-circle',
    shortcut: '/callout',
    keywords: ['callout', 'highlight', 'info', 'warning', 'note'],
    action: () => emit('select', 'callout')
  },
  {
    name: 'toggle',
    title: 'Toggle',
    description: 'Create a collapsible toggle list',
    icon: 'pi-chevron-right',
    shortcut: '/toggle',
    keywords: ['toggle', 'collapsible', 'accordion', 'expand'],
    action: () => emit('select', 'toggle')
  }
])

// Filter commands based on search query
const filteredCommands = computed(() => {
  if (!props.searchQuery) {
    return commands.value
  }
  
  const query = props.searchQuery.toLowerCase()
  return commands.value.filter(command => 
    command.title.toLowerCase().includes(query) ||
    command.description.toLowerCase().includes(query) ||
    command.keywords.some(keyword => keyword.includes(query)) ||
    command.shortcut.includes(query)
  )
})

// Handle keyboard navigation
const handleKeydown = (e) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, filteredCommands.value.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      if (filteredCommands.value[selectedIndex.value]) {
        selectCommand(filteredCommands.value[selectedIndex.value])
      }
      break
    case 'Escape':
      e.preventDefault()
      emit('close')
      break
  }
}

const selectCommand = (command: SlashCommand) => {
  command.action()
  emit('close')
}

// Reset selected index when filtered commands change
watch(filteredCommands, () => {
  selectedIndex.value = 0
})

// Add keyboard listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})

// Position menu to avoid going off screen
onMounted(() => {
  nextTick(() => {
    if (!menuRef.value) return
    
    const rect = menuRef.value.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    
    // Adjust position if menu goes off screen
    let adjustedX = props.position.x
    let adjustedY = props.position.y
    
    if (rect.right > viewport.width) {
      adjustedX = viewport.width - rect.width - 10
    }
    
    if (rect.bottom > viewport.height) {
      adjustedY = props.position.y - rect.height - 10
    }
    
    if (adjustedX !== props.position.x || adjustedY !== props.position.y) {
      menuRef.value.style.left = adjustedX + 'px'
      menuRef.value.style.top = adjustedY + 'px'
    }
  })
})
</script>

<style lang="scss">
.slash-commands-menu {
  @apply fixed z-50 w-80 max-h-96 overflow-y-auto;
  @apply bg-surface-0 border border-border-color rounded-lg shadow-xl;
  @apply animate-in fade-in slide-in-from-bottom-2 duration-150;
  
  .commands-header {
    @apply flex items-center gap-2 p-3 border-b border-border-color;
    @apply text-sm font-medium text-text-secondary;
    
    i {
      @apply text-text-muted;
    }
  }
  
  .commands-list {
    @apply py-2;
  }
  
  .command-item {
    @apply flex items-center gap-3 px-3 py-2 cursor-pointer;
    @apply hover:bg-surface-100 transition-colors duration-150;
    
    &.is-selected {
      @apply bg-accent-primary bg-opacity-10 text-accent-primary;
      
      .command-icon i {
        @apply text-accent-primary;
      }
    }
    
    .command-icon {
      @apply flex items-center justify-center w-8 h-8 rounded-md bg-surface-100;
      @apply flex-shrink-0;
      
      i {
        @apply text-text-muted;
      }
    }
    
    .command-content {
      @apply flex-1 min-w-0;
      
      .command-title {
        @apply font-medium text-text-primary text-sm;
      }
      
      .command-description {
        @apply text-xs text-text-secondary mt-0.5;
      }
    }
    
    .command-shortcut {
      @apply text-xs text-text-muted font-mono bg-surface-100 px-1.5 py-0.5 rounded;
      @apply flex-shrink-0;
    }
  }
  
  .no-results {
    @apply flex items-center justify-center gap-2 p-6 text-text-muted;
    
    i {
      @apply text-lg;
    }
  }
}

// Animation utilities (if not available in Tailwind)
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-from-bottom {
  from { transform: translateY(4px); }
  to { transform: translateY(0); }
}

.animate-in {
  animation-fill-mode: both;
}

.fade-in {
  animation-name: fade-in;
}

.slide-in-from-bottom-2 {
  animation-name: slide-in-from-bottom;
}

.duration-150 {
  animation-duration: 150ms;
}
</style>