import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  pages: true, // make sure filesystem routing is enabled
  runtimeConfig: { crewBaseUrl: '', crewApiToken: '', public: {} }
})
