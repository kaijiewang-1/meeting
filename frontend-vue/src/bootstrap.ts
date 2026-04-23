import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import { createAppRouter } from '@/router'
import '@/styles/legacy.css'

export function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  const router = createAppRouter()

  app.use(pinia)
  app.use(router)
  app.mount('#app')
}
