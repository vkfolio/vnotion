<template>
  <Teleport to="body">
    <div
      v-if="visible"
      :class="menuClasses"
      :style="menuStyle"
      @click.stop
    >
      <template v-for="(item, index) in items" :key="index">
        <!-- Separator -->
        <div
          v-if="item.type === 'separator'"
          class="context-menu-separator"
        />
        
        <!-- Menu item -->
        <button
          v-else
          :class="[
            'context-menu-item',
            item.className
          ]"
          @click="handleItemClick(item)"
        >
          <span v-if="item.icon" class="context-menu-icon">
            {{ item.icon }}
          </span>
          <span class="context-menu-label">
            {{ item.label }}
          </span>
          <span v-if="item.shortcut" class="context-menu-shortcut">
            {{ item.shortcut }}
          </span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

// Props
const props = defineProps({
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  items: {
    type: Array,
    default: () => []
  },
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['select', 'close'])

// Computed
const menuClasses = computed(() => {
  return [
    'context-menu',
    {
      'context-menu-visible': props.visible
    }
  ]
})

const menuStyle = computed(() => {
  // Ensure menu doesn't go outside viewport
  const menuWidth = 200 // Approximate menu width
  const menuHeight = props.items.length * 32 // Approximate item height
  
  let x = props.x
  let y = props.y
  
  // Adjust position if menu would overflow
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 10
  }
  
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 10
  }
  
  return {
    left: `${Math.max(10, x)}px`,
    top: `${Math.max(10, y)}px`
  }
})

// Methods
const handleItemClick = (item) => {
  emit('select', item)
}

const handleEscape = (event) => {
  if (event.key === 'Escape') {
    emit('close')
  }
}

const handleClickOutside = (event) => {
  if (props.visible) {
    emit('close')
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.context-menu {
  @apply fixed z-50 min-w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700;
  @apply py-1 opacity-0 scale-95 transition-all duration-150;
  transform-origin: top left;
}

.context-menu-visible {
  @apply opacity-100 scale-100;
}

.context-menu-item {
  @apply w-full flex items-center px-3 py-2 text-left text-sm;
  @apply text-gray-900 dark:text-gray-100;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply transition-colors duration-150;
}

.context-menu-item:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.context-menu-icon {
  @apply w-4 h-4 mr-3 text-center;
}

.context-menu-label {
  @apply flex-1;
}

.context-menu-shortcut {
  @apply text-xs text-gray-500 dark:text-gray-400 ml-2;
}

.context-menu-separator {
  @apply h-px bg-gray-200 dark:bg-gray-700 my-1 mx-2;
}
</style>