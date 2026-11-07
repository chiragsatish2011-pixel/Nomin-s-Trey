import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@nomin/core'] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@nomin/core'] })],
    build: {
      rollupOptions: {
        input: {
          face: resolve(__dirname, 'src/preload/face.ts'),
          overlay: resolve(__dirname, 'src/preload/overlay.ts'),
          dashboard: resolve(__dirname, 'src/preload/dashboard.ts'),
          mic: resolve(__dirname, 'src/preload/mic.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          face: resolve(__dirname, 'src/renderer/face/index.html'),
          overlay: resolve(__dirname, 'src/renderer/overlay/index.html'),
          dashboard: resolve(__dirname, 'src/renderer/dashboard/index.html'),
          mic: resolve(__dirname, 'src/renderer/mic/index.html')
        }
      }
    }
  }
})
