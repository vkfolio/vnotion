<template>
  <div class="page-view">
    <!-- Loading state -->
    <div v-if="isLoading" class="page-loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading page...</div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="page-error">
      <div class="error-icon">❌</div>
      <div class="error-title">Page not found</div>
      <div class="error-message">{{ error }}</div>
      <button class="btn-back" @click="goBack">
        Go Back
      </button>
    </div>

    <!-- Page content -->
    <div v-else-if="page" class="page-content">
      <!-- Page header -->
      <div class="page-header">
        <!-- Breadcrumb -->
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <ol class="breadcrumb-list">
            <li class="breadcrumb-item">
              <NuxtLink to="/" class="breadcrumb-link">
                🏠 Home
              </NuxtLink>
            </li>
            <li 
              v-for="(breadcrumbPage, index) in breadcrumb" 
              :key="breadcrumbPage.id"
              class="breadcrumb-item"
            >
              <ChevronRightIcon class="breadcrumb-separator" />
              <NuxtLink 
                :to="`/page/${breadcrumbPage.id}`" 
                class="breadcrumb-link"
              >
                {{ breadcrumbPage.icon }} {{ breadcrumbPage.title }}
              </NuxtLink>
            </li>
            <li class="breadcrumb-item">
              <ChevronRightIcon class="breadcrumb-separator" />
              <span class="breadcrumb-current">
                {{ page.icon }} {{ page.title }}
              </span>
            </li>
          </ol>
        </nav>

        <!-- Page title and actions -->
        <div class="page-title-section">
          <div class="page-title-row">
            <!-- Page icon (editable) -->
            <div class="page-icon-wrapper">
              <button 
                class="page-icon-button"
                @click="showIconPicker = !showIconPicker"
              >
                {{ page.icon }}
              </button>
              
              <!-- Icon picker -->
              <div v-if="showIconPicker" class="icon-picker-dropdown">
                <div class="icon-picker-grid">
                  <button
                    v-for="icon in commonIcons"
                    :key="icon"
                    class="icon-picker-option"
                    @click="updatePageIcon(icon)"
                  >
                    {{ icon }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Page title (editable) -->
            <div class="page-title-wrapper">
              <input
                v-if="isEditingTitle"
                ref="titleInput"
                v-model="editedTitle"
                class="page-title-input"
                @blur="saveTitle"
                @keyup.enter="saveTitle"
                @keyup.escape="cancelEditTitle"
              />
              <h1
                v-else
                class="page-title"
                @click="startEditTitle"
              >
                {{ page.title }}
              </h1>
            </div>

            <!-- Page actions -->
            <div class="page-actions">
              <!-- Save indicator -->
              <div v-if="hasUnsavedChanges" class="save-indicator">
                <div class="save-dot"></div>
                <span class="save-text">Unsaved</span>
              </div>
              <div v-else-if="lastSaved" class="save-indicator">
                <CheckIcon class="save-check" />
                <span class="save-text">Saved</span>
              </div>

              <!-- More actions -->
              <div class="relative">
                <button 
                  class="action-button"
                  @click="showActionMenu = !showActionMenu"
                >
                  <EllipsisHorizontalIcon class="w-5 h-5" />
                </button>

                <!-- Actions dropdown -->
                <div v-if="showActionMenu" class="actions-dropdown">
                  <button class="action-item" @click="duplicatePage">
                    <DocumentDuplicateIcon class="action-icon" />
                    Duplicate
                  </button>
                  <button class="action-item" @click="exportPage">
                    <ArrowDownTrayIcon class="action-icon" />
                    Export
                  </button>
                  <button class="action-item" @click="viewHistory">
                    <ClockIcon class="action-icon" />
                    Version History
                  </button>
                  <div class="action-separator"></div>
                  <button class="action-item text-red-600" @click="deletePage">
                    <TrashIcon class="action-icon" />
                    Move to Trash
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Page metadata -->
          <div class="page-metadata">
            <div class="metadata-item">
              <span class="metadata-label">Created:</span>
              <span class="metadata-value">{{ formatDate(page.created) }}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Modified:</span>
              <span class="metadata-value">{{ formatDate(page.modified) }}</span>
            </div>
            <div v-if="page.properties && Object.keys(page.properties).length > 0" class="metadata-item">
              <span class="metadata-label">Properties:</span>
              <div class="properties-list">
                <div 
                  v-for="(value, key) in page.properties" 
                  :key="key"
                  class="property-tag"
                >
                  {{ key }}: {{ value }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Page editor -->
      <div class="page-editor-wrapper">
        <TipTapEditor
          v-if="page"
          :content="page.content"
          :editable="true"
          @update="handleContentUpdate"
        />
      </div>

      <!-- Child pages -->
      <div v-if="childPages.length > 0" class="child-pages-section">
        <h2 class="child-pages-title">Pages inside</h2>
        <div class="child-pages-grid">
          <NuxtLink
            v-for="child in childPages"
            :key="child.id"
            :to="`/page/${child.id}`"
            class="child-page-card"
          >
            <div class="child-page-icon">{{ child.icon }}</div>
            <div class="child-page-title">{{ child.title }}</div>
            <div class="child-page-meta">
              {{ formatDate(child.modified) }}
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@vueuse/head'
import {
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

import { useWorkspaceStore } from '~/stores/workspace.js'
import { usePagesStore } from '~/stores/pages.js'
import { getPageBreadcrumb } from '~/utils/page.js'

// Components
import TipTapEditor from '~/components/editor/TipTapEditor.vue'

// Routing
const route = useRoute()
const router = useRouter()

// Stores
const workspaceStore = useWorkspaceStore()
const pagesStore = usePagesStore()

// State
const isLoading = ref(true)
const error = ref(null)
const page = ref(null)
const showIconPicker = ref(false)
const showActionMenu = ref(false)
const isEditingTitle = ref(false)
const editedTitle = ref('')
const titleInput = ref(null)

// Auto-save state
const saveTimeout = ref(null)

// Common icons for picker
const commonIcons = [
  '📄', '📝', '📋', '📊', '📈', '📉', '📌', '📍', '📎', '📁',
  '💡', '⭐', '🎯', '🚀', '🔥', '💎', '🌟', '🎨', '🔧', '⚙️',
  '📱', '💻', '🖥️', '⌚', '🎮', '🎵', '🎬', '📷', '🗂️', '📚'
]

// Computed
const pageId = computed(() => route.params.id)

const breadcrumb = computed(() => {
  if (!page.value) return []
  const pageMap = new Map()
  for (const [id, pageData] of workspaceStore.structure.pages) {
    pageMap.set(id, pageData)
  }
  return getPageBreadcrumb(page.value, pageMap)
})

const childPages = computed(() => {
  if (!page.value) return []
  return workspaceStore.getChildrenPages(page.value.id)
})

const hasUnsavedChanges = computed(() => {
  return pagesStore.currentPageId === pageId.value && pagesStore.hasUnsavedChanges
})

const lastSaved = computed(() => {
  return pagesStore.lastSaved
})

// Methods
const loadPage = async () => {
  isLoading.value = true
  error.value = null

  try {
    const loadedPage = await pagesStore.loadPage(pageId.value)
    
    if (!loadedPage) {
      throw new Error('Page not found')
    }

    if (loadedPage.deleted) {
      throw new Error('This page has been moved to trash')
    }

    page.value = loadedPage
    await pagesStore.setCurrentPage(pageId.value)

  } catch (err) {
    error.value = err.message
    console.error('Failed to load page:', err)
  } finally {
    isLoading.value = false
  }
}

const handleContentUpdate = (content) => {
  if (!page.value) return

  // Update local page data
  page.value = {
    ...page.value,
    content,
    modified: new Date().toISOString()
  }

  // Update store
  pagesStore.updateCurrentPageContent(content)
}

const updatePageIcon = async (icon) => {
  if (!page.value) return

  try {
    page.value = {
      ...page.value,
      icon,
      modified: new Date().toISOString()
    }

    await pagesStore.updateCurrentPage({ icon })
    showIconPicker.value = false
  } catch (err) {
    console.error('Failed to update page icon:', err)
  }
}

const startEditTitle = () => {
  isEditingTitle.value = true
  editedTitle.value = page.value.title
  
  nextTick(() => {
    if (titleInput.value) {
      titleInput.value.focus()
      titleInput.value.select()
    }
  })
}

const saveTitle = async () => {
  if (!editedTitle.value.trim() || editedTitle.value === page.value.title) {
    cancelEditTitle()
    return
  }

  try {
    page.value = {
      ...page.value,
      title: editedTitle.value.trim(),
      modified: new Date().toISOString()
    }

    await pagesStore.updateCurrentPage({ title: editedTitle.value.trim() })
    isEditingTitle.value = false
  } catch (err) {
    console.error('Failed to update page title:', err)
    cancelEditTitle()
  }
}

const cancelEditTitle = () => {
  isEditingTitle.value = false
  editedTitle.value = ''
}

const duplicatePage = async () => {
  try {
    const duplicated = await pagesStore.duplicatePageAction(pageId.value)
    router.push(`/page/${duplicated.id}`)
    showActionMenu.value = false
  } catch (err) {
    console.error('Failed to duplicate page:', err)
  }
}

const exportPage = () => {
  // TODO: Implement page export
  console.log('Export page functionality to be implemented')
  showActionMenu.value = false
}

const viewHistory = () => {
  // TODO: Implement version history
  console.log('Version history functionality to be implemented')
  showActionMenu.value = false
}

const deletePage = async () => {
  if (confirm('Move this page to trash?')) {
    try {
      await pagesStore.deletePageToTrash(pageId.value)
      router.push('/')
    } catch (err) {
      console.error('Failed to delete page:', err)
    }
  }
  showActionMenu.value = false
}

const goBack = () => {
  router.back()
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Global click handler
const handleGlobalClick = (event) => {
  if (showIconPicker.value) {
    showIconPicker.value = false
  }
  if (showActionMenu.value) {
    showActionMenu.value = false
  }
}

// Set page title for browser
watch(() => page.value?.title, (title) => {
  if (title) {
    useHead({
      title: `${title} - VNotions`
    })
  }
})

// Watch for route changes
watch(() => pageId.value, () => {
  loadPage()
})

// Lifecycle
onMounted(() => {
  loadPage()
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  
  // Clear any pending save timeouts
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }
})

// Set up meta tags
useHead({
  title: computed(() => page.value ? `${page.value.title} - VNotions` : 'Loading - VNotions'),
  meta: [
    {
      name: 'description',
      content: computed(() => page.value ? `Page: ${page.value.title}` : 'VNotions Page')
    }
  ]
})
</script>

<style scoped>
.page-view {
  @apply h-full flex flex-col;
}

.page-loading {
  @apply flex flex-col items-center justify-center h-64;
}

.loading-spinner {
  @apply w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin;
}

.loading-text {
  @apply mt-4 text-gray-600 dark:text-gray-400;
}

.page-error {
  @apply flex flex-col items-center justify-center h-64 text-center;
}

.error-icon {
  @apply text-4xl mb-4;
}

.error-title {
  @apply text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2;
}

.error-message {
  @apply text-gray-600 dark:text-gray-400 mb-6;
}

.btn-back {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors;
}

.page-content {
  @apply flex-1 overflow-hidden;
}

.page-header {
  @apply border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900;
  @apply sticky top-0 z-10;
}

.breadcrumb {
  @apply px-6 py-3 border-b border-gray-100 dark:border-gray-800;
}

.breadcrumb-list {
  @apply flex items-center space-x-2 text-sm;
}

.breadcrumb-item {
  @apply flex items-center;
}

.breadcrumb-link {
  @apply text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300;
  @apply transition-colors;
}

.breadcrumb-separator {
  @apply w-4 h-4 text-gray-400 mx-2;
}

.breadcrumb-current {
  @apply text-gray-900 dark:text-gray-100 font-medium;
}

.page-title-section {
  @apply px-6 py-4;
}

.page-title-row {
  @apply flex items-center space-x-4 mb-3;
}

.page-icon-wrapper {
  @apply relative;
}

.page-icon-button {
  @apply w-12 h-12 text-2xl bg-gray-100 dark:bg-gray-800 rounded-lg;
  @apply hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors;
  @apply flex items-center justify-center;
}

.icon-picker-dropdown {
  @apply absolute top-14 left-0 z-20 bg-white dark:bg-gray-800;
  @apply border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg;
  @apply p-3 w-64;
}

.icon-picker-grid {
  @apply grid grid-cols-8 gap-1;
}

.icon-picker-option {
  @apply w-8 h-8 flex items-center justify-center rounded;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors;
}

.page-title-wrapper {
  @apply flex-1;
}

.page-title {
  @apply text-2xl font-bold text-gray-900 dark:text-gray-100 cursor-text;
  @apply hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 -my-1;
  @apply transition-colors;
}

.page-title-input {
  @apply text-2xl font-bold text-gray-900 dark:text-gray-100 bg-transparent;
  @apply border-2 border-blue-500 rounded px-2 py-1 -mx-2 -my-1;
  @apply focus:outline-none;
}

.page-actions {
  @apply flex items-center space-x-4;
}

.save-indicator {
  @apply flex items-center space-x-2 text-sm;
}

.save-dot {
  @apply w-2 h-2 bg-orange-500 rounded-full animate-pulse;
}

.save-check {
  @apply w-4 h-4 text-green-500;
}

.save-text {
  @apply text-gray-600 dark:text-gray-400;
}

.action-button {
  @apply p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100;
  @apply hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors;
}

.actions-dropdown {
  @apply absolute right-0 top-10 z-20 bg-white dark:bg-gray-800;
  @apply border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg;
  @apply py-1 w-48;
}

.action-item {
  @apply w-full flex items-center px-3 py-2 text-left text-sm;
  @apply text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply transition-colors;
}

.action-icon {
  @apply w-4 h-4 mr-3;
}

.action-separator {
  @apply h-px bg-gray-200 dark:bg-gray-700 my-1 mx-2;
}

.page-metadata {
  @apply flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400;
}

.metadata-item {
  @apply flex items-center space-x-1;
}

.metadata-label {
  @apply font-medium;
}

.metadata-value {
  @apply text-gray-500 dark:text-gray-500;
}

.properties-list {
  @apply flex flex-wrap gap-2;
}

.property-tag {
  @apply px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs;
}

.page-editor-wrapper {
  @apply flex-1 overflow-auto px-6 py-4;
}

.child-pages-section {
  @apply px-6 py-8 border-t border-gray-200 dark:border-gray-700;
}

.child-pages-title {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4;
}

.child-pages-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.child-page-card {
  @apply block p-4 border border-gray-200 dark:border-gray-700 rounded-lg;
  @apply hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md;
  @apply transition-all duration-200;
}

.child-page-icon {
  @apply text-xl mb-2;
}

.child-page-title {
  @apply font-medium text-gray-900 dark:text-gray-100 mb-1;
}

.child-page-meta {
  @apply text-sm text-gray-500 dark:text-gray-400;
}
</style>