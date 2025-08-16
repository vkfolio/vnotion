<template>
  <div class="layout-container">
    <slot />
  </div>
</template>

<script setup>
// Layout setup - this is the default layout for all pages
// Additional layout logic can be added here like:
// - Global state management
// - Theme switching
// - Keyboard shortcuts
// - Window controls for Electron

onMounted(() => {
  // Apply dark mode class if preferred
  if (process.client) {
    const isDark = localStorage.getItem('vnotions-dark-mode') === 'true'
    if (isDark) {
      document.documentElement.classList.add('dark-mode')
    }
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>