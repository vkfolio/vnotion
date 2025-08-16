<template>
  <div class="h-full flex flex-col">
    <!-- Panel Header -->
    <div class="p-4 border-b border-border flex items-center justify-between">
      <h3 class="text-sm font-semibold text-text-primary">Page Properties</h3>
      <button 
        class="btn btn-ghost btn-sm p-1"
        @click="$emit('close')"
        title="Close properties panel"
      >
        <i class="pi pi-times text-sm"></i>
      </button>
    </div>

    <!-- Properties Content -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-4 space-y-6">
        
        <!-- Page Information -->
        <div>
          <h4 class="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
            Page Information
          </h4>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Title</label>
              <input
                v-model="pageProperties.title"
                class="input"
                placeholder="Page title"
                @input="updateProperty('title', $event.target.value)"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Description</label>
              <textarea
                v-model="pageProperties.description"
                class="input resize-none"
                rows="3"
                placeholder="Add a description..."
                @input="updateProperty('description', $event.target.value)"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Tags</label>
              <div class="flex flex-wrap gap-2 mb-2">
                <span
                  v-for="tag in pageProperties.tags"
                  :key="tag"
                  class="inline-flex items-center px-2 py-1 rounded-md bg-surface-200 text-text-primary text-xs"
                >
                  {{ tag }}
                  <button
                    class="ml-1 hover:text-error"
                    @click="removeTag(tag)"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </span>
              </div>
              <input
                v-model="newTag"
                class="input"
                placeholder="Add a tag..."
                @keydown.enter="addTag"
                @keydown.comma.prevent="addTag"
              />
            </div>
          </div>
        </div>

        <!-- Page Status -->
        <div>
          <h4 class="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
            Status
          </h4>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Status</label>
              <select
                v-model="pageProperties.status"
                class="input"
                @change="updateProperty('status', $event.target.value)"
              >
                <option value="draft">Draft</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Priority</label>
              <select
                v-model="pageProperties.priority"
                class="input"
                @change="updateProperty('priority', $event.target.value)"
              >
                <option value="">No priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div class="flex items-center space-x-2">
              <input
                id="favorite-checkbox"
                v-model="pageProperties.isFavorite"
                type="checkbox"
                class="w-4 h-4 text-accent-primary bg-surface-100 border-border rounded focus:ring-accent-primary focus:ring-2"
                @change="updateProperty('isFavorite', $event.target.checked)"
              />
              <label for="favorite-checkbox" class="text-sm text-text-primary cursor-pointer">
                Add to favorites
              </label>
            </div>
          </div>
        </div>

        <!-- Dates -->
        <div>
          <h4 class="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
            Dates
          </h4>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Created</label>
              <div class="text-sm text-text-secondary">
                {{ formatDate(pageProperties.createdAt) }}
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Last edited</label>
              <div class="text-sm text-text-secondary">
                {{ formatDate(pageProperties.updatedAt) }}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Due date</label>
              <input
                v-model="pageProperties.dueDate"
                type="date"
                class="input"
                @change="updateProperty('dueDate', $event.target.value)"
              />
            </div>
          </div>
        </div>

        <!-- Custom Properties -->
        <div v-if="customProperties.length > 0">
          <h4 class="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
            Custom Properties
          </h4>
          <div class="space-y-3">
            <div
              v-for="property in customProperties"
              :key="property.id"
            >
              <label class="block text-sm font-medium text-text-primary mb-1">
                {{ property.name }}
              </label>
              
              <!-- Text Property -->
              <input
                v-if="property.type === 'text'"
                v-model="pageProperties.customValues[property.id]"
                class="input"
                :placeholder="property.placeholder"
                @input="updateCustomProperty(property.id, $event.target.value)"
              />
              
              <!-- Number Property -->
              <input
                v-else-if="property.type === 'number'"
                v-model="pageProperties.customValues[property.id]"
                type="number"
                class="input"
                :placeholder="property.placeholder"
                @input="updateCustomProperty(property.id, $event.target.value)"
              />
              
              <!-- Select Property -->
              <select
                v-else-if="property.type === 'select'"
                v-model="pageProperties.customValues[property.id]"
                class="input"
                @change="updateCustomProperty(property.id, $event.target.value)"
              >
                <option value="">Select an option</option>
                <option
                  v-for="option in property.options"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
              
              <!-- Date Property -->
              <input
                v-else-if="property.type === 'date'"
                v-model="pageProperties.customValues[property.id]"
                type="date"
                class="input"
                @change="updateCustomProperty(property.id, $event.target.value)"
              />
              
              <!-- Checkbox Property -->
              <div v-else-if="property.type === 'checkbox'" class="flex items-center space-x-2">
                <input
                  :id="`custom-${property.id}`"
                  v-model="pageProperties.customValues[property.id]"
                  type="checkbox"
                  class="w-4 h-4 text-accent-primary bg-surface-100 border-border rounded focus:ring-accent-primary focus:ring-2"
                  @change="updateCustomProperty(property.id, $event.target.checked)"
                />
                <label :for="`custom-${property.id}`" class="text-sm text-text-primary cursor-pointer">
                  {{ property.placeholder || 'Enabled' }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Page Statistics -->
        <div>
          <h4 class="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
            Statistics
          </h4>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Word count</span>
              <span class="text-text-primary">{{ pageStats.wordCount }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Character count</span>
              <span class="text-text-primary">{{ pageStats.charCount }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Reading time</span>
              <span class="text-text-primary">{{ pageStats.readingTime }} min</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Last viewed</span>
              <span class="text-text-primary">{{ formatDate(pageStats.lastViewed) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CustomProperty {
  id: string
  name: string
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox'
  placeholder?: string
  options?: string[]
}

interface PageProperties {
  title: string
  description: string
  tags: string[]
  status: string
  priority: string
  isFavorite: boolean
  createdAt: Date
  updatedAt: Date
  dueDate: string
  customValues: Record<string, any>
}

interface PageStats {
  wordCount: number
  charCount: number
  readingTime: number
  lastViewed: Date
}

defineEmits<{
  close: []
}>()

// Reactive state
const newTag = ref('')

// Mock data (will be replaced with real data from stores)
const pageProperties = ref<PageProperties>({
  title: 'Home',
  description: 'Welcome to your workspace',
  tags: ['important', 'workspace'],
  status: 'published',
  priority: 'medium',
  isFavorite: false,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date(),
  dueDate: '',
  customValues: {}
})

const customProperties = ref<CustomProperty[]>([
  {
    id: 'project',
    name: 'Project',
    type: 'select',
    options: ['Project Alpha', 'Project Beta', 'Personal']
  },
  {
    id: 'difficulty',
    name: 'Difficulty',
    type: 'select',
    options: ['Easy', 'Medium', 'Hard']
  },
  {
    id: 'estimated-hours',
    name: 'Estimated Hours',
    type: 'number',
    placeholder: 'Hours'
  },
  {
    id: 'is-public',
    name: 'Public',
    type: 'checkbox',
    placeholder: 'Make this page public'
  }
])

const pageStats = ref<PageStats>({
  wordCount: 1250,
  charCount: 8420,
  readingTime: 5,
  lastViewed: new Date()
})

// Methods
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const updateProperty = (key: keyof PageProperties, value: any) => {
  (pageProperties.value as any)[key] = value
  // TODO: Debounce and save to backend
  console.log('Update property:', key, value)
}

const updateCustomProperty = (propertyId: string, value: any) => {
  pageProperties.value.customValues[propertyId] = value
  // TODO: Debounce and save to backend
  console.log('Update custom property:', propertyId, value)
}

const addTag = () => {
  const tag = newTag.value.trim().replace(',', '')
  if (tag && !pageProperties.value.tags.includes(tag)) {
    pageProperties.value.tags.push(tag)
    newTag.value = ''
    updateProperty('tags', pageProperties.value.tags)
  }
}

const removeTag = (tag: string) => {
  const index = pageProperties.value.tags.indexOf(tag)
  if (index > -1) {
    pageProperties.value.tags.splice(index, 1)
    updateProperty('tags', pageProperties.value.tags)
  }
}

// Initialize custom property values
onMounted(() => {
  customProperties.value.forEach(property => {
    if (!(property.id in pageProperties.value.customValues)) {
      pageProperties.value.customValues[property.id] = property.type === 'checkbox' ? false : ''
    }
  })
})
</script>