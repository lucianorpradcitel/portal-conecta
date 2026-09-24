import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// O proxy de /api existe só em desenvolvimento, para não esbarrar em CORS.
// Em produção quem faz esse papel é o location /api/ do nginx.conf.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'http://localhost:3001'

  return {
    plugins: [react()],
    server: {
      port: 4200,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  }
})
