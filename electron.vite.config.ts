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
                reminder: resolve(__dirname, "src/renderer/reminder.html")
            }
        }
    },
    assetsInclude: ['assets']
  }
})