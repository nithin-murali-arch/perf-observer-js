import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { assess, safeUrl } from './report.mjs';

export function validateOptions(options) {
  const result = { ...options, headers: options.headers ?? [], timeoutMs: options.timeoutMs ?? 3000 };
  for (const name of ['pageUrl', 'workerUrl', 'probeUrl']) {
    const url = new URL(result[name]);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('INVALID_URL');
    result[name] = url.href;
  }
  if (!Number.isInteger(result.timeoutMs) || result.timeoutMs < 50 || result.timeoutMs > 60000) throw new Error('INVALID_TIMEOUT');
  if (result.probeMode !== undefined && !['cors', 'no-cors', 'same-origin'].includes(result.probeMode)) throw new Error('INVALID_MODE');
  if (!Array.isArray(result.headers) || result.headers.some(name => typeof name !== 'string' || !/^[!#$%&'*+.^_`|~0-9a-z-]+$/i.test(name))) throw new Error('INVALID_HEADER');
  result.headers = [...new Set(result.headers.map(name => name.toLowerCase()))];
  return result;
}

function selectedHeaders(headers, names) {
  return Object.fromEntries(names.filter(name => typeof headers?.[name] === 'string').map(name => [name, headers[name]]));
}

function validEntry(entry) {
  return entry && typeof entry === 'object' && entry.entryType === 'resource'
    && typeof entry.name === 'string' && entry.request?.method === 'GET'
    && Number.isFinite(entry.duration) && entry.duration >= 0
    && Number.isInteger(entry.status) && entry.status >= 0 && entry.status <= 599
    && entry.responseHeaders && typeof entry.responseHeaders === 'object' && !Array.isArray(entry.responseHeaders)
    && (entry.error === undefined || typeof entry.error === 'string');
}

export async function diagnose(input) {
  const options = validateOptions(input);
  const browser = await chromium.launch({ headless: true, ...(options.executablePath ? { executablePath: options.executablePath } : {}) });
  let stage = 'setup';
  const partial = { input: { pageUrl: safeUrl(options.pageUrl), workerUrl: safeUrl(options.workerUrl), probeUrl: safeUrl(options.probeUrl) }, registration: { state: 'unknown', items: [] }, controller: { state: 'unknown', expected: false, transitions: [] }, probe: { outcome: 'unknown' }, network: { state: 'unknown', requests: [], handling: 'unknown' }, entry: { state: 'unknown', count: 0, malformedCount: 0, observations: [] }, headers: [] };
  try {
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const page = await context.newPage();
    const key = `__perfDiagnostic_${randomUUID().replaceAll('-', '')}`;
    const entries = [];
    const transitions = [];
    const requests = [];
    const pending = [];
    let collecting = false;
    let malformed = 0;
    await context.exposeBinding(key, (source, event) => {
      if (source.page !== page || source.frame !== page.mainFrame()) return;
      if (event.kind === 'controller') {
        transitions.push(event.scriptUrl ? safeUrl(event.scriptUrl) : null);
        return;
      }
      if (!collecting || event.kind !== 'entry' || event.source !== options.workerUrl || event.entry?.name !== options.probeUrl) return;
      if (!validEntry(event.entry)) { malformed++; return; }
      entries.push({ status: event.entry.status, durationMs: event.entry.duration,
        outcome: event.entry.error !== undefined ? 'rejected' : event.entry.status === 0 ? 'opaque-or-unknown' : 'resolved',
        headers: selectedHeaders(event.entry.responseHeaders, options.headers) });
    });
    await context.addInitScript(({ key }) => {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'PERFORMANCE_ENTRY') window[key]({ kind: 'entry', source: event.source?.scriptURL, entry: event.data.entry });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => window[key]({ kind: 'controller', scriptUrl: navigator.serviceWorker.controller?.scriptURL ?? null }));
    }, { key });
    const records = new Map();
    context.on('request', request => {
      const redirected = records.has(request.redirectedFrom());
      if (redirected) records.get(request.redirectedFrom()).redirectedTo = safeUrl(request.url());
      if (!collecting || (!redirected && request.url() !== options.probeUrl) || request.method() !== 'GET') return;
      let owner = 'unknown';
      const serviceWorker = request.serviceWorker();
      if (serviceWorker) owner = serviceWorker.url() === options.workerUrl ? 'worker' : 'other-worker';
      else { try { if (request.frame() === page.mainFrame()) owner = 'page'; } catch {} }
      const record = { owner, match: redirected ? 'redirect' : 'exact', url: safeUrl(request.url()), outcome: 'pending', fromServiceWorker: null, headers: {}, redirectedTo: null };
      records.set(request, record);
      requests.push(record);
    });
    context.on('response', response => {
      const record = records.get(response.request());
      if (!record) return;
      pending.push((async () => {
        record.outcome = 'resolved';
        record.status = response.status();
        record.fromServiceWorker = response.fromServiceWorker();
        for (const name of options.headers) {
          const value = await response.headerValue(name);
          if (value !== null) record.headers[name] = value;
        }
      })());
    });
    context.on('requestfailed', request => { const record = records.get(request); if (record) record.outcome = 'rejected'; });
    context.on('requestfinished', request => {
      const record = records.get(request);
      if (record && request.redirectedTo()) record.redirectedTo = safeUrl(request.redirectedTo().url());
    });
    stage = 'navigation';
    await page.goto(options.pageUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
    stage = 'controller';
    await page.waitForFunction(workerUrl => navigator.serviceWorker?.controller?.scriptURL === workerUrl, options.workerUrl, { timeout: options.timeoutMs }).catch(() => {});
    const documentUrl = page.url();
    const registrationState = await page.evaluate(async ({ pageUrl, workerUrl }) => {
      if (!('serviceWorker' in navigator)) return { supported: false, items: [], controller: null };
      const registrations = await navigator.serviceWorker.getRegistrations();
      return { supported: true, items: registrations.map(registration => ({ scope: registration.scope, scriptUrl: registration.active?.scriptURL ?? registration.waiting?.scriptURL ?? registration.installing?.scriptURL ?? null,
        lifecycle: registration.active?.state ?? registration.waiting?.state ?? registration.installing?.state ?? 'unknown',
        coversPage: pageUrl.startsWith(registration.scope), expected: [registration.active, registration.waiting, registration.installing].some(worker => worker?.scriptURL === workerUrl) })),
      controller: navigator.serviceWorker.controller?.scriptURL ?? null };
    }, { ...options, pageUrl: documentUrl });
    partial.registration = { state: registrationState.supported ? registrationState.items.length ? 'observed' : 'missing' : 'unknown', items: registrationState.items.map(item => ({ ...item, scope: safeUrl(item.scope), scriptUrl: item.scriptUrl ? safeUrl(item.scriptUrl) : null })) };
    partial.controller = { state: registrationState.controller ? 'observed' : 'missing', expected: registrationState.controller === options.workerUrl, transitions };
    stage = 'probe';
    collecting = true;
    const probe = await page.evaluate(async ({ probeUrl, headers, timeoutMs, probeMode }) => {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), timeoutMs);
      try {
        const response = await fetch(probeUrl, { method: 'GET', signal: abort.signal, ...(probeMode ? { mode: probeMode } : {}) });
        return { outcome: 'resolved', status: response.status, responseType: response.type, finalUrl: response.url || null,
          headers: Object.fromEntries(headers.flatMap(name => { const value = response.headers.get(name); return value === null ? [] : [[name, value]]; })) };
      } catch { return { outcome: abort.signal.aborted ? 'timeout' : 'rejected', headers: {} }; }
      finally { clearTimeout(timer); }
    }, options);
    partial.probe = { outcome: probe.outcome, status: probe.status, responseType: probe.responseType, finalUrl: probe.finalUrl ? safeUrl(probe.finalUrl) : null };
    stage = 'entry-window';
    await page.waitForTimeout(options.timeoutMs);
    collecting = false;
    await Promise.all(pending);
    const pageRequests = requests.filter(request => request.owner === 'page' && request.match === 'exact');
    const workerRequests = requests.filter(request => request.owner === 'worker' && request.match === 'exact');
    const entryState = entries.length > 1 ? 'ambiguous' : entries.length === 1 ? 'observed' : 'missing';
    const headerState = (values, known) => !known ? { state: 'unknown' } : values.length > 1 ? { state: 'ambiguous' }
      : values.length === 1 ? { state: 'observed', value: values[0] } : { state: 'missing' };
    const privilegedResponses = requests.filter(request => request.outcome === 'resolved' && !request.redirectedTo && (request.owner === 'worker' || request.owner === 'page' && request.fromServiceWorker === false));
    const headers = options.headers.map(name => {
      const networkValues = [...new Set(privilegedResponses.flatMap(request => name in request.headers ? [request.headers[name]] : []))];
      const network = headerState(networkValues, privilegedResponses.length > 0);
      const pageHeader = headerState(name in probe.headers ? [probe.headers[name]] : [], probe.outcome === 'resolved');
      const worker = headerState(entries.flatMap(entry => name in entry.headers ? [entry.headers[name]] : []), entryState === 'observed');
      return { name, network, page: pageHeader, worker,
        visibility: network.state === 'observed' && pageHeader.state === 'missing' && worker.state === 'missing' ? 'filtering-observed' : worker.state === 'observed' ? 'worker-visible' : 'unknown' };
    });
    const report = assess({
      input: { pageUrl: safeUrl(options.pageUrl), documentUrl: safeUrl(documentUrl), workerUrl: safeUrl(options.workerUrl), probeUrl: safeUrl(options.probeUrl), method: 'GET', probeMode: options.probeMode ?? 'default', timeoutMs: options.timeoutMs, requestedHeaders: options.headers },
      registration: { state: registrationState.supported ? registrationState.items.length ? 'observed' : 'missing' : 'unknown', items: registrationState.items.map(item => ({ ...item, scope: safeUrl(item.scope), scriptUrl: item.scriptUrl ? safeUrl(item.scriptUrl) : null })) },
      controller: { state: registrationState.controller ? 'observed' : 'missing', scriptUrl: registrationState.controller ? safeUrl(registrationState.controller) : null, expected: registrationState.controller === options.workerUrl, transitions },
      probe: { outcome: probe.outcome, ...(probe.status === undefined ? {} : { status: probe.status, responseType: probe.responseType }), finalUrl: probe.finalUrl ? safeUrl(probe.finalUrl) : null },
      network: { state: pageRequests.length > 1 || workerRequests.length > 1 ? 'ambiguous' : requests.length ? 'observed' : 'unknown', requests: requests.map(({ headers: _headers, ...request }) => request), handling: pageRequests.some(request => request.fromServiceWorker) ? 'service-worker-observed' : 'unknown', redirectChain: requests.some(request => request.redirectedTo) ? 'observed' : probe.finalUrl && probe.finalUrl !== options.probeUrl ? 'unknown' : 'none-observed' },
      entry: { state: entryState, count: entries.length, malformedCount: malformed, observations: entries.map(({ headers: _headers, ...entry }) => ({ ...entry, outcome: entry.outcome === 'opaque-or-unknown' && probe.responseType === 'opaque' ? 'opaque' : entry.outcome })) },
      headers,
      limits: ['One explicit GET URL in a fresh context.', 'Missing entry does not establish missing service worker handling.', 'Timing is worker Fetch duration, not Web Vitals or browser timing phases.', 'Network header evidence depends on browser availability.']
    });
    if (probe.outcome === 'timeout') { report.issues.push({ code: 'GET_TIMEOUT', evidencePath: 'probe' }); report.exitCode = 1; }
    return report;
  } catch {
    return { schemaVersion: 1, ...partial, collection: { state: 'incomplete', stage }, issues: [{ code: 'COLLECTION_ERROR', evidencePath: 'collection' }], exitCode: 2 };
  } finally { await browser.close(); }
}
