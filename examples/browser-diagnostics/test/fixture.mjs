import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

export async function startFixture() {
  const bundled = await build({ stdin: { contents: "import { PerformanceMonitor } from 'perf-observer-js'; window.monitor = new PerformanceMonitor({workerUrl: '/worker.js'});", resolveDir: new URL('..', import.meta.url).pathname }, bundle: true, write: false, format: 'iife', platform: 'browser' });
  const worker = await readFile(new URL('../node_modules/perf-observer-js/public/worker.js', import.meta.url));
  const audit = [];
  const app = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://fixture');
    if (url.pathname === '/audit') { audit.push(url.searchParams.get('method')); res.end('ok'); return; }
    if (url.pathname === '/worker.js' || url.pathname === '/elsewhere/worker.js') {
      res.setHeader('Content-Type', 'application/javascript'); res.end(worker); return;
    }
    if (url.pathname === '/malformed.js' || url.pathname === '/ambiguous.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(`self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', e => e.waitUntil(clients.claim()));
        self.addEventListener('fetch', e => { e.respondWith(fetch(e.request).then(async r => { const c = await clients.get(e.clientId); const entry = {name:e.request.url, entryType:'resource', duration:1, status:${url.pathname === '/malformed.js' ? "'invalid'" : 'r.status'}, responseHeaders:{}, request:{method:'GET'}}; if(c) { c.postMessage({type:'PERFORMANCE_ENTRY',entry}); ${url.pathname === '/ambiguous.js' ? "c.postMessage({type:'PERFORMANCE_ENTRY',entry});" : ''} } return r; })); });`); return;
    }
    if (url.pathname === '/silent.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end("self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', e => e.waitUntil(clients.claim()));"); return;
    }
    if (url.pathname === '/frame') {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<script>setInterval(() => { if(navigator.serviceWorker.controller) navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {source:navigator.serviceWorker.controller, data:{type:'PERFORMANCE_ENTRY',entry:{name:location.origin+'/probe/200?case=iframe', entryType:'resource',duration:1,status:200,responseHeaders:{},request:{method:'GET'}}}})); }, 40)</script>`); return;
    }
    if (url.pathname === '/probe/redirect') { res.writeHead(302, {location:'/probe/200?redirected=private'}); res.end(); return; }
    if (url.pathname === '/app.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(bundled.outputFiles[0].text); return; }
    if (url.pathname.startsWith('/probe/')) {
      if (url.pathname === '/probe/timeout') return;
      if (url.pathname === '/probe/reject') { req.socket.destroy(); return; }
      res.setHeader('x-diagnostic-id', 'fixture-request');
      res.statusCode = Number(url.pathname.slice('/probe/'.length)) || 200;
      res.end('fixture'); return;
    }
    res.setHeader('Content-Type', 'text/html');
    const setup = ['/controlled', '/overlap', '/iframe'].includes(url.pathname) ? '<script src="/app.js"></script>'
      : ['/malformed', '/ambiguous'].includes(url.pathname) ? `<script>navigator.serviceWorker.register("${url.pathname}.js")</script>`
      : url.pathname === '/silent' ? '<script>navigator.serviceWorker.register("/silent.js")</script>'
      : url.pathname === '/wrong-scope' ? '<script>navigator.serviceWorker.register("/elsewhere/worker.js")</script>' : '';
    res.end(`<!doctype html><title>Diagnostic fixture</title><script>
      for (const [object, method] of [[ServiceWorkerContainer.prototype, 'register'], [ServiceWorkerRegistration.prototype, 'unregister'], [ServiceWorkerRegistration.prototype, 'update']]) {
        const original = object[method];
        object[method] = function(...args) { fetch('/audit?method=' + method); return original.apply(this, args); };
      }
      </script>${setup}${url.pathname === '/iframe' ? '<iframe src="/frame"></iframe>' : ''}${url.pathname === '/overlap' ? '<script>setInterval(() => fetch("/probe/200?case=overlap"), 60)</script>' : ''}`);
  });
  const cross = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('x-diagnostic-id', 'cross-request');
    if (new URL(req.url, 'http://fixture').pathname === '/exposed') res.setHeader('Access-Control-Expose-Headers', 'x-diagnostic-id');
    res.end('cross fixture');
  });
  const listen = server => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
  const origin = await listen(app);
  const crossOrigin = await listen(cross);
  return { origin, crossOrigin, audit, close: () => Promise.all([app, cross].map(server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }))) };
}
