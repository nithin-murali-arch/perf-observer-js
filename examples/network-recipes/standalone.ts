import { forwardToDatadog } from '../rum-integrations/datadog';

const stop = forwardToDatadog({
  addAction(name, context) {
    void fetch('/rum-intake', { method: 'POST', body: JSON.stringify({ name, context }) });
  }
}, ['/rum-intake']);

export async function run() {
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  }
  await fetch('/api/200');
}
window.addEventListener('pagehide', stop);
