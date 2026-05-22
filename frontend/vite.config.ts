import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
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
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n'
          if (id.includes('react-dom') || id.includes('scheduler') || id.includes('/react/')) return 'react-vendor'
          if (id.includes('react-router')) return 'react-router'
          if (id.includes('recharts') || id.includes('react-big-calendar') || id.includes('framer-motion')) return 'vendor-ui'
          if (id.includes('date-fns')) return 'date-fns'
          if (id.includes('axios')) return 'axios'
          if (id.includes('lucide-react')) return 'lucide'
          return 'vendor'
        },
      },
    },
  },
  esbuild: {
    legalComments: 'none',
    drop: ['debugger'],
  },
})
