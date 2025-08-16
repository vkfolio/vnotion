<template>
  <div class="app-logo">
    <div class="logo-icon">
      <i class="pi pi-book text-2xl"></i>
    </div>
    <span v-if="showText" class="logo-text">VNotions</span>
  </div>
</template>

<script setup>
defineProps({
  showText: {
    type: Boolean,
    default: true
  }
})
</script>

<style scoped>
.app-logo {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: var(--accent-primary);
}

.logo-icon {
  margin-right: 0.5rem;
}

.logo-text {
  font-size: 1.25rem;
}
</style>