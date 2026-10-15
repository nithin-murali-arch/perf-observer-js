import { PerformanceMonitor } from 'perf-observer-js';

export function showSlowRequests(threshold = 500) {
  const panel = document.createElement('aside');
  panel.setAttribute('aria-label', 'Slow API requests');
  panel.style.cssText = 'position:fixed;bottom:1rem;right:1rem;background:white;color:black;border:1px solid;padding:1rem;max-width:40rem;z-index:10000';
  const title = document.createElement('strong');
  title.textContent = `Requests slower than ${threshold} ms`;
  const list = document.createElement('ul');
  panel.append(title, list);
  document.body.append(panel);
  const monitor = new PerformanceMonitor({ workerUrl: '/worker.js' });
  monitor.subscribe((entry) => {
    if (entry.duration <= threshold) return;
    const item = document.createElement('li');
    item.textContent = `${new URL(entry.name).pathname} ${Math.round(entry.duration)} ms ${entry.responseHeaders['x-request-id'] ?? ''}`;
    list.prepend(item);
    while (list.children.length > 20) list.lastElementChild?.remove();
  });
  return () => { monitor.disconnect(); panel.remove(); };
}
