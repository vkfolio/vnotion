<template>
  <div class="vn-editor" :class="{ 'is-focused': isFocused }">
    <!-- Editor Toolbar -->
    <EditorToolbar 
      v-if="showToolbar"
      :editor="editor"
      :is-sticky="stickyToolbar"
      class="editor-toolbar"
    />

    <!-- Editor Content -->
    <div class="editor-container" ref="editorContainer">
      <EditorContent 
        :editor="editor" 
        class="editor-content"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      
      <!-- Slash Commands Menu -->
      <SlashCommands 
        v-if="showSlashMenu"
        :editor="editor"
        :position="slashMenuPosition"
        @close="hideSlashMenu"
        @select="handleSlashCommand"
      />
    </div>

    <!-- Character Count (optional) -->
    <div 
      v-if="showCharacterCount && editor" 
      class="character-count"
    >
      {{ editor.storage.characterCount.characters() }} characters
    </div>
  </div>
</template>

<script setup>
import { Editor, EditorContent, Extension } from '@tiptap/vue-3'
import { StarterKit } from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { CharacterCount } from '@tiptap/extension-character-count'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { CodeBlock } from '@tiptap/extension-code-block'
import { Highlight } from '@tiptap/extension-highlight'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { Focus } from '@tiptap/extension-focus'
import { Dropcursor } from '@tiptap/extension-dropcursor'
import { Gapcursor } from '@tiptap/extension-gapcursor'

import EditorToolbar from './EditorToolbar.vue'
import SlashCommands from './SlashCommands.vue'

const props = withDefaults(defineProps(), {
  modelValue: '',
  placeholder: 'Start writing...',
  showToolbar: true,
  stickyToolbar: false,
  showCharacterCount: false,
  autoSave: true,
  autoSaveDelay: 1000,
  editable: true
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'ready'])

// Reactive state
const isFocused = ref(false)
const showSlashMenu = ref(false)
const slashMenuPosition = ref({ x: 0, y: 0 })
const editorContainer = ref()

// Auto-save functionality
let autoSaveTimeout = null

const debouncedSave = (content) => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }
  
  autoSaveTimeout = setTimeout(() => {
    props.onUpdate?.(content)
    emit('update:modelValue', content)
  }, props.autoSaveDelay)
}

// Slash command extension
const SlashCommandExtension = Extension.create({
  name: 'slashCommands',
  
  addKeyboardShortcuts() {
    return {
      '/': ({ editor }) => {
        const { selection } = editor.state
        const { $anchor } = selection
        
        // Only show slash menu at start of line or after space
        const beforeText = $anchor.nodeBefore?.textContent || ''
        const isStartOfLine = $anchor.parentOffset === 0
        const afterSpace = beforeText.endsWith(' ')
        
        if (isStartOfLine || afterSpace) {
          const coords = editor.view.coordsAtPos(selection.from)
          slashMenuPosition.value = {
            x: coords.left,
            y: coords.bottom
          }
          showSlashMenu.value = true
        }
        
        return false // Let the '/' character be inserted
      },
      
      'Escape': () => {
        if (showSlashMenu.value) {
          hideSlashMenu()
          return true
        }
        return false
      }
    }
  }
})

// TipTap Editor instance
const editor = new Editor({
  content: props.modelValue,
  editable: props.editable,
  
  extensions: [
    StarterKit.configure({
      codeBlock: false, // We'll use our custom code block
    }),
    
    Placeholder.configure({
      placeholder: props.placeholder,
      showOnlyWhenEditable: true,
      showOnlyCurrent: false,
    }),
    
    CharacterCount,
    
    TaskList.configure({
      HTMLAttributes: {
        class: 'task-list',
      },
    }),
    
    TaskItem.configure({
      HTMLAttributes: {
        class: 'task-item',
      },
      nested: true,
    }),
    
    CodeBlock.configure({
      HTMLAttributes: {
        class: 'code-block',
      },
    }),
    
    Highlight.configure({
      HTMLAttributes: {
        class: 'highlight',
      },
    }),
    
    Underline,
    
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    
    Color.configure({
      types: ['textStyle'],
    }),
    
    TextStyle,
    
    Focus.configure({
      className: 'has-focus',
      mode: 'all',
    }),
    
    Dropcursor.configure({
      color: 'var(--accent-primary)',
      width: 2,
    }),
    
    Gapcursor,
    
    SlashCommandExtension,
  ],
  
  editorProps: {
    attributes: {
      class: 'prose prose-invert max-w-none focus:outline-none',
    },
  },
  
  onUpdate: ({ editor }) => {
    const content = editor.getHTML()
    
    if (props.autoSave) {
      debouncedSave(content)
    } else {
      emit('update:modelValue', content)
    }
  },
  
  onFocus: () => {
    isFocused.value = true
    emit('focus')
    props.onFocus?.()
  },
  
  onBlur: () => {
    isFocused.value = false
    emit('blur')
    props.onBlur?.()
    hideSlashMenu()
  },
  
  onCreate: ({ editor }) => {
    emit('ready', editor)
    props.onReady?.(editor)
  },
})

// Event handlers
const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
  hideSlashMenu()
}

const hideSlashMenu = () => {
  showSlashMenu.value = false
}

