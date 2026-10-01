import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// O deploy define VITE_BASE_PATH com o nome do repositório (ex.: /meu-repo/).
// Fallback: /estacionamento/ — ajuste se o repositório tiver outro nome.
const base = process.env.VITE_BASE_PATH ?? '/estacionamento/'

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
})
