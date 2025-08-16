<template>
  <!-- Modal overlay -->
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="modal-overlay"
      @click="handleOverlayClick"
    >
      <!-- Modal content -->
      <div
        class="modal-content"
        @click.stop
      >
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">Create New Page</h2>
          <button
            class="modal-close"
            @click="close"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <!-- Page icon selection -->
          <div class="form-group">
            <label class="form-label">Icon</label>
            <div class="icon-selector">
              <!-- Current icon display -->
              <button
                type="button"
                class="icon-current"
                @click="showIconPicker = !showIconPicker"
              >
                {{ form.icon }}
              </button>

              <!-- Icon picker dropdown -->
              <div v-if="showIconPicker" class="icon-picker">
                <div class="icon-picker-grid">
                  <button
                    v-for="icon in commonIcons"
                    :key="icon"
                    type="button"
                    class="icon-option"
                    :class="{ 'is-selected': form.icon === icon }"
                    @click="selectIcon(icon)"
                  >
                    {{ icon }}
                  </button>
                </div>
                <div class="icon-picker-custom">
                  <input
                    v-model="customIcon"
                    type="text"
                    placeholder="Enter any emoji..."
                    class="icon-input"
                    @keyup.enter="selectIcon(customIcon)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Page title -->
          <div class="form-group">
            <label for="page-title" class="form-label">Title</label>
            <input
              id="page-title"
              v-model="form.title"
              type="text"
              class="form-input"
              placeholder="Enter page title..."
              required
              autofocus
            />
          </div>

          <!-- Parent page selection -->
          <div class="form-group">
            <label for="parent-page" class="form-label">
              Location
              <span class="form-label-optional">(optional)</span>
            </label>
            <select
              id="parent-page"
              v-model="form.parent"
              class="form-select"
            >
              <option value="">📄 Root level</option>
              <option
                v-for="page in availableParents"
                :key="page.id"
                :value="page.id"
              >
                {{ '  '.repeat(getPageDepth(page.id)) }}{{ page.icon }} {{ page.title }}
              </option>
            </select>
          </div>

          <!-- Template selection -->
          <div class="form-group">
            <label class="form-label">
              Template
              <span class="form-label-optional">(optional)</span>
            </label>
            <div class="template-grid">
              <button
                v-for="template in templates"
                :key="template.id"
                type="button"
                class="template-option"
                :class="{ 'is-selected': form.template === template.id }"
                @click="selectTemplate(template)"
              >
                <div class="template-icon">{{ template.icon }}</div>
                <div class="template-name">{{ template.name }}</div>
                <div class="template-description">{{ template.description }}</div>
              </button>
            </div>
          </div>

          <!-- Properties (if template has custom properties) -->
          <div v-if="selectedTemplate && selectedTemplate.properties" class="form-group">
            <label class="form-label">Properties</label>
            <div class="properties-list">
              <div
                v-for="property in selectedTemplate.properties"
                :key="property.name"
                class="property-item"
              >
                <label class="property-label">{{ property.label }}</label>
                <input
                  v-if="property.type === 'text'"
                  v-model="form.properties[property.name]"
                  type="text"
                  class="property-input"
                  :placeholder="property.placeholder"
                />
                <input
                  v-else-if="property.type === 'number'"
                  v-model="form.properties[property.name]"
                  type="number"
                  class="property-input"
                  :placeholder="property.placeholder"
                />
                <select
                  v-else-if="property.type === 'select'"
                  v-model="form.properties[property.name]"
                  class="property-input"
                >
                  <option value="">Select...</option>
                  <option
                    v-for="option in property.options"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <input
                  v-else-if="property.type === 'date'"
                  v-model="form.properties[property.name]"
                  type="date"
                  class="property-input"
                />
                <label
                  v-else-if="property.type === 'checkbox'"
                  class="property-checkbox"
                >
                  <input
                    v-model="form.properties[property.name]"
                    type="checkbox"
                    class="checkbox-input"
                  />
                  <span class="checkbox-label">{{ property.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button
              type="button"
              class="btn-secondary"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary"
              :disabled="!form.title.trim() || isCreating"
            >
              {{ isCreating ? 'Creating...' : 'Create Page' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useWorkspaceStore } from '~/stores/workspace.js'
import { usePagesStore } from '~/stores/pages.js'

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  defaultParent: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits(['close', 'created'])

// Stores
const workspaceStore = useWorkspaceStore()
const pagesStore = usePagesStore()

// State
const isCreating = ref(false)
const showIconPicker = ref(false)
const customIcon = ref('')

const form = ref({
  title: '',
  icon: '📄',
  parent: props.defaultParent || '',
  template: '',
  properties: {}
})

// Common icons for quick selection
const commonIcons = [
  '📄', '📝', '📋', '📊', '📈', '📉', '📌', '📍', '📎', '📁',
  '💡', '⭐', '🎯', '🚀', '🔥', '💎', '🌟', '🎨', '🔧', '⚙️',
  '📱', '💻', '🖥️', '⌚', '🎮', '🎵', '🎬', '📷', '🗂️', '📚'
]

// Default templates
const templates = ref([
  {
    id: 'blank',
    name: 'Blank Page',
    description: 'Start with an empty page',
    icon: '📄',
    content: {
      type: 'doc',
      content: []
    },
    properties: null
  },
  {
    id: 'note',
    name: 'Note',
    description: 'Simple note with title and content',
    icon: '📝',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Note Title' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Start writing your note here...' }]
        }
      ]
    },
    properties: null
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    description: 'Template for meeting notes',
    icon: '🗣️',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Meeting Notes' }]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Attendees' }]
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Add attendee names here' }]
                }
              ]
            }
          ]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Agenda' }]
        },
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Add agenda items here' }]
                }
              ]
            }
          ]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Notes' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Meeting discussion notes...' }]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Action Items' }]
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Add action items here' }]
                }
              ]
            }
          ]
        }
      ]
    },
    properties: [
      {
        name: 'date',
        label: 'Meeting Date',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'duration',
        label: 'Duration (minutes)',
        type: 'number',
        placeholder: '60'
      }
    ]
  },
  {
    id: 'task',
    name: 'Task',
    description: 'Task with checklist and priority',
    icon: '✅',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Task' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Task description...' }]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Checklist' }]
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Add checklist items here' }]
                }
              ]
            }
          ]
        }
      ]
    },
    properties: [
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' }
        ]
      },
      {
        name: 'dueDate',
        label: 'Due Date',
        type: 'date',
        placeholder: ''
      },
      {
        name: 'completed',
        label: 'Completed',
        type: 'checkbox'
      }
    ]
  }
])

