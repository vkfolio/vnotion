<template>
  <div class="editor-demo-page">
    <div class="demo-header">
      <h1 class="text-2xl font-bold text-text-primary mb-2">TipTap Editor Demo</h1>
      <p class="text-text-secondary mb-6">
        Showcase of the VNotions TipTap editor with all features including slash commands, formatting toolbar, and custom blocks.
      </p>
    </div>

    <div class="demo-content">
      <!-- Editor Instance -->
      <div class="editor-container">
        <Editor
          v-model="content"
          :show-toolbar="true"
          :show-character-count="true"
          :auto-save="false"
          placeholder="Try typing '/' to see slash commands, or use the toolbar above to format your text..."
          @ready="onEditorReady"
          @update="onContentUpdate"
        />
      </div>

      <!-- Demo Controls -->
      <div class="demo-controls mt-6">
        <div class="controls-section">
          <h3 class="text-lg font-semibold text-text-primary mb-3">Demo Controls</h3>
          
          <div class="control-buttons">
            <button 
              @click="insertSampleContent"
              class="btn btn-primary mr-2"
            >
              Load Sample Content
            </button>
            
            <button 
              @click="clearContent"
              class="btn btn-secondary mr-2"
            >
              Clear Content
            </button>
            
            <button 
              @click="exportContent"
              class="btn btn-secondary mr-2"
            >
              Export HTML
            </button>
            
            <button 
              @click="toggleToolbar"
              class="btn btn-ghost"
            >
              {{ showToolbar ? 'Hide' : 'Show' }} Toolbar
            </button>
          </div>
        </div>

        <!-- Feature Showcase -->
        <div class="features-section mt-6">
          <h3 class="text-lg font-semibold text-text-primary mb-3">Available Features</h3>
          
          <div class="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="feature-card">
              <h4 class="font-medium text-text-primary mb-2">Basic Formatting</h4>
              <ul class="text-sm text-text-secondary space-y-1">
                <li>• Bold, Italic, Underline, Strikethrough</li>
                <li>• Inline code and highlights</li>
                <li>• Text alignment options</li>
              </ul>
            </div>
            
            <div class="feature-card">
              <h4 class="font-medium text-text-primary mb-2">Headings & Structure</h4>
              <ul class="text-sm text-text-secondary space-y-1">
                <li>• H1, H2, H3 headings</li>
                <li>• Paragraphs and line breaks</li>
                <li>• Horizontal dividers</li>
              </ul>
            </div>
            
            <div class="feature-card">
              <h4 class="font-medium text-text-primary mb-2">Lists</h4>
              <ul class="text-sm text-text-secondary space-y-1">
                <li>• Bullet lists</li>
                <li>• Numbered lists</li>
                <li>• Task/todo lists with checkboxes</li>
              </ul>
            </div>
            
            <div class="feature-card">
              <h4 class="font-medium text-text-primary mb-2">Code Blocks</h4>
              <ul class="text-sm text-text-secondary space-y-1">
                <li>• Syntax highlighting</li>
                <li>• Language selection</li>
                <li>• Copy code functionality</li>
              </ul>
            </div>
            
            <div class="feature-card">
              <h4 class="font-medium text-text-primary mb-2">Callout Blocks</h4>
              <ul class="text-sm text-text-secondary space-y-1">
                <li>• Info, Warning, Error, Success</li>
                <li>• Customizable icons</li>
                <li>• Rich content support</li>
              </ul>
            </div>
            
            <div class="feature-card">
              <h4 class="font-medium text-text-primary mb-2">Toggle Blocks</h4>
              <ul class="text-sm text-text-secondary space-y-1">
                <li>• Collapsible content</li>
                <li>• Custom titles</li>
                <li>• Nested content support</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Slash Commands Help -->
        <div class="slash-commands-section mt-6">
          <h3 class="text-lg font-semibold text-text-primary mb-3">Slash Commands</h3>
          <p class="text-text-secondary mb-3">Type "/" anywhere in the editor to see available commands:</p>
          
          <div class="commands-grid grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="command-group">
              <h4 class="font-medium text-text-primary mb-2">Text Formatting</h4>
              <div class="command-list text-sm space-y-1">
                <div class="command-item">
                  <code class="command-code">/h1</code>
                  <span class="text-text-secondary ml-2">Heading 1</span>
                </div>
                <div class="command-item">
                  <code class="command-code">/h2</code>
                  <span class="text-text-secondary ml-2">Heading 2</span>
                </div>
                <div class="command-item">
                  <code class="command-code">/h3</code>
                  <span class="text-text-secondary ml-2">Heading 3</span>
                </div>
              </div>
            </div>
            
            <div class="command-group">
              <h4 class="font-medium text-text-primary mb-2">Lists</h4>
              <div class="command-list text-sm space-y-1">
                <div class="command-item">
                  <code class="command-code">/bullet</code>
                  <span class="text-text-secondary ml-2">Bullet list</span>
                </div>
                <div class="command-item">
                  <code class="command-code">/number</code>
                  <span class="text-text-secondary ml-2">Numbered list</span>
                </div>
                <div class="command-item">
                  <code class="command-code">/todo</code>
                  <span class="text-text-secondary ml-2">Todo list</span>
                </div>
              </div>
            </div>
            
            <div class="command-group">
              <h4 class="font-medium text-text-primary mb-2">Blocks</h4>
              <div class="command-list text-sm space-y-1">
                <div class="command-item">
                  <code class="command-code">/code</code>
                  <span class="text-text-secondary ml-2">Code block</span>
                </div>
                <div class="command-item">
                  <code class="command-code">/quote</code>
                  <span class="text-text-secondary ml-2">Blockquote</span>
                </div>
                <div class="command-item">
                  <code class="command-code">/divider</code>
                  <span class="text-text-secondary ml-2">Horizontal line</span>
                </div>
              </div>
            </div>
            
            <div class="command-group">
              <h4 class="font-medium text-text-primary mb-2">Special Blocks</h4>
              <div class="command-list text-sm space-y-1">
                <div class="command-item">
                  <code class="command-code">/callout</code>
                  <span class="text-text-secondary ml-2">Callout block</span>
                </div>
                <div class="command-item">
                  <code class="command-code">/toggle</code>
                  <span class="text-text-secondary ml-2">Toggle block</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Editor from '~/components/editor/Editor.vue'

