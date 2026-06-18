import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable in production for security
    rollupOptions: {
      output: {
        manualChunks: {
          // Separare React e React DOM
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Separare Framer Motion (libreria pesante)
          'framer-motion': ['framer-motion'],
          // Separare Lucide React (icone)
          'lucide-icons': ['lucide-react'],
          // Separare Axios
          'axios': ['axios'],
          // Utilities
          'utils': ['clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Aumenta il limite a 1MB per chunk
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
