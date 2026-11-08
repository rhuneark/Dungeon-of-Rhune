import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    // Relative asset URLs: the same dist/ works on any static web host (itch.io,
    // a subfolder, a CDN) and inside the Electron shell's app:// protocol.
    base: './',
    plugins: [react(), tailwindcss()],
    server: {
        allowedHosts: true,
    },
    build: {
        target: 'esnext',
        chunkSizeWarningLimit: 1500,
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext',
        },
    },
});
