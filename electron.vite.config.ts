import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from "path"

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, "src/renderer/index.html"),
                reminder: resolve(__dirname, "src/renderer/reminder.html"),
                modal: resolve(__dirname, "src/renderer/modal.html"),
                settings: resolve(__dirname, "src/renderer/settings.html")
            }
        }
    },
    assetsInclude: ['assets']
  }
})