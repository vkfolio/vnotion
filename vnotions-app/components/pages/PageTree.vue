<template>
  <div class="page-tree">
    <!-- Root level pages -->
    <div class="page-tree-content">
      <PageTreeItem
        v-for="page in rootPages"
        :key="page.id"
        :page="page"
        :level="0"
        :is-expanded="expandedPages.has(page.id)"
        :is-selected="selectedPages.has(page.id)"
        :is-current="currentPageId === page.id"
        @expand="toggleExpanded"
        @select="selectPage"
        @context-menu="showContextMenu"
        @drag-start="onDragStart"
        @drag-over="onDragOver"
        @drop="onDrop"
      />
    </div>

    <!-- Empty state -->
    <div v-if="rootPages.length === 0" class="page-tree-empty">
      <div class="empty-icon">📄</div>
      <div class="empty-title">No pages yet</div>
      <div class="empty-subtitle">Create your first page to get started</div>
      <button 
        class="btn-create-page"
        @click="$emit('create-page')"
      >
        Create Page
      </button>
    </div>

    <!-- Context menu -->
    <ContextMenu
      v-if="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @select="onContextMenuSelect"
      @close="hideContextMenu"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWorkspaceStore } from '~/stores/workspace.js'
import { usePagesStore } from '~/stores/pages.js'

// Components
import PageTreeItem from './PageTreeItem.vue'
import ContextMenu from '../ui/ContextMenu.vue'

// Props
const props = defineProps({
  searchQuery: {
    type: String,
    default: ''
  },
  showDeleted: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits([
  'create-page',
  'page-selected',
  'page-moved',
  'page-deleted',
  'page-duplicated'
])

// Stores
const workspaceStore = useWorkspaceStore()
const pagesStore = usePagesStore()

// Reactive state
const draggedPage = ref(null)
const dragOverPage = ref(null)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  pageId: null
})

// Computed
const rootPages = computed(() => {
  let pages = workspaceStore.rootPages
  
  // Apply search filter
  if (props.searchQuery) {
    pages = pages.filter(page => 
      page.title.toLowerCase().includes(props.searchQuery.toLowerCase())
    )
  }
  
  // Apply deleted filter
  if (!props.showDeleted) {
    pages = pages.filter(page => !page.deleted)
  }
  
  return pages
})

const expandedPages = computed(() => pagesStore.expandedPages)
const selectedPages = computed(() => pagesStore.selectedPages)
const currentPageId = computed(() => pagesStore.currentPageId)

const contextMenuItems = computed(() => {
  const page = contextMenu.value.pageId ? 
    workspaceStore.structure.pages.get(contextMenu.value.pageId) : null
  
  if (!page) return []

  const items = [
    {
      id: 'open',
      label: 'Open',
      icon: '📂',
      action: () => openPage(page.id)
    },
    {
      id: 'new-child',
      label: 'New Page Inside',
      icon: '➕',
      action: () => createChildPage(page.id)
    },
    { type: 'separator' },
    {
      id: 'rename',
      label: 'Rename',
      icon: '✏️',
      action: () => renamePage(page.id)
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: '📋',
      action: () => duplicatePage(page.id)
    },
    {
      id: 'copy-link',
      label: 'Copy Link',
      icon: '🔗',
      action: () => copyPageLink(page.id)
    },
    { type: 'separator' }
  ]

  if (page.deleted) {
    items.push({
      id: 'restore',
      label: 'Restore',
      icon: '↩️',
      action: () => restorePage(page.id)
    })
    items.push({
      id: 'delete-permanent',
      label: 'Delete Permanently',
      icon: '🗑️',
      className: 'text-red-600',
      action: () => deletePermanently(page.id)
    })
  } else {
    items.push({
      id: 'delete',
      label: 'Move to Trash',
      icon: '🗑️',
      className: 'text-red-600',
      action: () => deletePage(page.id)
    })
  }

  return items
})

// Methods
const toggleExpanded = (pageId) => {
  if (expandedPages.value.has(pageId)) {
    pagesStore.expandedPages.delete(pageId)
  } else {
    pagesStore.expandedPages.add(pageId)
  }
}

