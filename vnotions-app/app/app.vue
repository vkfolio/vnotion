<template>
  <div id="app" class="h-screen w-screen overflow-hidden">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
// Global app setup
useHead({
  titleTemplate: '%s - VNotions',
  meta: [
    { name: 'description', content: 'Local-first, privacy-focused knowledge management application' }
  ]
})

// Initialize Pinia stores if needed
// const appStore = useAppStore()
</script>

<style>
/* Global styles will be handled by main.scss */
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
