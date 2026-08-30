import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/_sb': {
        target: 'https://ovlqfgjdmbvstqibrqrl.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/_sb/, ''),
      },
    },
  },
})
