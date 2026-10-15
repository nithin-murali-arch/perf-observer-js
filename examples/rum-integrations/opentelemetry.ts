import { PerformanceMonitor } from 'perf-observer-js';
import { WebTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SpanStatusCode } from '@opentelemetry/api';

export function forwardToOpenTelemetry(endpoint: string, collectorPaths: string[] = []) {
  const collector = new URL(endpoint, location.href);
  const provider = new WebTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(new OTLPTraceExporter({ url: collector.href }))]
  });
  const tracer = provider.getTracer('perf-network-recipes');
  const monitor = new PerformanceMonitor({ workerUrl: '/worker.js' });
  monitor.subscribe((entry) => {
    const path = new URL(entry.name).pathname;
    if (path === collector.pathname || collectorPaths.includes(path)) return;
    const end = Date.now();
    const span = tracer.startSpan('network.request', {
      startTime: end - entry.duration,
      attributes: {
        'url.path': new URL(entry.name).pathname,
        'http.request.method': entry.request?.method ?? 'GET',
        'http.response.status_code': entry.status,
        'network.duration_ms': entry.duration
      }
    });
    if (entry.error || entry.status >= 400) span.setStatus({ code: SpanStatusCode.ERROR });
    span.end(end);
  });
  return async () => { monitor.disconnect(); await provider.shutdown(); };
}
