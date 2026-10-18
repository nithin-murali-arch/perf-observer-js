import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [{
    name: 'delayed-api',
    configureServer(server) {
      server.middlewares.use('/api/delayed', (_request, response) => {
        setTimeout(() => {
          response.setHeader('x-request-id', 'qa-request-123');
          response.end('Delayed API response');
        }, 180);
      });
    }
  }],
  resolve: {
    alias: {
      'perf-observer-js': fileURLToPath(new URL('./node_modules/perf-observer-js/dist/index.js', import.meta.url)),
      '@opentelemetry/sdk-trace-web': fileURLToPath(new URL('./node_modules/@opentelemetry/sdk-trace-web/build/esm/index.js', import.meta.url)),
      '@opentelemetry/exporter-trace-otlp-http': fileURLToPath(new URL('./node_modules/@opentelemetry/exporter-trace-otlp-http/build/esm/index.js', import.meta.url)),
      '@opentelemetry/api': fileURLToPath(new URL('./node_modules/@opentelemetry/api/build/esm/index.js', import.meta.url))
    }
  },
  optimizeDeps: { include: ['perf-observer-js'] }
});
