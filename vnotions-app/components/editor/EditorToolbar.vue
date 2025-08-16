<template>
  <div 
    class="editor-toolbar"
    :class="{ 
      'is-sticky': isSticky,
      'is-visible': isVisible 
    }"
  >
    <!-- Basic Formatting -->
    <div class="toolbar-group">
      <ToolbarButton
        :is-active="editor?.isActive('bold')"
        @click="toggleBold"
        title="Bold (Ctrl+B)"
        icon="pi-bold"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive('italic')"
        @click="toggleItalic"
        title="Italic (Ctrl+I)"
        icon="pi-italic"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive('underline')"
        @click="toggleUnderline"
        title="Underline (Ctrl+U)"
        icon="pi-underline"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive('strike')"
        @click="toggleStrike"
        title="Strikethrough"
        icon="pi-minus"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive('code')"
        @click="toggleCode"
        title="Inline Code"
        icon="pi-code"
      />
    </div>

    <div class="toolbar-divider" />

    <!-- Headings -->
    <div class="toolbar-group">
      <ToolbarDropdown
        :options="headingOptions"
        :current-value="getCurrentHeading()"
        @select="setHeading"
        placeholder="Paragraph"
        class="heading-dropdown"
      />
    </div>

    <div class="toolbar-divider" />

    <!-- Lists -->
    <div class="toolbar-group">
      <ToolbarButton
        :is-active="editor?.isActive('bulletList')"
        @click="toggleBulletList"
        title="Bullet List"
        icon="pi-list"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive('orderedList')"
        @click="toggleOrderedList"
        title="Numbered List"
        icon="pi-sort-numeric-up"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive('taskList')"
        @click="toggleTaskList"
        title="Todo List"
        icon="pi-check-square"
      />
    </div>

    <div class="toolbar-divider" />

    <!-- Text Alignment -->
    <div class="toolbar-group">
      <ToolbarButton
        :is-active="editor?.isActive({ textAlign: 'left' })"
        @click="() => setTextAlign('left')"
        title="Align Left"
        icon="pi-align-left"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive({ textAlign: 'center' })"
        @click="() => setTextAlign('center')"
        title="Align Center"
        icon="pi-align-center"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive({ textAlign: 'right' })"
        @click="() => setTextAlign('right')"
        title="Align Right"
        icon="pi-align-right"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive({ textAlign: 'justify' })"
        @click="() => setTextAlign('justify')"
        title="Justify"
        icon="pi-align-justify"
      />
    </div>

    <div class="toolbar-divider" />

    <!-- Block Elements -->
    <div class="toolbar-group">
      <ToolbarButton
        :is-active="editor?.isActive('blockquote')"
        @click="toggleBlockquote"
        title="Quote"
        icon="pi-quote-left"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive('codeBlock')"
        @click="toggleCodeBlock"
        title="Code Block"
        icon="pi-code"
      />
      
      <ToolbarButton
        @click="insertHorizontalRule"
        title="Divider"
        icon="pi-minus"
      />
    </div>

    <div class="toolbar-divider" />

    <!-- Text Color -->
    <div class="toolbar-group">
      <ToolbarColorPicker
        :current-color="getCurrentTextColor()"
        @select="setTextColor"
        title="Text Color"
      />
      
      <ToolbarButton
        :is-active="editor?.isActive('highlight')"
        @click="toggleHighlight"
        title="Highlight"
        icon="pi-palette"
      />
    </div>

    <div class="toolbar-divider" />

    <!-- Undo/Redo -->
    <div class="toolbar-group">
      <ToolbarButton
        :disabled="!editor?.can().undo()"
        @click="undo"
        title="Undo (Ctrl+Z)"
        icon="pi-undo"
      />
      
      <ToolbarButton
        :disabled="!editor?.can().redo()"
        @click="redo"
        title="Redo (Ctrl+Y)"
        icon="pi-refresh"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import ToolbarButton from './ToolbarButton.vue'
import ToolbarDropdown from './ToolbarDropdown.vue'
import ToolbarColorPicker from './ToolbarColorPicker.vue'

export interface EditorToolbarProps {
  editor: Editor | null
  isSticky?: boolean
}

const props = withDefaults(defineProps<EditorToolbarProps>(), {
  isSticky: false
})

// Reactive state
const isVisible = ref(true)

// Heading options for dropdown
const headingOptions = [
  { label: 'Paragraph', value: 'paragraph', command: () => props.editor?.chain().focus().setParagraph().run() },
  { label: 'Heading 1', value: 'h1', command: () => props.editor?.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2', value: 'h2', command: () => props.editor?.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3', value: 'h3', command: () => props.editor?.chain().focus().toggleHeading({ level: 3 }).run() },
]

// Basic formatting commands
const toggleBold = () => {
  props.editor?.chain().focus().toggleBold().run()
}

const toggleItalic = () => {
  props.editor?.chain().focus().toggleItalic().run()
}

const toggleUnderline = () => {
  props.editor?.chain().focus().toggleUnderline().run()
}

const toggleStrike = () => {
  props.editor?.chain().focus().toggleStrike().run()
}

const toggleCode = () => {
  props.editor?.chain().focus().toggleCode().run()
}

// Heading commands
const getCurrentHeading = () => {
  if (!props.editor) return 'paragraph'
  
  if (props.editor.isActive('heading', { level: 1 })) return 'h1'
  if (props.editor.isActive('heading', { level: 2 })) return 'h2'
  if (props.editor.isActive('heading', { level: 3 })) return 'h3'
  
  return 'paragraph'
}

