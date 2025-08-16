import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Editor } from '@tiptap/vue-3'
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
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'

/**
 * Composable for TipTap editor with VNotions-specific configuration
 * @param {Object} options - Editor configuration options
 * @returns {Object} Editor instance and helper methods
 */
export function useEditor(options = {}) {
  const {
    content = '',
    placeholder = 'Start writing...',
    editable = true,
    autofocus = false,
    autoSave = true,
    autoSaveDelay = 1000,
    onUpdate = null,
    onReady = null,
    onFocus = null,
    onBlur = null,
    extensions = []
  } = options

  // Reactive state
  const editor = ref(null)
  const isReady = ref(false)
  const isFocused = ref(false)
  const characterCount = ref(0)
  const wordCount = ref(0)
  const canUndo = ref(false)
  const canRedo = ref(false)

  // Auto-save functionality
  let autoSaveTimeout = null

  const debouncedSave = (content) => {
    if (!autoSave) return
    
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }
    
    autoSaveTimeout = setTimeout(() => {
      onUpdate?.(content)
    }, autoSaveDelay)
  }

  // Create editor instance
  const createEditor = () => {
    const editorInstance = new Editor({
      content,
      editable,
      autofocus,
      
      extensions: [
        StarterKit.configure({
          codeBlock: false, // We'll use our custom code block
        }),
        
        Placeholder.configure({
          placeholder,
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
        
        Image.configure({
          HTMLAttributes: {
            class: 'editor-image',
          },
        }),
        
        Link.configure({
          HTMLAttributes: {
            class: 'editor-link',
          },
          openOnClick: false,
        }),
        
        // Custom extensions
        ...extensions
      ],
      
      editorProps: {
        attributes: {
          class: 'prose prose-invert max-w-none focus:outline-none',
        },
      },
      
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        const json = editor.getJSON()
        
        // Update reactive state
        characterCount.value = editor.storage.characterCount.characters()
        wordCount.value = editor.storage.characterCount.words()
        canUndo.value = editor.can().undo()
        canRedo.value = editor.can().redo()
        
        // Auto-save
        debouncedSave({ html, json })
      },
      
      onFocus: () => {
        isFocused.value = true
        onFocus?.()
      },
      
      onBlur: () => {
        isFocused.value = false
        onBlur?.()
      },
      
      onCreate: ({ editor }) => {
        isReady.value = true
        onReady?.(editor)
      },
    })

    return editorInstance
  }

  // Initialize editor
  editor.value = createEditor()

  // Computed properties
  const isEmpty = computed(() => {
    if (!editor.value) return true
    return editor.value.isEmpty
  })

  const isEditable = computed(() => {
    if (!editor.value) return false
    return editor.value.isEditable
  })

  // Editor commands
  const commands = {
    // Basic formatting
    toggleBold: () => editor.value?.chain().focus().toggleBold().run(),
    toggleItalic: () => editor.value?.chain().focus().toggleItalic().run(),
    toggleUnderline: () => editor.value?.chain().focus().toggleUnderline().run(),
    toggleStrike: () => editor.value?.chain().focus().toggleStrike().run(),
    toggleCode: () => editor.value?.chain().focus().toggleCode().run(),
    toggleHighlight: () => editor.value?.chain().focus().toggleHighlight().run(),

    // Headings
    setHeading: (level) => editor.value?.chain().focus().toggleHeading({ level }).run(),
    setParagraph: () => editor.value?.chain().focus().setParagraph().run(),

    // Lists
    toggleBulletList: () => editor.value?.chain().focus().toggleBulletList().run(),
    toggleOrderedList: () => editor.value?.chain().focus().toggleOrderedList().run(),
    toggleTaskList: () => editor.value?.chain().focus().toggleTaskList().run(),

    // Text alignment
    setTextAlign: (alignment) => editor.value?.chain().focus().setTextAlign(alignment).run(),

    // Block elements
    toggleBlockquote: () => editor.value?.chain().focus().toggleBlockquote().run(),
    toggleCodeBlock: () => editor.value?.chain().focus().toggleCodeBlock().run(),
    setHorizontalRule: () => editor.value?.chain().focus().setHorizontalRule().run(),

    // Text color
    setColor: (color) => editor.value?.chain().focus().setColor(color).run(),
    unsetColor: () => editor.value?.chain().focus().unsetColor().run(),

    // History
    undo: () => editor.value?.chain().focus().undo().run(),
    redo: () => editor.value?.chain().focus().redo().run(),

    // Content
    setContent: (content, emitUpdate = true) => {
      editor.value?.commands.setContent(content, emitUpdate)
    },
    insertContent: (content) => editor.value?.chain().focus().insertContent(content).run(),
    clearContent: () => editor.value?.chain().focus().clearContent().run(),

    // Selection
    selectAll: () => editor.value?.chain().focus().selectAll().run(),
    deleteSelection: () => editor.value?.chain().focus().deleteSelection().run(),

    // Links
    setLink: (href) => {
      if (href) {
        editor.value?.chain().focus().setLink({ href }).run()
      } else {
        editor.value?.chain().focus().unsetLink().run()
      }
    },
    unsetLink: () => editor.value?.chain().focus().unsetLink().run(),

    // Images
    setImage: (src, alt, title) => {
      editor.value?.chain().focus().setImage({ src, alt, title }).run()
    },

    // Focus
    focus: (position = 'end') => {
      if (position === 'start') {
        editor.value?.chain().focus('start').run()
      } else if (position === 'end') {
        editor.value?.chain().focus('end').run()
      } else {
        editor.value?.chain().focus().run()
      }
    },

    // Custom blocks (to be implemented with custom extensions)
    insertCallout: (type = 'info') => {
      // Will be implemented with custom callout extension
      console.log('Insert callout:', type)
    },
    
    insertToggle: (title = '') => {
      // Will be implemented with custom toggle extension
      console.log('Insert toggle:', title)
    },

    insertCodeBlock: (language = '') => {
      editor.value?.chain().focus().toggleCodeBlock({ language }).run()
    }
  }

  // Editor utilities
  const utils = {
    // Check if command can be executed
    can: (command, attrs = {}) => {
      return editor.value?.can()[command](attrs)
    },

    // Check if mark/node is active
    isActive: (name, attrs = {}) => {
      return editor.value?.isActive(name, attrs)
    },

    // Get current attributes
    getAttributes: (name) => {
      return editor.value?.getAttributes(name)
    },

    // Get content in different formats
    getHTML: () => editor.value?.getHTML(),
    getJSON: () => editor.value?.getJSON(),
    getText: () => editor.value?.getText(),

    // Get current selection
    getSelection: () => {
      const { state } = editor.value
      return state.selection
    },

    // Get cursor position
    getCursorPosition: () => {
      const { state } = editor.value
      return state.selection.from
    },

    // Insert content at cursor
    insertAt: (position, content) => {
      editor.value?.chain().insertContentAt(position, content).run()
    }
  }

  // Keyboard shortcuts
  const setupKeyboardShortcuts = () => {
    const shortcuts = {
      'Mod-b': () => commands.toggleBold(),
      'Mod-i': () => commands.toggleItalic(),
      'Mod-u': () => commands.toggleUnderline(),
      'Mod-Shift-s': () => commands.toggleStrike(),
      'Mod-e': () => commands.toggleCode(),
      'Mod-h': () => commands.toggleHighlight(),
      'Mod-Shift-1': () => commands.setHeading(1),
      'Mod-Shift-2': () => commands.setHeading(2),
      'Mod-Shift-3': () => commands.setHeading(3),
      'Mod-Shift-7': () => commands.toggleOrderedList(),
      'Mod-Shift-8': () => commands.toggleBulletList(),
      'Mod-Shift-9': () => commands.toggleTaskList(),
      'Mod-Shift-.': () => commands.toggleBlockquote(),
      'Mod-Alt-c': () => commands.toggleCodeBlock(),
      'Mod-z': () => commands.undo(),
      'Mod-Shift-z': () => commands.redo(),
      'Mod-y': () => commands.redo(),
      'Mod-a': () => commands.selectAll(),
      'Mod-k': () => {
        const url = window.prompt('Enter URL:')
        if (url) commands.setLink(url)
      }
    }

    // Note: TipTap handles these automatically through extensions
    // This is just for reference and custom shortcuts
    return shortcuts
  }

  // Setup shortcuts
  setupKeyboardShortcuts()

  // Watch for editable changes
  watch(() => editable, (newValue) => {
    if (editor.value) {
      editor.value.setEditable(newValue)
    }
  })

  // Cleanup
  onBeforeUnmount(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }
    
    if (editor.value) {
      editor.value.destroy()
    }
  })

  return {
    // Editor instance
    editor: readonly(editor),
    
    // State
    isReady: readonly(isReady),
    isFocused: readonly(isFocused),
    isEmpty: readonly(isEmpty),
    isEditable: readonly(isEditable),
    characterCount: readonly(characterCount),
    wordCount: readonly(wordCount),
    canUndo: readonly(canUndo),
    canRedo: readonly(canRedo),
    
    // Methods
    commands,
    utils,
    
    // Shortcuts reference
    shortcuts: setupKeyboardShortcuts()
  }
}

/**
 * Preset configurations for different use cases
 */
export const editorPresets = {
  // Minimal editor for simple text input
  minimal: {
    extensions: [],
    placeholder: 'Type something...',
    showToolbar: false,
    autoSave: false
  },

  // Full-featured editor for rich content
  full: {
    placeholder: 'Start writing your page...',
    showToolbar: true,
    showCharacterCount: true,
    autoSave: true,
    autoSaveDelay: 1000
  },

  // Comment editor for lightweight formatting
  comment: {
    placeholder: 'Write a comment...',
    showToolbar: true,
    showCharacterCount: false,
    autoSave: false
  },

  // Note-taking editor
  notes: {
    placeholder: 'Take some notes...',
    showToolbar: true,
    showCharacterCount: true,
    autoSave: true,
    autoSaveDelay: 2000
  }
}