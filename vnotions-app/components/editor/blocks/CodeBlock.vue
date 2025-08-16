<template>
  <div class="code-block-wrapper" :class="{ 'is-focused': isFocused }">
    <!-- Code Block Header -->
    <div class="code-block-header">
      <div class="language-selector">
        <select 
          v-model="selectedLanguage"
          @change="updateLanguage"
          class="language-select"
        >
          <option value="">Plain text</option>
          <option v-for="lang in supportedLanguages" :key="lang.value" :value="lang.value">
            {{ lang.label }}
          </option>
        </select>
      </div>
      
      <div class="code-block-actions">
        <button 
          @click="copyCode"
          class="action-button"
          title="Copy code"
        >
          <i class="pi pi-copy" />
        </button>
        
        <button 
          @click="deleteBlock"
          class="action-button"
          title="Delete block"
        >
          <i class="pi pi-trash" />
        </button>
      </div>
    </div>
    
    <!-- Code Content -->
    <div class="code-content">
      <pre><code ref="codeRef" :class="languageClass">{{ code }}</code></pre>
    </div>
    
    <!-- Copy Success Toast -->
    <div 
      v-if="showCopySuccess"
      class="copy-toast"
    >
      <i class="pi pi-check" />
      <span>Copied to clipboard</span>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface CodeBlockProps {
  code?: string
  language?: string
  isFocused?: boolean
  onUpdate?: (content: { code: string; language: string }) => void
  onDelete?: () => void
}

const props = withDefaults(defineProps<CodeBlockProps>(), {
  code: '',
  language: '',
  isFocused: false
})

const emit = defineEmits<{
  update: [content: { code: string; language: string }]
  delete: []
}>()

const codeRef = ref<HTMLElement>()
const selectedLanguage = ref(props.language)
const showCopySuccess = ref(false)

// Supported programming languages
const supportedLanguages = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'Swift', value: 'swift' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'SCSS', value: 'scss' },
  { label: 'JSON', value: 'json' },
  { label: 'XML', value: 'xml' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'SQL', value: 'sql' },
  { label: 'Shell', value: 'bash' },
  { label: 'PowerShell', value: 'powershell' },
  { label: 'Docker', value: 'dockerfile' },
  { label: 'Vue', value: 'vue' },
  { label: 'React JSX', value: 'jsx' },
  { label: 'React TSX', value: 'tsx' }
]

// Computed class for syntax highlighting
const languageClass = computed(() => {
  return selectedLanguage.value ? `language-${selectedLanguage.value}` : ''
})

// Update language
const updateLanguage = () => {
  emit('update', {
    code: props.code,
    language: selectedLanguage.value
  })
  
  props.onUpdate?.({
    code: props.code,
    language: selectedLanguage.value
  })
}

