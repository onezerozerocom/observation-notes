import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 상대 경로로 빌드: GitHub Pages의 https://아이디.github.io/observation-notes/ 아래에서도 동작
  base: './',
  server: { port: 5190 },
})
