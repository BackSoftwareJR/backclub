import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  base: '/',
  build: {
    target: 'es2020',
    cssTarget: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Only split libraries with no React dependency.
          // Forcing React into a separate chunk breaks packages that import hooks at init time.
          if (id.includes('date-fns')) return 'date-fns'
          if (id.includes('axios')) return 'axios'
          if (id.includes('lucide-react')) return 'lucide'
          if (id.includes('i18next') && !id.includes('react-i18next')) return 'i18n-core'
        },
      },
    },
  },
  esbuild: {
    legalComments: 'none',
    drop: ['debugger'],
  },
})
