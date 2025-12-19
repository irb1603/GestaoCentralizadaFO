import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        'public-fo': './public-fo.html'
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