const selectPage = (pageId, event) => {
  if (event.ctrlKey || event.metaKey) {
    // Multi-select
    if (selectedPages.value.has(pageId)) {
      pagesStore.selectedPages.delete(pageId)
    } else {
      pagesStore.selectedPages.add(pageId)
    }
  } else {
    // Single select
    pagesStore.selectedPages.clear()
    pagesStore.selectedPages.add(pageId)
    emit('page-selected', pageId)
  }
}

const showContextMenu = (event, pageId) => {
  event.preventDefault()
  
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    pageId
  }
}

const hideContextMenu = () => {
  contextMenu.value.visible = false
}

const onContextMenuSelect = (item) => {
  item.action()
  hideContextMenu()
}

// Drag and drop
const onDragStart = (event, pageId) => {
  draggedPage.value = pageId
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', pageId)
}

const onDragOver = (event, pageId) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverPage.value = pageId
}

const onDrop = async (event, targetPageId) => {
  event.preventDefault()
  
  const sourcePageId = draggedPage.value
  if (!sourcePageId || sourcePageId === targetPageId) {
    return
  }

  try {
    await pagesStore.movePage(sourcePageId, targetPageId)
    emit('page-moved', sourcePageId, targetPageId)
  } catch (error) {
    console.error('Failed to move page:', error)
    // Show error notification
  } finally {
    draggedPage.value = null
    dragOverPage.value = null
  }
}

// Page actions
const openPage = (pageId) => {
  emit('page-selected', pageId)
}

const createChildPage = (parentId) => {
  emit('create-page', { parent: parentId })
}

const renamePage = async (pageId) => {
  const page = workspaceStore.structure.pages.get(pageId)
  if (!page) return

  const newTitle = prompt('Enter new page title:', page.title)
  if (newTitle && newTitle !== page.title) {
    try {
      await pagesStore.updateCurrentPage({ title: newTitle })
    } catch (error) {
      console.error('Failed to rename page:', error)
    }
  }
}

const duplicatePage = async (pageId) => {
  try {
    const duplicated = await pagesStore.duplicatePageAction(pageId)
    emit('page-duplicated', pageId, duplicated.id)
  } catch (error) {
    console.error('Failed to duplicate page:', error)
  }
}

const copyPageLink = (pageId) => {
  const url = `${window.location.origin}/page/${pageId}`
  navigator.clipboard.writeText(url).then(() => {
    // Show success notification
    console.log('Page link copied to clipboard')
  }).catch(() => {
    // Show error notification
    console.error('Failed to copy page link')
  })
}

const deletePage = async (pageId) => {
  if (confirm('Move this page to trash?')) {
    try {
      await pagesStore.deletePageToTrash(pageId)
      emit('page-deleted', pageId)
    } catch (error) {
      console.error('Failed to delete page:', error)
    }
  }
}

const restorePage = async (pageId) => {
  try {
    await pagesStore.restorePageFromTrash(pageId)
  } catch (error) {
    console.error('Failed to restore page:', error)
  }
}

const deletePermanently = async (pageId) => {
  if (confirm('Permanently delete this page? This cannot be undone.')) {
    try {
      await pagesStore.permanentlyDeletePage(pageId)
      emit('page-deleted', pageId)
    } catch (error) {
      console.error('Failed to permanently delete page:', error)
    }
  }
}

// Global click handler to hide context menu
const handleGlobalClick = (event) => {
  if (contextMenu.value.visible) {
    hideContextMenu()
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})
</script>

<style scoped>
.page-tree {
  @apply h-full overflow-auto;
}

.page-tree-content {
  @apply space-y-1 p-2;
}

.page-tree-empty {
  @apply flex flex-col items-center justify-center h-full text-center p-8;
}

.empty-icon {
  @apply text-4xl mb-4 opacity-50;
}

.empty-title {
  @apply text-lg font-medium text-gray-900 dark:text-gray-100 mb-2;
}

.empty-subtitle {
  @apply text-sm text-gray-500 dark:text-gray-400 mb-6;
}

.btn-create-page {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors;
}
</style>