// Copy code to clipboard
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
    showCopySuccess.value = true
    
    setTimeout(() => {
      showCopySuccess.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}

// Delete code block
const deleteBlock = () => {
  emit('delete')
  props.onDelete?.()
}

// Watch for language changes
watch(() => props.language, (newLanguage) => {
  selectedLanguage.value = newLanguage
})

// Apply syntax highlighting (this would be enhanced with a proper syntax highlighter like Prism.js)
onMounted(() => {
  // Note: In a real implementation, you would integrate with a syntax highlighting library
  // like Prism.js or highlight.js here
  highlightCode()
})

watch([() => props.code, selectedLanguage], () => {
  nextTick(() => {
    highlightCode()
  })
})

const highlightCode = () => {
  // Placeholder for syntax highlighting
  // In a real implementation, you would use a library like Prism.js:
  // if (window.Prism && codeRef.value) {
  //   Prism.highlightElement(codeRef.value.querySelector('code'))
  // }
}
</script>

<style lang="scss">
.code-block-wrapper {
  @apply relative rounded-lg border border-border-color bg-surface-50 mb-4;
  @apply transition-all duration-200;
  
  &.is-focused {
    @apply border-accent-primary border-opacity-50 shadow-sm;
  }
  
  &:hover {
    .code-block-actions {
      @apply opacity-100;
    }
  }
  
  .code-block-header {
    @apply flex items-center justify-between p-3 border-b border-border-color;
    @apply bg-surface-100 rounded-t-lg;
    
    .language-selector {
      .language-select {
        @apply bg-surface-0 border border-border-color rounded-md px-2 py-1;
        @apply text-sm text-text-primary focus:outline-none focus:border-accent-primary;
        @apply transition-colors duration-150;
      }
    }
    
    .code-block-actions {
      @apply flex items-center gap-1 opacity-0 transition-opacity duration-200;
      
      .action-button {
        @apply flex items-center justify-center w-7 h-7 rounded-md;
        @apply text-text-muted hover:text-text-primary hover:bg-surface-200;
        @apply transition-all duration-150 cursor-pointer;
        
        i {
          @apply text-sm;
        }
      }
    }
  }
  
  .code-content {
    @apply relative overflow-x-auto;
    
    pre {
      @apply m-0 p-4 bg-transparent;
      
      code {
        @apply font-mono text-sm leading-relaxed text-text-primary;
        @apply whitespace-pre-wrap break-words;
        
        // Basic syntax highlighting colors
        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
          @apply text-text-muted italic;
        }
        
        .token.punctuation {
          @apply text-text-secondary;
        }
        
        .token.property,
        .token.tag,
        .token.constant,
        .token.symbol,
        .token.deleted {
          @apply text-red-400;
        }
        
        .token.boolean,
        .token.number {
          @apply text-blue-400;
        }
        
        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
          @apply text-green-400;
        }
        
        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string,
        .token.variable {
          @apply text-yellow-400;
        }
        
        .token.atrule,
        .token.attr-value,
        .token.function,
        .token.class-name {
          @apply text-purple-400;
        }
        
        .token.keyword {
          @apply text-accent-primary;
        }
        
        .token.regex,
        .token.important {
          @apply text-orange-400;
        }
      }
    }
  }
  
  .copy-toast {
    @apply absolute top-12 right-3 flex items-center gap-2;
    @apply bg-success text-white text-sm px-3 py-1.5 rounded-md shadow-lg;
    @apply animate-in fade-in slide-in-from-top-2 duration-200;
    
    i {
      @apply text-sm;
    }
  }
}

// Line numbers (optional enhancement)
.code-block-wrapper.has-line-numbers {
  .code-content pre {
    @apply pl-12;
    counter-reset: line;
    
    code {
      &::before {
        content: counter(line);
        counter-increment: line;
        @apply absolute left-0 w-8 text-text-disabled text-right pr-2;
        @apply select-none pointer-events-none;
      }
    }
  }
}

// Dark theme specific adjustments
:root.dark-mode {
  .code-block-wrapper {
    .code-content pre code {
      // Enhanced contrast for dark theme
      .token.comment,
      .token.prolog,
      .token.doctype,
      .token.cdata {
        @apply text-gray-500;
      }
      
      .token.property,
      .token.tag,
      .token.constant,
      .token.symbol,
      .token.deleted {
        @apply text-red-300;
      }
      
      .token.boolean,
      .token.number {
        @apply text-blue-300;
      }
      
      .token.selector,
      .token.attr-name,
      .token.string,
      .token.char,
      .token.builtin,
      .token.inserted {
        @apply text-green-300;
      }
      
      .token.operator,
      .token.entity,
      .token.url,
      .language-css .token.string,
      .style .token.string,
      .token.variable {
        @apply text-yellow-300;
      }
      
      .token.atrule,
      .token.attr-value,
      .token.function,
      .token.class-name {
        @apply text-purple-300;
      }
      
      .token.regex,
      .token.important {
        @apply text-orange-300;
      }
    }
  }
}
</style>