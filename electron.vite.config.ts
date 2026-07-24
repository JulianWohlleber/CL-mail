import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// MAS_BUILD=1 gates out sandbox-incompatible features for the Mac App Store
// build (Apple Mail / Mailspring import, osascript Contacts). Baked in at
// build time as __MAS_BUILD__ so those branches can be tree-shaken away.
const MAS = JSON.stringify(process.env.MAS_BUILD === '1')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: { __MAS_BUILD__: MAS },
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: { __MAS_BUILD__: MAS },
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    define: { __MAS_BUILD__: MAS },
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()],
    css: {
      postcss: './postcss.config.js'
    }
  }
})