// Computed
const availableParents = computed(() => {
  const pages = Array.from(workspaceStore.structure.pages.values())
  return pages
    .filter(page => !page.deleted)
    .sort((a, b) => a.title.localeCompare(b.title))
})

const selectedTemplate = computed(() => {
  return templates.value.find(t => t.id === form.value.template)
})

// Methods
const selectIcon = (icon) => {
  form.value.icon = icon
  showIconPicker.value = false
  customIcon.value = ''
}

const selectTemplate = (template) => {
  form.value.template = template.id
  
  // Reset properties
  form.value.properties = {}
  
  // Initialize properties with default values
  if (template.properties) {
    template.properties.forEach(prop => {
      if (prop.type === 'checkbox') {
        form.value.properties[prop.name] = false
      } else {
        form.value.properties[prop.name] = ''
      }
    })
  }
}

const getPageDepth = (pageId) => {
  return pagesStore.getPageDepth(pageId)
}

const handleOverlayClick = () => {
  close()
}

const close = () => {
  // Reset form
  form.value = {
    title: '',
    icon: '📄',
    parent: props.defaultParent || '',
    template: '',
    properties: {}
  }
  showIconPicker.value = false
  customIcon.value = ''
  
  emit('close')
}

const handleSubmit = async () => {
  if (!form.value.title.trim()) return

  isCreating.value = true

  try {
    const template = selectedTemplate.value
    const pageOptions = {
      title: form.value.title.trim(),
      icon: form.value.icon,
      parent: form.value.parent || null,
      properties: { ...form.value.properties }
    }

    // Apply template content if selected
    if (template && template.content) {
      pageOptions.content = template.content
    }

    // Create the page
    const createdPage = await pagesStore.createPage(pageOptions)

    emit('created', createdPage)
    close()
  } catch (error) {
    console.error('Failed to create page:', error)
    // Show error notification
  } finally {
    isCreating.value = false
  }
}