const handleSlashCommand = (command) => {
  if (!editor) return
  
  // Remove the '/' character and execute command
  const { selection } = editor.state
  const { from, to } = selection
  
  // Find and delete the '/' that triggered the menu
  const beforeText = editor.state.doc.textBetween(Math.max(0, from - 10), from)
  const slashIndex = beforeText.lastIndexOf('/')
  
  if (slashIndex !== -1) {
    const deleteFrom = from - (beforeText.length - slashIndex)
    editor.chain()
      .deleteRange({ from: deleteFrom, to: from })
      .run()
  }
  
  // Execute the command
  executeSlashCommand(command)
  hideSlashMenu()
}

const executeSlashCommand = (command) => {
  if (!editor) return
  
  switch (command) {
    case 'h1':
      editor.chain().focus().toggleHeading({ level: 1 }).run()
      break
    case 'h2':
      editor.chain().focus().toggleHeading({ level: 2 }).run()
      break
    case 'h3':
      editor.chain().focus().toggleHeading({ level: 3 }).run()
      break
    case 'bullet':
      editor.chain().focus().toggleBulletList().run()
      break
    case 'number':
      editor.chain().focus().toggleOrderedList().run()
      break
    case 'todo':
      editor.chain().focus().toggleTaskList().run()
      break
    case 'code':
      editor.chain().focus().toggleCodeBlock().run()
      break
    case 'quote':
      editor.chain().focus().toggleBlockquote().run()
      break
    case 'divider':
      editor.chain().focus().setHorizontalRule().run()
      break
    case 'callout':
      // Custom callout implementation will be added
      console.log('Callout block - to be implemented')
      break
    case 'toggle':
      // Custom toggle implementation will be added
      console.log('Toggle block - to be implemented')
      break
  }
}

// Watch for external content changes
watch(() => props.modelValue, (newValue) => {
  if (editor && editor.getHTML() !== newValue) {
    editor.commands.setContent(newValue, false)
  }
})

// Watch for editable changes
watch(() => props.editable, (newValue) => {
  if (editor) {
    editor.setEditable(newValue)
  }
})

// Cleanup
onBeforeUnmount(() => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }
  editor?.destroy()
})

// Expose editor instance to parent
defineExpose({
  editor
})
</script>

<style lang="scss">
.vn-editor {
  @apply relative w-full;
  
  &.is-focused {
    .editor-toolbar {
      @apply opacity-100;
    }
  }
  
  .editor-container {
    @apply relative;
  }
  
  .editor-content {
    @apply w-full min-h-96;
    
    .ProseMirror {
      @apply outline-none p-4 text-text-primary;
      min-height: 200px;
      
      // Placeholder styles
      .is-editor-empty:first-child::before {
        content: attr(data-placeholder);
        @apply text-text-muted pointer-events-none float-left h-0;
      }
      
      // Heading styles
      h1, h2, h3, h4, h5, h6 {
        @apply font-bold text-text-primary mt-6 mb-4 first:mt-0;
        line-height: 1.2;
      }
      
      h1 {
        @apply text-3xl;
      }
      
      h2 {
        @apply text-2xl;
      }
      
      h3 {
        @apply text-xl;
      }
      
      // Paragraph styles
      p {
        @apply text-text-primary mb-4 leading-relaxed;
        
        &:last-child {
          @apply mb-0;
        }
      }
      
      // List styles
      ul, ol {
        @apply pl-6 mb-4;
        
        li {
          @apply mb-2;
          
          &::marker {
            @apply text-text-secondary;
          }
        }
      }
      
      // Task list styles
      .task-list {
        @apply list-none pl-0;
        
        .task-item {
          @apply flex items-start mb-2;
          
          label {
            @apply flex items-center cursor-pointer;
            
            input[type="checkbox"] {
              @apply mr-2 rounded border-border-color bg-surface-100;
              @apply checked:bg-accent-primary checked:border-accent-primary;
            }
          }
          
          > div {
            @apply flex-1;
          }
        }
      }
      
      // Code styles
      code {
        @apply bg-surface-100 text-accent-primary px-1 py-0.5 rounded text-sm font-mono;
      }
      
      pre {
        @apply bg-surface-100 border border-border-color rounded-lg p-4 mb-4 overflow-x-auto;
        
        code {
          @apply bg-transparent text-text-primary p-0 text-sm font-mono;
        }
      }
      
      // Blockquote styles
      blockquote {
        @apply border-l-4 border-border-strong pl-4 py-2 mb-4 italic text-text-secondary;
      }
      
      // Horizontal rule
      hr {
        @apply border-0 border-t border-border-color my-6;
      }
      
      // Selection styles
      ::selection {
        @apply bg-accent-primary bg-opacity-25;
      }
      
      // Focus styles
      .has-focus {
        @apply ring-2 ring-accent-primary ring-opacity-25 rounded;
      }
      
      // Highlight styles
      .highlight {
        @apply bg-warning bg-opacity-20 px-1 rounded;
      }
      
      // Text formatting
      strong {
        @apply font-bold;
      }
      
      em {
        @apply italic;
      }
      
      u {
        @apply underline;
      }
      
      s {
        @apply line-through;
      }
      
      // Links
      a {
        @apply text-accent-primary underline hover:text-accent-hover;
      }
    }
  }
  
  .character-count {
    @apply text-xs text-text-muted mt-2 text-right;
  }
}

// Dropcursor styles
.ProseMirror-dropcursor {
  @apply border-l-2 border-accent-primary;
}

// Gapcursor styles
.ProseMirror-gapcursor {
  @apply relative;
  
  &::after {
    content: '';
    @apply absolute top-0 h-full w-0.5 bg-accent-primary animate-pulse;
  }
}
</style>