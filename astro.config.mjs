// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  vite: {
    optimizeDeps: {
      exclude: ['better-sqlite3']
    }
  },
  site: "https://abstract-game-design-system.vercel.app/",
  adapter: vercel(),
  output: 'server',
  server: {
    port: 4321,
    host: true
  }
});