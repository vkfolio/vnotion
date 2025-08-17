<template>
  <div class="h-full flex flex-col">
    <!-- User Section -->
    <div class="p-4 border-b border-border">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-accent-primary rounded-md flex items-center justify-center">
          <i class="pi pi-user text-white text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-text-primary truncate">
            {{ userWorkspace.name }}
          </div>
          <div class="text-xs text-text-secondary truncate">
            {{ userWorkspace.email }}
          </div>
        </div>
        <button 
          class="btn btn-ghost btn-sm p-1"
          @click="showUserMenu = !showUserMenu"
        >
          <i class="pi pi-ellipsis-h text-xs"></i>
        </button>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="p-3 border-b border-border">
      <div class="space-y-1">
        <button 
          class="nav-item w-full"
          @click="createNewPage"
        >
          <i class="pi pi-plus nav-icon"></i>
          <span class="nav-text">New Page</span>
          <span class="text-xs text-text-muted ml-auto">Ctrl+N</span>
        </button>
        
        <button 
          class="nav-item w-full"
          @click="showSearch = true"
        >
          <i class="pi pi-search nav-icon"></i>
          <span class="nav-text">Search</span>
          <span class="text-xs text-text-muted ml-auto">Ctrl+K</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tree -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-2">
        <!-- Favorites Section -->
        <div class="mb-4">
          <div class="flex items-center justify-between px-2 py-1 mb-2">
            <span class="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Favorites
            </span>
            <button class="btn btn-ghost p-1">
              <i class="pi pi-plus text-xs text-text-muted"></i>
            </button>
          </div>
          <div class="space-y-1">
            <div 
              v-for="item in favoritePages" 
              :key="item.id"
              class="nav-item"
              :class="{ 'active': currentPageId === item.id }"
              @click="navigateToPage(item.id)"
            >
              <i :class="getPageIcon(item.type)" class="nav-icon"></i>
              <span class="nav-text">{{ item.title }}</span>
            </div>
          </div>
        </div>

        <!-- Pages Section -->
        <div class="mb-4">
          <div class="flex items-center justify-between px-2 py-1 mb-2">
            <span class="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Pages
            </span>
            <button class="btn btn-ghost p-1" @click="createNewPage">
              <i class="pi pi-plus text-xs text-text-muted"></i>
            </button>
          </div>
          <div class="space-y-1">
            <SidebarPageItem
              v-for="page in rootPages"
              :key="page.id"
              :page="page"
              :current-page-id="currentPageId"
              :expanded-pages="expandedPages"
              @navigate="navigateToPage"
              @toggle-expand="togglePageExpand"
              @create-child="createChildPage"
            />
          </div>
        </div>

        <!-- Databases Section -->
        <div class="mb-4">
          <div class="flex items-center justify-between px-2 py-1 mb-2">
            <span class="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Databases
            </span>
            <button class="btn btn-ghost p-1" @click="createNewDatabase">
              <i class="pi pi-plus text-xs text-text-muted"></i>
            </button>
          </div>
          <div class="space-y-1">
            <div 
              v-for="database in databases" 
              :key="database.id"
              class="nav-item"
              :class="{ 'active': currentPageId === database.id }"
              @click="navigateToPage(database.id)"
            >
              <i class="pi pi-table nav-icon"></i>
              <span class="nav-text">{{ database.title }}</span>
            </div>
          </div>
        </div>

        <!-- Trash Section -->
        <div>
          <div class="nav-item" @click="navigateToTrash">
            <i class="pi pi-trash nav-icon"></i>
            <span class="nav-text">Trash</span>
            <span v-if="trashCount > 0" class="text-xs text-text-muted ml-auto">
              {{ trashCount }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings -->
    <div class="p-3 border-t border-border">
      <div class="nav-item" @click="openSettings">
        <i class="pi pi-cog nav-icon"></i>
        <span class="nav-text">Settings</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Page: { id, title, type, icon?, children?, isFavorite?, createdAt, updatedAt }
// Database: { id, title, type, properties, createdAt, updatedAt }

// Reactive state
const showUserMenu = ref(false)
const showSearch = ref(false)
const currentPageId = ref('home')
const expandedPages = ref(new Set())

// Mock data (will be replaced with real data from stores)
const userWorkspace = ref({
  name: 'My Workspace',
  email: 'user@example.com'
})

const favoritePages = ref([
  {
    id: 'quick-notes',
    title: 'Quick Notes',
    type: 'page',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'daily-journal',
    title: 'Daily Journal',
    type: 'page',
    createdAt: new Date(),
    updatedAt: new Date()
  }
])

const rootPages = ref([
  {
    id: 'home',
    title: 'Home',
    type: 'page',
    children: [
      {
        id: 'projects',
        title: 'Projects',
        type: 'page',
        children: [
          {
            id: 'project-alpha',
            title: 'Project Alpha',
            type: 'page',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    type: 'page',
    createdAt: new Date(),
    updatedAt: new Date()
  }
])

const databases = ref([
  {
    id: 'tasks-db',
    title: 'Tasks',
    type: 'database',
    properties: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'contacts-db',
    title: 'Contacts',
    type: 'database',
    properties: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
])

const trashCount = ref(3)

// Methods
const getPageIcon = (type, icon) => {
  if (icon) return icon
  return type === 'database' ? 'pi pi-table nav-icon' : 'pi pi-file nav-icon'
}

const navigateToPage = (pageId) => {
  currentPageId.value = pageId
  // TODO: Implement actual navigation
  console.log('Navigate to page:', pageId)
}

const togglePageExpand = (pageId) => {
  if (expandedPages.value.has(pageId)) {
    expandedPages.value.delete(pageId)
  } else {
    expandedPages.value.add(pageId)
  }
}

const createNewPage = () => {
  // TODO: Implement page creation
  console.log('Create new page')
}

const createChildPage = (parentId) => {
  // TODO: Implement child page creation
  console.log('Create child page for:', parentId)
}

const createNewDatabase = () => {
  // TODO: Implement database creation
  console.log('Create new database')
}

const navigateToTrash = () => {
  currentPageId.value = 'trash'
  // TODO: Implement trash navigation
  console.log('Navigate to trash')
}

const openSettings = () => {
  // TODO: Implement settings modal
  console.log('Open settings')
}

// Keyboard shortcuts
const handleKeydown = (event) => {
  if ((event.ctrlKey || event.metaKey)) {
    switch (event.key) {
      case 'n':
        event.preventDefault()
        createNewPage()
        break
      case 'k':
        event.preventDefault()
        showSearch.value = true
        break
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>