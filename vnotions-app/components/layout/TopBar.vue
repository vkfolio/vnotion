<template>
  <div class="flex items-center justify-between w-full">
    <!-- Left Section: Breadcrumbs and Page Title -->
    <div class="flex items-center flex-1 min-w-0">
      <!-- Breadcrumbs -->
      <nav class="flex items-center space-x-2 mr-4">
        <button
          v-for="(crumb, index) in breadcrumbs"
          :key="crumb.id"
          class="flex items-center space-x-1 hover:bg-surface-100 rounded px-2 py-1 transition-colors"
          @click="navigateToPage(crumb.id)"
        >
          <i v-if="crumb.icon" :class="crumb.icon" class="text-sm text-text-muted"></i>
          <span class="text-sm text-text-secondary hover:text-text-primary">
            {{ crumb.title }}
          </span>
          <i 
            v-if="index < breadcrumbs.length - 1" 
            class="pi pi-chevron-right text-xs text-text-muted ml-1"
          ></i>
        </button>
      </nav>

      <!-- Page Title and Icon -->
      <div class="flex items-center space-x-3 min-w-0">
        <!-- Page Icon Button -->
        <button 
          class="w-8 h-8 flex items-center justify-center hover:bg-surface-100 rounded transition-colors"
          @click="showIconPicker = true"
          title="Change icon"
        >
          <i :class="currentPage.icon || 'pi pi-file'" class="text-lg text-text-muted"></i>
        </button>

        <!-- Page Title (Editable) -->
        <div class="flex-1 min-w-0">
          <input
            v-if="isEditingTitle"
            ref="titleInput"
            v-model="editedTitle"
            class="bg-transparent border-none outline-none text-2xl font-semibold text-text-primary w-full"
            @blur="saveTitle"
            @keydown.enter="saveTitle"
            @keydown.esc="cancelEdit"
          />
          <h1
            v-else
            class="text-2xl font-semibold text-text-primary cursor-pointer hover:bg-surface-100 px-2 py-1 rounded -mx-2 -my-1 transition-colors truncate"
            @click="startEditTitle"
          >
            {{ currentPage.title }}
          </h1>
        </div>
      </div>
    </div>

    <!-- Right Section: Actions -->
    <div class="flex items-center space-x-2">
      <!-- Share Button -->
      <button 
        class="btn btn-ghost btn-sm"
        @click="shareePage"
        title="Share"
      >
        <i class="pi pi-share-alt mr-2"></i>
        Share
      </button>

      <!-- Star/Favorite Button -->
      <button 
        class="btn btn-ghost btn-sm"
        :class="{ 'text-warning': currentPage.isFavorite }"
        @click="toggleFavorite"
        :title="currentPage.isFavorite ? 'Remove from favorites' : 'Add to favorites'"
      >
        <i :class="currentPage.isFavorite ? 'pi pi-star-fill' : 'pi pi-star'"></i>
      </button>

      <!-- Properties Panel Toggle -->
      <button 
        class="btn btn-ghost btn-sm"
        @click="togglePropertiesPanel"
        :class="{ 'bg-surface-200': showPropertiesPanel }"
        title="Toggle properties panel (Ctrl+Shift+P)"
      >
        <i class="pi pi-bars"></i>
      </button>

      <!-- More Actions Menu -->
      <div class="relative">
        <button 
          class="btn btn-ghost btn-sm"
          @click="showMoreMenu = !showMoreMenu"
          title="More actions"
        >
          <i class="pi pi-ellipsis-h"></i>
        </button>

        <!-- More Actions Dropdown -->
        <Teleport to="body">
          <div
            v-if="showMoreMenu"
            class="fixed inset-0 z-50"
            @click="showMoreMenu = false"
          >
            <div
              class="absolute bg-surface-100 border border-border rounded-lg shadow-lg py-2 min-w-48"
              :style="moreMenuPosition"
              @click.stop
            >
              <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-text-primary">
                <i class="pi pi-copy mr-2 text-text-muted"></i>
                Duplicate
              </button>
              <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-text-primary">
                <i class="pi pi-download mr-2 text-text-muted"></i>
                Export
              </button>
              <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-text-primary">
                <i class="pi pi-history mr-2 text-text-muted"></i>
                Page History
              </button>
              <hr class="my-2 border-border">
              <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-text-primary">
                <i class="pi pi-arrows-alt mr-2 text-text-muted"></i>
                Move to
              </button>
              <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-text-primary">
                <i class="pi pi-lock mr-2 text-text-muted"></i>
                Lock Page
              </button>
              <hr class="my-2 border-border">
              <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-error">
                <i class="pi pi-trash mr-2"></i>
                Delete
              </button>
            </div>
          </div>
        </Teleport>
      </div>
    </div>

    <!-- Icon Picker Modal -->
    <Teleport to="body">
      <div
        v-if="showIconPicker"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click="showIconPicker = false"
      >
        <div
          class="bg-surface-100 rounded-lg p-6 max-w-md w-full mx-4"
          @click.stop
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-text-primary">Choose Icon</h3>
            <button
              class="btn btn-ghost btn-sm"
              @click="showIconPicker = false"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
          
          <div class="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
            <button
              v-for="icon in availableIcons"
              :key="icon"
              class="w-10 h-10 flex items-center justify-center hover:bg-surface-200 rounded transition-colors"
              @click="changePageIcon(icon)"
            >
              <i :class="icon" class="text-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