// Page setup
useHead({
  title: 'Editor Demo - VNotions'
})

// Reactive state
const content = ref('')
const showToolbar = ref(true)
const editorInstance = ref(null)

// Sample content for demonstration
const sampleContent = `
<h1>Welcome to VNotions Editor</h1>

<p>This is a powerful, Notion-like editor built with TipTap. Here are some of the features you can try:</p>

<h2>Text Formatting</h2>
<p>You can make text <strong>bold</strong>, <em>italic</em>, <u>underlined</u>, or <s>strikethrough</s>. You can also add <code>inline code</code> and <mark>highlights</mark>.</p>

<h2>Lists</h2>
<p>Create different types of lists:</p>

<h3>Bullet List</h3>
<ul>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item with nested list:
    <ul>
      <li>Nested item 1</li>
      <li>Nested item 2</li>
    </ul>
  </li>
</ul>

<h3>Numbered List</h3>
<ol>
  <li>Step one</li>
  <li>Step two</li>
  <li>Step three</li>
</ol>

<h3>Task List</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div>Completed task</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div>Pending task</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div>Another pending task</div></li>
</ul>

<h2>Quotes and Code</h2>
<blockquote>
  <p>This is a blockquote. Perfect for highlighting important information or quotes from other sources.</p>
</blockquote>

<pre><code class="language-javascript">// This is a code block
function hello(name) {
  console.log(\`Hello, \${name}!\`);
}

hello('VNotions');
</code></pre>

<h2>Slash Commands</h2>
<p>Try typing "/" anywhere to see the slash command menu. This allows you to quickly insert:</p>
<ul>
  <li>Headings (/h1, /h2, /h3)</li>
  <li>Lists (/bullet, /number, /todo)</li>
  <li>Code blocks (/code)</li>
  <li>Quotes (/quote)</li>
  <li>Dividers (/divider)</li>
  <li>And more!</li>
</ul>

<hr>

<p><strong>Pro tip:</strong> Use keyboard shortcuts like Cmd/Ctrl+B for bold, Cmd/Ctrl+I for italic, and many more!</p>
`

// Event handlers
const onEditorReady = (editor) => {
  editorInstance.value = editor
  console.log('Editor is ready!')
}

const onContentUpdate = (newContent) => {
  console.log('Content updated:', newContent.length, 'characters')
}

const insertSampleContent = () => {
  content.value = sampleContent
}

const clearContent = () => {
  content.value = ''
}

const exportContent = () => {
  const html = content.value
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'editor-content.html'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const toggleToolbar = () => {
  showToolbar.value = !showToolbar.value
}

// Initialize with sample content
onMounted(() => {
  insertSampleContent()
})
</script>

<style lang="scss" scoped>
.editor-demo-page {
  @apply max-w-6xl mx-auto p-6;
}

.demo-header {
  @apply mb-8;
}

.editor-container {
  @apply bg-surface-50 border border-border-color rounded-lg overflow-hidden;
  min-height: 400px;
}

.demo-controls {
  .controls-section {
    @apply p-4 bg-surface-50 border border-border-color rounded-lg;
    
    .control-buttons {
      @apply flex flex-wrap gap-2;
    }
  }
  
  .features-section,
  .slash-commands-section {
    @apply p-4 bg-surface-50 border border-border-color rounded-lg;
  }
  
  .feature-card {
    @apply p-3 bg-surface-100 border border-border-light rounded-md;
  }
  
  .command-group {
    @apply p-3 bg-surface-100 border border-border-light rounded-md;
  }
  
  .command-item {
    @apply flex items-center;
    
    .command-code {
      @apply bg-surface-200 text-accent-primary px-2 py-0.5 rounded text-xs font-mono;
    }
  }
}
</style>