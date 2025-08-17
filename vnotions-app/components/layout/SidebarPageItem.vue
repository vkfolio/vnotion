<template>
  <div>
    <!-- Page Item -->
    <div 
      class="nav-item group"
      :class="{ 'active': currentPageId === page.id }"
      :style="{ paddingLeft: `${(level * 1.5) + 1}rem` }"
      @click="$emit('navigate', page.id)"
    >
      <!-- Expand/Collapse Button -->
      <button
        v-if="page.children && page.children.length > 0"
        class="w-4 h-4 flex items-center justify-center mr-1 hover:bg-surface-200 rounded-sm transition-colors"
        @click.stop="$emit('toggle-expand', page.id)"
      >
        <i 
          class="pi text-xs text-text-muted transition-transform"
          :class="isExpanded ? 'pi-chevron-down' : 'pi-chevron-right'"
        ></i>
      </button>
      <div v-else class="w-4 mr-1"></div>

      <!-- Page Icon -->
      <i :class="getPageIcon(page.type, page.icon)" class="nav-icon"></i>

      <!-- Page Title -->
      <span class="nav-text">{{ page.title }}</span>

      <!-- Actions Menu (visible on hover) -->
      <div class="opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex items-center space-x-1">
        <button
          class="w-5 h-5 flex items-center justify-center hover:bg-surface-200 rounded-sm transition-colors"
          @click.stop="$emit('create-child', page.id)"
          title="Add a page inside"
        >
          <i class="pi pi-plus text-xs text-text-muted"></i>
        </button>
        
        <button
          class="w-5 h-5 flex items-center justify-center hover:bg-surface-200 rounded-sm transition-colors"
          @click.stop="showPageMenu = !showPageMenu"
          title="More actions"
        >
          <i class="pi pi-ellipsis-h text-xs text-text-muted"></i>
        </button>
      </div>
    </div>

    <!-- Children Pages (if expanded) -->
    <div v-if="isExpanded && page.children && page.children.length > 0">
      <SidebarPageItem
        v-for="child in page.children"
        :key="child.id"
        :page="child"
        :current-page-id="currentPageId"
        :expanded-pages="expandedPages"
        :level="level + 1"
        @navigate="$emit('navigate', $event)"
        @toggle-expand="$emit('toggle-expand', $event)"
        @create-child="$emit('create-child', $event)"
      />
    </div>

    <!-- Page Context Menu -->
    <Teleport to="body">
      <div
        v-if="showPageMenu"
        class="fixed inset-0 z-50"
        @click="showPageMenu = false"
      >
        <div
          class="absolute bg-surface-100 border border-border rounded-lg shadow-lg py-2 min-w-48"
          :style="menuPosition"
          @click.stop
        >
          <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-text-primary">
            <i class="pi pi-copy mr-2 text-text-muted"></i>
            Duplicate
          </button>
          <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-text-primary">
            <i class="pi pi-star mr-2 text-text-muted"></i>
            Add to Favorites
          </button>
          <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-text-primary">
            <i class="pi pi-share-alt mr-2 text-text-muted"></i>
            Copy Link
          </button>
          <hr class="my-2 border-border">
          <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-text-primary">
            <i class="pi pi-pencil mr-2 text-text-muted"></i>
            Rename
          </button>
          <button class="w-full px-4 py-2 text-left hover:bg-surface-200 transition-colors text-sm text-text-primary">
            <i class="pi pi-arrows-alt mr-2 text-text-muted"></i>
            Move to
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
</template>

<script setup>
// Page: { id, title, type, icon?, children?, isFavorite?, createdAt, updatedAt }
// Props: { page, currentPageId, expandedPages, level? }
// Emits: { navigate, toggleExpand, createChild }

const props = withDefaults(defineProps(), {
  level: 0
})

defineEmits([])

// Reactive state
const showPageMenu = ref(false)
const menuPosition = ref({ top: '0px', left: '0px' })

// Computed
const isExpanded = computed(() => props.expandedPages.has(props.page.id))

// Methods
const getPageIcon = (type, icon?) => {
  if (icon) return icon
  return type === 'database' ? 'pi pi-table nav-icon' : 'pi pi-file nav-icon'
}

// Handle menu positioning
const updateMenuPosition = (event) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  menuPosition.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`
  }
}

// Watch for menu visibility changes to position it correctly
watch(showPageMenu, (isVisible) => {
  if (isVisible) {
    nextTick(() => {
      // Position menu near the clicked element
      // This is a simplified positioning - in a real app you'd want more sophisticated logic
    })
  }
})
</script>