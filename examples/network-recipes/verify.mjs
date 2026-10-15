import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer as createVite } from 'vite';

const traces = [];
const actions = [];
const cross = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('cf-cache-status', 'HIT');
  res.setHeader('x-cache', 'HIT');
  res.setHeader('age', '25');
  if (req.url === '/exposed') res.setHeader('Access-Control-Expose-Headers', 'cf-cache-status, x-cache, age');
  res.end('cache');
});
const vite = await createVite({ server: { middlewareMode: true }, appType: 'spa' });
const server = createServer(async (req, res) => {
  if (req.url === '/worker.js') {
    res.setHeader('Content-Type', 'application/javascript');
    res.end(await readFile('public/worker.js')); return;
  }
  if (req.url === '/v1/traces' || req.url === '/datadog-mock') {
    let body = '';
    for await (const chunk of req) body += chunk;
    (req.url === '/v1/traces' ? traces : actions).push(JSON.parse(body));
    res.setHeader('Content-Type', 'application/json'); res.end('{}'); return;
  }
  if (req.url === '/api/reject') { req.socket.destroy(); return; }
  if (req.url?.startsWith('/api/')) {
    if (req.url === '/api/delayed') await new Promise((resolve) => setTimeout(resolve, 180));
    res.statusCode = Number(req.url.slice(5)) || 200;
    res.setHeader('x-request-id', 'qa-request-123');
    if (req.url === '/api/deprecated') {
      res.setHeader('Deprecation', '@1688169599');
      res.setHeader('Sunset', 'Sun, 31 Dec 2028 23:59:59 GMT');
    }
    if (req.url === '/api/miss') res.setHeader('x-cache', 'MISS');
    res.end('route'); return;
  }
  vite.middlewares(req, res, () => { res.statusCode = 404; res.end(); });
});
const listen = (app) => new Promise((resolve) => app.listen(0, '127.0.0.1', () => resolve(app.address().port)));
const port = await listen(server);
const crossPort = await listen(cross);
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}`);
  await page.evaluate(async () => { const app = await import('/main.ts'); await app.controlled(); });
  assert(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)));
  await page.evaluate(async (otherPort) => {
    for (const path of ['/api/200', '/api/404', '/api/500', '/api/delayed', '/api/deprecated', '/api/miss', '/api/reject']) {
      await fetch(path).catch(() => {});
    }
    await fetch(`http://127.0.0.1:${otherPort}/hidden`);
    await fetch(`http://127.0.0.1:${otherPort}/exposed`);
    await fetch(`http://127.0.0.1:${otherPort}/opaque`, { mode: 'no-cors' });
  }, crossPort);
  await page.waitForFunction(async () => (await import('/main.ts')).entries.some((entry) => entry.name.endsWith('/opaque')));
  const result = await page.evaluate(async () => (await import('/main.ts')).summarize());
  for (const status of [200, 404, 500]) {
    const entry = result.entries.find((entry) => entry.name.endsWith(`/api/${status}`));
    assert.equal(entry.status, status); assert.equal(entry.error, undefined);
  }
  const rejected = result.entries.find((entry) => entry.name.endsWith('/api/reject'));
  assert.equal(rejected.status, 0); assert(rejected.error); assert.equal(rejected.timing, null);
  const hiddenHeaders = result.entries.find((entry) => entry.name.endsWith('/hidden')).responseHeaders;
  const exposedHeaders = result.entries.find((entry) => entry.name.endsWith('/exposed')).responseHeaders;
  for (const header of ['cf-cache-status', 'x-cache', 'age']) assert.equal(hiddenHeaders[header], undefined);
  assert.equal(exposedHeaders['cf-cache-status'], 'HIT');
  assert.equal(exposedHeaders['x-cache'], 'HIT');
  assert.equal(exposedHeaders.age, '25');
  assert.deepEqual(result.cacheCounts['/hidden'], { hit: 0, miss: 0, unknown: 1 });
  assert.deepEqual(result.cacheCounts['/exposed'], { hit: 1, miss: 0, unknown: 0 });
  assert.equal(result.caches.find((entry) => entry.path === '/hidden').result, 'unknown');
  assert.equal(result.caches.find((entry) => entry.path === '/exposed').result, 'hit');
  const opaque = result.entries.find((entry) => entry.name.endsWith('/opaque'));
  assert.equal(opaque.status, 0); assert.equal(opaque.error, undefined);
  assert.deepEqual(opaque.responseHeaders, {});
  assert.equal(result.caches.find((entry) => entry.path === '/api/miss').result, 'miss');
  assert.equal(result.deprecated[0].deprecation, '@1688169599');
  assert.equal(result.deprecated[0].sunset, 'Sun, 31 Dec 2028 23:59:59 GMT');
  assert.match(await page.locator('aside').innerText(), /qa-request-123/);
  await page.waitForTimeout(500);
  const spans = traces.flatMap((payload) => payload.resourceSpans.flatMap((resource) => resource.scopeSpans.flatMap((scope) => scope.spans)));
  const span = spans.find((item) => item.attributes.some((attribute) => attribute.key === 'url.path' && attribute.value.stringValue === '/api/200'));
  assert(span);
  assert(span.attributes.some((attribute) => attribute.key === 'http.response.status_code' && Number(attribute.value.intValue) === 200));
  assert.match(span.traceId, /^[0-9a-f]{32}$/i); assert.match(span.spanId, /^[0-9a-f]{16}$/i);
  assert(BigInt(span.endTimeUnixNano) >= BigInt(span.startTimeUnixNano));
  assert(actions.some((action) => action.name === 'network_request' && action.context.path === '/api/200' && action.context.status === 200));
  assert.equal(traces.length, 10, 'each probe exports once without exporting either collector');
  assert.equal(actions.length, 10, 'each probe calls Datadog once without reporting either collector');
  console.log(JSON.stringify({ status: 'PASS', statuses: [200, 404, 500, 0], opaque: { status: opaque.status, error: opaque.error ?? null, headers: opaque.responseHeaders }, cacheHeaders: { hidden: hiddenHeaders, exposed: exposedHeaders }, cache: { hidden: 'unknown', exposed: 'hit', miss: 'miss' }, delayedMs: result.entries.find((entry) => entry.name.endsWith('/api/delayed')).duration, deprecation: result.deprecated, otlpSpan: span, datadogMock: actions[0], traces: traces.length, actions: actions.length }, null, 2));
} finally {
  await browser?.close(); await vite.close();
  await Promise.all([new Promise((resolve) => server.close(resolve)), new Promise((resolve) => cross.close(resolve))]);
}
