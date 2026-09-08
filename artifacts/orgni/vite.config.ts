import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// PORT is only needed for the dev/preview servers. On static hosts such as
// Vercel the config is loaded for `vite build` without a PORT, so we only
// enforce it when a server is actually going to start.
const isServe = process.argv.some(
  (arg) => arg === 'serve' || arg === 'dev' || arg === 'preview',
) || !process.argv.includes('build');

const rawPort = process.env.PORT;

if (isServe && !rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = rawPort ? Number(rawPort) : undefined;

if (rawPort && (Number.isNaN(port) || (port as number) <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH is set by the Replit workspace (path-based routing). Outside of
// Replit the site is served from the domain root.
const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