// Watch for visibility changes to focus input
watch(() => props.isVisible, async (isVisible) => {
  if (isVisible) {
    await nextTick()
    const titleInput = document.getElementById('page-title')
    if (titleInput) {
      titleInput.focus()
    }
  }
})

// Watch for default parent changes
watch(() => props.defaultParent, (newParent) => {
  form.value.parent = newParent || ''
})
</script>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center;
  @apply bg-black bg-opacity-50 backdrop-blur-sm;
}

.modal-content {
  @apply bg-white dark:bg-gray-900 rounded-lg shadow-xl;
  @apply w-full max-w-md max-h-[90vh] overflow-y-auto;
  @apply mx-4;
}

.modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700;
}

.modal-title {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100;
}

.modal-close {
  @apply p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300;
  @apply transition-colors;
}

.form-group {
  @apply mb-6;
}

.form-label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2;
}

.form-label-optional {
  @apply text-gray-500 dark:text-gray-400 font-normal;
}

.form-input,
.form-select {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600;
  @apply rounded-md shadow-sm bg-white dark:bg-gray-800;
  @apply text-gray-900 dark:text-gray-100;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
  @apply transition-colors;
}

.icon-selector {
  @apply relative;
}

.icon-current {
  @apply w-12 h-12 bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600;
  @apply rounded-md flex items-center justify-center text-xl;
  @apply hover:border-gray-400 dark:hover:border-gray-500 transition-colors;
}

.icon-picker {
  @apply absolute top-14 left-0 z-10 bg-white dark:bg-gray-800;
  @apply border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg;
  @apply p-3 w-64;
}

.icon-picker-grid {
  @apply grid grid-cols-8 gap-1 mb-3;
}

.icon-option {
  @apply w-8 h-8 flex items-center justify-center rounded;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors;
}

.icon-option.is-selected {
  @apply bg-blue-100 dark:bg-blue-900;
}

.icon-picker-custom {
  @apply pt-2 border-t border-gray-200 dark:border-gray-700;
}

.icon-input {
  @apply w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600;
  @apply rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100;
}

.template-grid {
  @apply grid grid-cols-1 gap-3;
}

.template-option {
  @apply p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg;
  @apply hover:border-gray-300 dark:hover:border-gray-600 transition-colors;
  @apply text-left;
}

.template-option.is-selected {
  @apply border-blue-500 bg-blue-50 dark:bg-blue-900/20;
}

.template-icon {
  @apply text-xl mb-2;
}

.template-name {
  @apply font-medium text-gray-900 dark:text-gray-100 mb-1;
}

.template-description {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

.properties-list {
  @apply space-y-4;
}

.property-item {
  @apply space-y-1;
}

.property-label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
}

.property-input {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600;
  @apply rounded-md bg-white dark:bg-gray-800;
  @apply text-gray-900 dark:text-gray-100;
}

.property-checkbox {
  @apply flex items-center space-x-2;
}

.checkbox-input {
  @apply rounded border-gray-300 dark:border-gray-600;
}

.checkbox-label {
  @apply text-sm text-gray-700 dark:text-gray-300;
}

.modal-actions {
  @apply flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700;
}

.btn-secondary {
  @apply px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600;
  @apply rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors;
}

.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md;
  @apply hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-colors;
}

form {
  @apply p-6;
}
</style>