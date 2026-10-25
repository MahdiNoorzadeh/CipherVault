import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'url';

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://cdn.simpleicons.org",
    `connect-src 'self'${isDev ? ' http://localhost:5173 ws://localhost:5173' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  return{
  plugins: [
    vue(),

      {
    name: 'ciphervault-csp',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: csp
          },
          injectTo: 'head-prepend'
        }
      ];
    }
  },
    // Plugin to ignore Node.js-only modules during build
    {
      name: 'ignore-node-modules',
      resolveId(id) {
        // Ignore Node.js-only modules that should not be bundled
        if (id === 'realm' || id === 'keytar' || id === 'electron' || id.startsWith('electron/')) {
          return { id: 'node-module-stub', external: true };
        }
        return null;
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Stub out Node.js-only modules for Vite build (they're only used in main process)
      'realm': fileURLToPath(new URL('./src/stubs/realm-stub.js', import.meta.url)),
      'keytar': fileURLToPath(new URL('./src/stubs/keytar-stub.js', import.meta.url))
    }
  },
  base: './',
  server: {
    port: 5173
  },
  build: {
    // Enable code splitting for better memory usage
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'vuetify': ['vuetify'],
          'vue-vendor': ['vue']
          
          // Note: Realm, keytar, and electron are Node.js only and used in main process
        }
      },
      // Exclude Node.js modules and main process files from client bundle
      external: (id) => {
        // Exclude Node.js built-ins
        if (id === 'realm' || id === 'keytar' || id === 'electron' || id.startsWith('electron/')) {
          return true;
        }
        // Exclude files in src/main/ directory (main process only)
        if (id.includes('src/main/') || id.includes('\\src\\main\\')) {
          return true;
        }
        return false;
      }
    },
    // Increase chunk size warning limit (fonts are large)
    chunkSizeWarningLimit: 1000,
    // Optimize for production - use esbuild (faster, built-in) instead of terser
    minify: 'esbuild',
    // esbuild options for production
    esbuild: {
      drop: ['console', 'debugger'] // Remove console.log and debugger in production
    },
    // Reduce memory usage during build
    target: 'esnext',
    cssCodeSplit: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['vue', 'vuetify'],
    exclude: ['realm', 'keytar', 'electron'] // Node.js only modules, exclude from client bundle
  },
  // Exclude Node.js modules from being processed
  ssr: {
    noExternal: [] // Don't externalize anything for SSR (we're not using SSR)
  }
}});

