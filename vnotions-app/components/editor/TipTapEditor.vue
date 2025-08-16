<template>
  <div class="tiptap-editor">
    <!-- Editor toolbar -->
    <div v-if="editor && editable" class="editor-toolbar">
      <!-- Text formatting -->
      <div class="toolbar-group">
        <button
          :class="{ 'is-active': editor.isActive('bold') }"
          class="toolbar-button"
          @click="editor.chain().focus().toggleBold().run()"
          title="Bold (Ctrl+B)"
        >
          <BoldIcon />
        </button>
        <button
          :class="{ 'is-active': editor.isActive('italic') }"
          class="toolbar-button"
          @click="editor.chain().focus().toggleItalic().run()"
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon />
        </button>
        <button
          :class="{ 'is-active': editor.isActive('strike') }"
          class="toolbar-button"
          @click="editor.chain().focus().toggleStrike().run()"
          title="Strikethrough"
        >
          <StrikethroughIcon />
        </button>
        <button
          :class="{ 'is-active': editor.isActive('code') }"
          class="toolbar-button"
          @click="editor.chain().focus().toggleCode().run()"
          title="Inline Code"
        >
          <CodeIcon />
        </button>
      </div>

      <!-- Headings -->
      <div class="toolbar-group">
        <select
          class="toolbar-select"
          @change="onHeadingChange"
        >
          <option value="">Normal</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
          <option value="5">Heading 5</option>
          <option value="6">Heading 6</option>
        </select>
      </div>

      <!-- Lists -->
      <div class="toolbar-group">
        <button
          :class="{ 'is-active': editor.isActive('bulletList') }"
          class="toolbar-button"
          @click="editor.chain().focus().toggleBulletList().run()"
          title="Bullet List"
        >
          <ListBulletIcon />
        </button>
        <button
          :class="{ 'is-active': editor.isActive('orderedList') }"
          class="toolbar-button"
          @click="editor.chain().focus().toggleOrderedList().run()"
          title="Numbered List"
        >
          <ListNumberIcon />
        </button>
        <button
          :class="{ 'is-active': editor.isActive('taskList') }"
          class="toolbar-button"
          @click="editor.chain().focus().toggleTaskList().run()"
          title="Task List"
        >
          <CheckSquareIcon />
        </button>
      </div>

      <!-- Blocks -->
      <div class="toolbar-group">
        <button
          :class="{ 'is-active': editor.isActive('blockquote') }"
          class="toolbar-button"
          @click="editor.chain().focus().toggleBlockquote().run()"
          title="Quote"
        >
          <QuoteIcon />
        </button>
        <button
          :class="{ 'is-active': editor.isActive('codeBlock') }"
          class="toolbar-button"
          @click="editor.chain().focus().toggleCodeBlock().run()"
          title="Code Block"
        >
          <CodeBlockIcon />
        </button>
        <button
          class="toolbar-button"
          @click="editor.chain().focus().setHorizontalRule().run()"
          title="Horizontal Rule"
        >
          <HorizontalRuleIcon />
        </button>
      </div>

      <!-- Actions -->
      <div class="toolbar-group">
        <button
          class="toolbar-button"
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon />
        </button>
        <button
          class="toolbar-button"
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          title="Redo (Ctrl+Y)"
        >
          <RedoIcon />
        </button>
      </div>
    </div>

    <!-- Editor content -->
    <div 
      ref="editorElement" 
      class="editor-content"
      :class="{ 'editor-readonly': !editable }"
    ></div>

    <!-- Character count (optional) -->
    <div v-if="showCharacterCount && editor" class="editor-footer">
      <div class="character-count">
        {{ editor.storage.characterCount.characters() }} characters
        {{ editor.storage.characterCount.words() }} words
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'

// Icon components (you might need to install these or create simple icons)
const BoldIcon = () => '𝐁'
const ItalicIcon = () => '𝐼'
const StrikethroughIcon = () => '𝖲'
const CodeIcon = () => '</>'
const ListBulletIcon = () => '•'
const ListNumberIcon = () => '1.'
const CheckSquareIcon = () => '☐'
const QuoteIcon = () => '❝'
const CodeBlockIcon = () => '{}'
const HorizontalRuleIcon = () => '―'
const UndoIcon = () => '↶'
const RedoIcon = () => '↷'

// Props
const props = defineProps({
  content: {
    type: Object,
    default: () => ({
      type: 'doc',
      content: []
    })
  },
  editable: {
    type: Boolean,
    default: true
  },
  placeholder: {
    type: String,
    default: 'Start writing...'
  },
  showCharacterCount: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update'])

// State
const editor = ref(null)
const editorElement = ref(null)

// Methods
const initEditor = () => {
  if (!editorElement.value) return

  editor.value = new Editor({
    element: editorElement.value,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CharacterCount,
      Placeholder.configure({
        placeholder: props.placeholder,
      }),
    ],
    content: props.content,
    editable: props.editable,
    onUpdate: ({ editor }) => {
      emit('update', editor.getJSON())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none',
      },
    },
  })
}

