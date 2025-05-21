import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'

// Middleware plugin for Vite dev server
// const apiMiddleware = () => {
//   return {
//     name: 'api-middleware',
//     configureServer(server) {
//       server.middlewares.use(api)
//     }
//   }
// }

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    // apiMiddleware()
  ],
  resolve: {
    alias: {
      path: 'path-browserify',
      fs: false,
      crypto: false
    }
  },
  optimizeDeps: {
    exclude: []
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})