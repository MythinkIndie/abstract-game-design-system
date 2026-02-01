// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwind from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: vercel(),
  vite: {
    plugins: [tailwind()]
  }
});