// Breadcrumb: { id, title, icon? }
// Page: { id, title, type, icon?, isFavorite?, parentId? }

// Inject layout state
const layoutState = inject('layoutState')

// Reactive state
const showMoreMenu = ref(false)
const showIconPicker = ref(false)
const isEditingTitle = ref(false)
const editedTitle = ref('')
const titleInput = ref()
const moreMenuPosition = ref({ top: '0px', right: '1rem' })

// Mock current page data (will be replaced with real data from stores)
const currentPage = ref({
  id: 'home',
  title: 'Home',
  type: 'page',
  icon: 'pi pi-home',
  isFavorite: false
})

// Mock breadcrumbs (will be computed from navigation state)
const breadcrumbs = ref([
  { id: 'workspace', title: 'My Workspace', icon: 'pi pi-home' },
  { id: 'home', title: 'Home' }
])

// Available icons for the icon picker
const availableIcons = [
  'pi pi-file', 'pi pi-folder', 'pi pi-star', 'pi pi-bookmark',
  'pi pi-heart', 'pi pi-flag', 'pi pi-home', 'pi pi-briefcase',
  'pi pi-calendar', 'pi pi-clock', 'pi pi-map', 'pi pi-globe',
  'pi pi-camera', 'pi pi-image', 'pi pi-video', 'pi pi-music',
  'pi pi-book', 'pi pi-graduation-cap', 'pi pi-trophy', 'pi pi-gift',
  'pi pi-shopping-cart', 'pi pi-credit-card', 'pi pi-chart-bar', 'pi pi-chart-line',
  'pi pi-users', 'pi pi-user', 'pi pi-phone', 'pi pi-envelope',
  'pi pi-cog', 'pi pi-wrench', 'pi pi-bug', 'pi pi-code'
]

// Computed
const showPropertiesPanel = computed(() => layoutState?.showPropertiesPanel?.value ?? true)

// Methods
const navigateToPage = (pageId) => {
  // TODO: Implement navigation
  console.log('Navigate to page:', pageId)
}

const startEditTitle = () => {
  isEditingTitle.value = true
  editedTitle.value = currentPage.value.title
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

const saveTitle = () => {
  if (editedTitle.value.trim() && editedTitle.value !== currentPage.value.title) {
    currentPage.value.title = editedTitle.value.trim()
    // TODO: Save to backend
  }
  isEditingTitle.value = false
}

const cancelEdit = () => {
  isEditingTitle.value = false
  editedTitle.value = currentPage.value.title
}

const toggleFavorite = () => {
  currentPage.value.isFavorite = !currentPage.value.isFavorite
  // TODO: Save to backend
}

const togglePropertiesPanel = () => {
  layoutState?.togglePropertiesPanel?.()
}

const shareePage = () => {
  // TODO: Implement sharing
  console.log('Share page')
}

const changePageIcon = (icon) => {
  currentPage.value.icon = icon
  showIconPicker.value = false
  // TODO: Save to backend
}

// Handle click outside to close menus
onClickOutside(templateRef, () => {
  showMoreMenu.value = false
  showIconPicker.value = false
})

// Keyboard shortcuts
const handleKeydown = (event) => {
  if (event.key === 'F2' && !isEditingTitle.value) {
    event.preventDefault()
    startEditTitle()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>