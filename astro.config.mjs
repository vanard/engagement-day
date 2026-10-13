import { defineConfig } from 'astro/config';

export default defineConfig({
  // Absolute base for link-preview URLs (Open Graph). Update if the domain changes.
  site: 'https://engagement-day-kappa.vercel.app',
  output: 'static',
  vite: { build: { target: ['safari14'] } },
});
