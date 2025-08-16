<template>
  <div class="page-tree-item">
    <!-- Main page item -->
    <div
      :class="itemClasses"
      :style="{ paddingLeft: `${level * 16 + 8}px` }"
      draggable="true"
      @click="handleClick"
      @contextmenu="handleContextMenu"
      @dragstart="handleDragStart"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <!-- Expand/collapse button -->
      <button
        v-if="hasChildren"
        :class="expandButtonClasses"
        @click.stop="handleExpand"
      >
        <ChevronRightIcon class="w-3 h-3" />
      </button>
      <div v-else class="w-4" />

      <!-- Page icon -->
      <div class="page-icon">
        {{ page.icon || '📄' }}
      </div>

      <!-- Page title -->
      <div class="page-title">
        {{ page.title }}
      </div>

      <!-- Page status indicators -->
      <div class="page-status">
        <div v-if="page.deleted" class="status-indicator status-deleted" title="In Trash">
          🗑️
        </div>
        <div v-if="hasUnsavedChanges" class="status-indicator status-unsaved" title="Unsaved Changes">
          •
        </div>
        <div v-if="isFavorite" class="status-indicator status-favorite" title="Favorite">
          ⭐
        </div>
      </div>

      <!-- Drag indicator -->
      <div v-if="isDragOver" class="drag-indicator" />
    </div>

    <!-- Children pages -->
    <div v-if="isExpanded && hasChildren" class="page-children">
      <PageTreeItem
        v-for="child in children"
        :key="child.id"
        :page="child"
        :level="level + 1"
        :is-expanded="expandedPages.has(child.id)"
        :is-selected="selectedPages.has(child.id)"
        :is-current="currentPageId === child.id"
        @expand="$emit('expand', $event)"
        @select="$emit('select', $event, $arguments[1])"
        @context-menu="$emit('context-menu', $event, $arguments[1])"
        @drag-start="$emit('drag-start', $event, $arguments[1])"
        @drag-over="$emit('drag-over', $event, $arguments[1])"
        @drop="$emit('drop', $event, $arguments[1])"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useWorkspaceStore } from '~/stores/workspace.js'
import { usePagesStore } from '~/stores/pages.js'
import { ChevronRightIcon } from '@heroicons/vue/24/outline'

// Props
const props = defineProps({
  page: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  isCurrent: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits([
  'expand',
  'select',
  'context-menu',
  'drag-start',
  'drag-over',
  'drop'
])

// Stores
const workspaceStore = useWorkspaceStore()
const pagesStore = usePagesStore()

// State
const isDragOver = ref(false)

// Computed
const children = computed(() => {
  return workspaceStore.getChildrenPages(props.page.id)
})

const hasChildren = computed(() => {
  return children.value.length > 0
})

const expandedPages = computed(() => pagesStore.expandedPages)
const selectedPages = computed(() => pagesStore.selectedPages)
const currentPageId = computed(() => pagesStore.currentPageId)

const isFavorite = computed(() => {
  return workspaceStore.index.favoritePages.includes(props.page.id)
})

const hasUnsavedChanges = computed(() => {
  return pagesStore.currentPageId === props.page.id && pagesStore.hasUnsavedChanges
})

const itemClasses = computed(() => {
  return [
    'page-tree-item-content',
    {
      'is-selected': props.isSelected,
      'is-current': props.isCurrent,
      'is-deleted': props.page.deleted,
      'is-drag-over': isDragOver.value
    }
  ]
})

const expandButtonClasses = computed(() => {
  return [
    'expand-button',
    {
      'is-expanded': props.isExpanded
    }
  ]
})

// Methods
const handleClick = (event) => {
  emit('select', props.page.id, event)
}

const handleContextMenu = (event) => {
  emit('context-menu', event, props.page.id)
}

const handleExpand = () => {
  emit('expand', props.page.id)
}

const handleDragStart = (event) => {
  emit('drag-start', event, props.page.id)
}

const handleDragOver = (event) => {
  event.preventDefault()
  isDragOver.value = true
  emit('drag-over', event, props.page.id)
}

const handleDrop = (event) => {
  isDragOver.value = false
  emit('drop', event, props.page.id)
}
</script>

<style scoped>
.page-tree-item {
  @apply relative;
}

.page-tree-item-content {
  @apply flex items-center h-8 rounded-md cursor-pointer select-none relative;
  @apply hover:bg-gray-100 dark:hover:bg-gray-800;
  @apply transition-colors duration-150;
}

.page-tree-item-content.is-selected {
  @apply bg-blue-100 dark:bg-blue-900/30;
}

.page-tree-item-content.is-current {
  @apply bg-blue-200 dark:bg-blue-800/50 font-medium;
}

.page-tree-item-content.is-deleted {
  @apply opacity-60;
}

.page-tree-item-content.is-drag-over {
  @apply bg-blue-50 dark:bg-blue-900/20;
}

.expand-button {
  @apply flex items-center justify-center w-4 h-4 rounded transition-transform;
  @apply hover:bg-gray-200 dark:hover:bg-gray-700;
}

.expand-button.is-expanded {
  @apply transform rotate-90;
}

.page-icon {
  @apply flex items-center justify-center w-5 h-5 ml-1 text-sm;
}

.page-title {
  @apply flex-1 ml-2 text-sm truncate;
  @apply text-gray-900 dark:text-gray-100;
}

.page-status {
  @apply flex items-center space-x-1 mr-2;
}

.status-indicator {
  @apply text-xs;
}

.status-deleted {
  @apply opacity-60;
}

.status-unsaved {
  @apply text-blue-500 font-bold;
}

.status-favorite {
  @apply text-yellow-500;
}

.page-children {
  @apply space-y-1;
}

.drag-indicator {
  @apply absolute left-0 top-0 w-1 h-full bg-blue-500 rounded-r;
}
</style>