const destroyEditor = () => {
  if (editor.value) {
    editor.value.destroy()
    editor.value = null
  }
}

const onHeadingChange = (event) => {
  const level = parseInt(event.target.value)
  
  if (level === 0 || isNaN(level)) {
    editor.value.chain().focus().setParagraph().run()
  } else {
    editor.value.chain().focus().toggleHeading({ level }).run()
  }
  
  // Reset select
  event.target.value = ''
}

// Watch for content changes
watch(() => props.content, (newContent) => {
  if (editor.value && newContent) {
    const currentContent = editor.value.getJSON()
    
    // Only update if content is different to avoid cursor jumping
    if (JSON.stringify(currentContent) !== JSON.stringify(newContent)) {
      editor.value.commands.setContent(newContent, false)
    }
  }
})

// Watch for editable changes
watch(() => props.editable, (newEditable) => {
  if (editor.value) {
    editor.value.setEditable(newEditable)
  }
})

// Lifecycle
onMounted(() => {
  initEditor()
})

onUnmounted(() => {
  destroyEditor()
})
</script>

<style scoped>
.tiptap-editor {
  @apply bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden;
}

.editor-toolbar {
  @apply flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700;
  @apply bg-gray-50 dark:bg-gray-800;
}

.toolbar-group {
  @apply flex items-center gap-1 pr-2 border-r border-gray-300 dark:border-gray-600 last:border-r-0 last:pr-0;
}

.toolbar-button {
  @apply flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400;
  @apply hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100;
  @apply rounded transition-colors text-sm font-medium;
}

.toolbar-button.is-active {
  @apply bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300;
}

.toolbar-button:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.toolbar-select {
  @apply px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded;
  @apply bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.editor-content {
  @apply p-4 min-h-96 max-h-96 overflow-y-auto;
}

.editor-readonly {
  @apply bg-gray-50 dark:bg-gray-900;
}

.editor-footer {
  @apply px-4 py-2 border-t border-gray-200 dark:border-gray-700;
  @apply bg-gray-50 dark:bg-gray-800;
}

.character-count {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

/* Prose styles for editor content */
:deep(.ProseMirror) {
  @apply focus:outline-none;
}

:deep(.ProseMirror h1) {
  @apply text-3xl font-bold mt-6 mb-4;
}

:deep(.ProseMirror h2) {
  @apply text-2xl font-bold mt-5 mb-3;
}

:deep(.ProseMirror h3) {
  @apply text-xl font-bold mt-4 mb-2;
}

:deep(.ProseMirror h4) {
  @apply text-lg font-bold mt-3 mb-2;
}

:deep(.ProseMirror h5) {
  @apply text-base font-bold mt-2 mb-1;
}

:deep(.ProseMirror h6) {
  @apply text-sm font-bold mt-2 mb-1;
}

:deep(.ProseMirror p) {
  @apply my-2;
}

:deep(.ProseMirror ul) {
  @apply list-disc list-inside my-2 space-y-1;
}

:deep(.ProseMirror ol) {
  @apply list-decimal list-inside my-2 space-y-1;
}

:deep(.ProseMirror ul[data-type="taskList"]) {
  @apply list-none space-y-1;
}

:deep(.ProseMirror li[data-type="taskItem"]) {
  @apply flex items-start space-x-2;
}

:deep(.ProseMirror li[data-type="taskItem"] > label) {
  @apply flex items-center space-x-2 cursor-pointer;
}

:deep(.ProseMirror li[data-type="taskItem"] > label > input) {
  @apply rounded border-gray-300 dark:border-gray-600;
}

:deep(.ProseMirror blockquote) {
  @apply border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4;
}

:deep(.ProseMirror pre) {
  @apply bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto my-4;
}

:deep(.ProseMirror code) {
  @apply bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm;
}

:deep(.ProseMirror hr) {
  @apply my-6 border-t border-gray-300 dark:border-gray-600;
}

:deep(.ProseMirror .is-editor-empty:first-child::before) {
  @apply text-gray-400 dark:text-gray-500 float-left h-0 pointer-events-none;
  content: attr(data-placeholder);
}

:deep(.ProseMirror strong) {
  @apply font-bold;
}

:deep(.ProseMirror em) {
  @apply italic;
}

:deep(.ProseMirror s) {
  @apply line-through;
}

:deep(.ProseMirror a) {
  @apply text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300;
}
</style>