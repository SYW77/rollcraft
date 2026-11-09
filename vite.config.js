import { defineConfig } from 'vite';

// base './' keeps asset paths relative so the build also works on GitHub Pages.
export default defineConfig({
  base: './',
  server: { open: true },
});
