// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  modules: [
    '@primevue/nuxt-module',
    '@nuxt/devtools',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],
  
  primevue: {
    options: {
      theme: {
        preset: 'Aura',
        options: {
          darkModeSelector: '.dark-mode'
        }
      }
    }
  },
  
  css: [
    'primeicons/primeicons.css',
    '~/assets/css/main.scss'
  ],
  
  // Tailwind CSS configuration
  tailwindcss: {
    cssPath: '~/assets/css/main.scss',
    configPath: 'tailwind.config.js',
    exposeConfig: false,
    viewer: true
  },
  
  ssr: false, // Disable SSR for Electron app
  
  // Vite configuration for Electron
  vite: {
    define: {
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
    },
    build: {
      outDir: '.output/public'
    }
  },
  
  // Nitro configuration for Electron
  nitro: {
    output: {
      publicDir: '.output/public'
    }
  },
  
  app: {
    head: {
      title: 'VNotions',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { hid: 'description', name: 'description', content: 'Local-first, privacy-focused knowledge management application' }
      ]
    }
  }
})