const setHeading = (value: string) => {
  const option = headingOptions.find(opt => opt.value === value)
  option?.command()
}

// List commands
const toggleBulletList = () => {
  props.editor?.chain().focus().toggleBulletList().run()
}

const toggleOrderedList = () => {
  props.editor?.chain().focus().toggleOrderedList().run()
}

const toggleTaskList = () => {
  props.editor?.chain().focus().toggleTaskList().run()
}

// Text alignment commands
const setTextAlign = (alignment: string) => {
  props.editor?.chain().focus().setTextAlign(alignment).run()
}

// Block element commands
const toggleBlockquote = () => {
  props.editor?.chain().focus().toggleBlockquote().run()
}

const toggleCodeBlock = () => {
  props.editor?.chain().focus().toggleCodeBlock().run()
}

const insertHorizontalRule = () => {
  props.editor?.chain().focus().setHorizontalRule().run()
}

// Text color commands
const getCurrentTextColor = () => {
  if (!props.editor) return '#ffffff'
  return props.editor.getAttributes('textStyle').color || '#ffffff'
}

const setTextColor = (color: string) => {
  props.editor?.chain().focus().setColor(color).run()
}

const toggleHighlight = () => {
  props.editor?.chain().focus().toggleHighlight().run()
}

// History commands
const undo = () => {
  props.editor?.chain().focus().undo().run()
}

const redo = () => {
  props.editor?.chain().focus().redo().run()
}

// Keyboard shortcuts
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (!props.editor) return
    
    const isCtrl = e.ctrlKey || e.metaKey
    
    if (isCtrl) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          toggleBold()
          break
        case 'i':
          e.preventDefault()
          toggleItalic()
          break
        case 'u':
          e.preventDefault()
          toggleUnderline()
          break
        case 'z':
          if (e.shiftKey) {
            e.preventDefault()
            redo()
          } else {
            e.preventDefault()
            undo()
          }
          break
        case 'y':
          e.preventDefault()
          redo()
          break
      }
    }
  }
  
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})
</script>

<style lang="scss">
.editor-toolbar {
  @apply flex items-center gap-1 p-2 bg-surface-50 border-b border-border-color;
  @apply transition-all duration-200 ease-out;
  
  &.is-sticky {
    @apply sticky top-0 z-10;
  }
  
  &.is-visible {
    @apply opacity-100 translate-y-0;
  }
  
  .toolbar-group {
    @apply flex items-center gap-1;
  }
  
  .toolbar-divider {
    @apply w-px h-6 bg-border-color mx-2;
  }
  
  .heading-dropdown {
    @apply min-w-32;
  }
}

// Toolbar Button Component
.toolbar-button {
  @apply flex items-center justify-center w-8 h-8 rounded-md;
  @apply text-text-secondary hover:text-text-primary hover:bg-surface-100;
  @apply transition-all duration-150 ease-out cursor-pointer;
  @apply border border-transparent;
  
  &.is-active {
    @apply text-accent-primary bg-accent-primary bg-opacity-10 border-accent-primary border-opacity-20;
  }
  
  &:disabled {
    @apply text-text-disabled cursor-not-allowed hover:bg-transparent hover:text-text-disabled;
  }
  
  &:hover:not(:disabled) {
    @apply bg-surface-100;
  }
  
  i {
    @apply text-sm;
  }
}

// Toolbar Dropdown Component
.toolbar-dropdown {
  @apply relative;
  
  .dropdown-trigger {
    @apply flex items-center gap-2 px-3 py-1.5 rounded-md;
    @apply text-text-primary bg-surface-100 hover:bg-surface-200;
    @apply border border-border-color cursor-pointer;
    @apply transition-all duration-150 ease-out;
    
    &:hover {
      @apply border-accent-primary border-opacity-50;
    }
    
    .dropdown-icon {
      @apply text-xs text-text-muted transition-transform duration-150;
    }
    
    &.is-open .dropdown-icon {
      @apply rotate-180;
    }
  }
  
  .dropdown-menu {
    @apply absolute top-full left-0 mt-1 min-w-full;
    @apply bg-surface-0 border border-border-color rounded-md shadow-lg;
    @apply py-1 z-50;
    
    .dropdown-item {
      @apply px-3 py-2 text-text-primary hover:bg-surface-100 cursor-pointer;
      @apply transition-colors duration-150 ease-out;
      
      &.is-active {
        @apply text-accent-primary bg-accent-primary bg-opacity-10;
      }
    }
  }
}

// Toolbar Color Picker Component
.toolbar-color-picker {
  @apply relative;
  
  .color-trigger {
    @apply flex items-center justify-center w-8 h-8 rounded-md cursor-pointer;
    @apply border border-border-color hover:border-accent-primary hover:border-opacity-50;
    @apply transition-all duration-150 ease-out;
    
    .color-preview {
      @apply w-4 h-4 rounded border border-border-color;
    }
  }
  
  .color-menu {
    @apply absolute top-full right-0 mt-1;
    @apply bg-surface-0 border border-border-color rounded-md shadow-lg;
    @apply p-2 z-50 grid grid-cols-6 gap-1;
    
    .color-option {
      @apply w-6 h-6 rounded cursor-pointer border-2 border-transparent;
      @apply hover:scale-110 transition-transform duration-150;
      
      &.is-selected {
        @apply border-text-primary;
      }
    }
  }
}
</style>