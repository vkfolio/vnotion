<template>
  <div class="h-full p-8">
    <!-- Welcome Content -->
    <div class="max-w-4xl mx-auto">
      <!-- Page Header -->
      <div class="mb-8">
        <div class="flex items-center space-x-3 mb-4">
          <div class="w-12 h-12 bg-accent-primary rounded-lg flex items-center justify-center">
            <i class="pi pi-home text-white text-xl"></i>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-text-primary">Welcome to VNotions</h1>
            <p class="text-text-secondary">Your local-first, privacy-focused knowledge management workspace</p>
          </div>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div 
          class="bg-surface-50 rounded-lg p-6 border border-border hover:border-accent-primary transition-colors cursor-pointer group"
          @click="showPageCreator = true"
        >
          <div class="flex items-center space-x-3 mb-3">
            <div class="w-10 h-10 bg-accent-primary rounded-md flex items-center justify-center group-hover:scale-110 transition-transform">
              <i class="pi pi-plus text-white"></i>
            </div>
            <h3 class="font-semibold text-text-primary">Create Page</h3>
          </div>
          <p class="text-text-secondary text-sm">Start writing in a new page</p>
        </div>

        <div class="bg-surface-50 rounded-lg p-6 border border-border hover:border-accent-primary transition-colors cursor-pointer group">
          <div class="flex items-center space-x-3 mb-3">
            <div class="w-10 h-10 bg-success rounded-md flex items-center justify-center group-hover:scale-110 transition-transform">
              <i class="pi pi-table text-white"></i>
            </div>
            <h3 class="font-semibold text-text-primary">Create Database</h3>
          </div>
          <p class="text-text-secondary text-sm">Organize information in tables</p>
        </div>

        <div class="bg-surface-50 rounded-lg p-6 border border-border hover:border-accent-primary transition-colors cursor-pointer group">
          <div class="flex items-center space-x-3 mb-3">
            <div class="w-10 h-10 bg-warning rounded-md flex items-center justify-center group-hover:scale-110 transition-transform">
              <i class="pi pi-upload text-white"></i>
            </div>
            <h3 class="font-semibold text-text-primary">Import</h3>
          </div>
          <p class="text-text-secondary text-sm">Import from Notion, Markdown, or other formats</p>
        </div>
      </div>

      <!-- Recent Pages -->
      <div class="bg-surface-50 rounded-lg p-6 border border-border mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-text-primary">Recent Pages</h2>
          <button 
            class="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
            @click="showPageCreator = true"
          >
            + New Page
          </button>
        </div>
        
        <div v-if="recentPages.length > 0" class="space-y-3">
          <div 
            v-for="page in recentPages" 
            :key="page.id"
            class="flex items-center space-x-3 p-3 hover:bg-surface-100 rounded-md transition-colors cursor-pointer"
            @click="openPage(page.id)"
          >
            <div class="w-8 h-8 bg-surface-200 rounded-md flex items-center justify-center">
              {{ page.icon }}
            </div>
            <div class="flex-1">
              <div class="font-medium text-text-primary">{{ page.title }}</div>
              <div class="text-sm text-text-secondary">{{ formatDate(page.modified) }}</div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center py-8">
          <div class="text-4xl mb-2">📄</div>
          <div class="text-text-secondary">No pages yet</div>
          <button 
            class="mt-2 text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
            @click="showPageCreator = true"
          >
            Create your first page
          </button>
        </div>
      </div>

      <!-- Getting Started -->
      <div class="bg-surface-50 rounded-lg p-6 border border-border">
        <h2 class="text-xl font-semibold text-text-primary mb-4">Getting Started</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-medium text-text-primary mb-2">📝 Pages</h3>
            <p class="text-text-secondary text-sm mb-3">
              Create rich documents with text, images, embeds, and more. Use Markdown shortcuts for quick formatting.
            </p>
            <ul class="text-sm text-text-secondary space-y-1">
              <li>• Type <code class="bg-surface-200 px-1 rounded">/</code> for commands</li>
              <li>• Use <code class="bg-surface-200 px-1 rounded">Ctrl+N</code> for new page</li>
              <li>• Drag and drop to reorganize</li>
            </ul>
          </div>
          
          <div>
            <h3 class="font-medium text-text-primary mb-2">🗃️ Databases</h3>
            <p class="text-text-secondary text-sm mb-3">
              Organize information in structured tables with custom properties, filters, and views.
            </p>
            <ul class="text-sm text-text-secondary space-y-1">
              <li>• Multiple view types (table, board, calendar)</li>
              <li>• Custom properties and formulas</li>
              <li>• Advanced filtering and sorting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Page Creator Modal -->
    <PageCreator
      :is-visible="showPageCreator"
      @close="showPageCreator = false"
      @created="handlePageCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '~/stores/workspace.js'
import { usePagesStore } from '~/stores/pages.js'
import PageCreator from '~/components/pages/PageCreator.vue'

// Page setup
useHead({
  title: 'Home'
})

// Router
const router = useRouter()

// Stores
const workspaceStore = useWorkspaceStore()
const pagesStore = usePagesStore()

// State
const showPageCreator = ref(false)

// Computed
const recentPages = computed(() => {
  return workspaceStore.recentPages.slice(0, 5) // Show only the 5 most recent
})

// Methods
const openPage = (pageId) => {
  router.push(`/page/${pageId}`)
}

const handlePageCreated = (page) => {
  // Redirect to the newly created page
  router.push(`/page/${page.id}`)
}

const createDatabase = () => {
  // TODO: Implement database creation
  console.log('Create new database')
}

const importData = () => {
  // TODO: Implement import functionality
  console.log('Import data')
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffTime / (1000 * 60))

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }
}

// Initialize workspace on mount (in a real app, this would be done during app initialization)
onMounted(async () => {
  try {
    // Check if workspace is already initialized
    if (!workspaceStore.isInitialized) {
      // In a real app, you would prompt user to select a workspace folder
      // For demo purposes, we'll initialize with a default path
      const defaultWorkspacePath = '/tmp/vnotions-demo'
      await workspaceStore.initializeWorkspace(defaultWorkspacePath)
    }
  } catch (error) {
    console.error('Failed to initialize workspace:', error)
  }
})
</script>