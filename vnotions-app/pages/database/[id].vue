<template>
  <div class="database-page h-full">
    <DatabaseView :database-id="databaseId" />
  </div>
</template>

<script>
import DatabaseView from '~/components/database/DatabaseView.vue'

export default {
  name: 'DatabasePage',

  components: {
    DatabaseView
  },

  setup() {
    const route = useRoute()
    
    // Get database ID from route params
    const databaseId = computed(() => route.params.id)

    // Set page title
    useSeoMeta({
      title: 'Database - VNotions'
    })

    return {
      databaseId
    }
  }
}
</script>

<style scoped>
.database-page {
  /* Page-specific styles */
}
</style>