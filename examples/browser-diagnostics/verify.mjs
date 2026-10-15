import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { startFixture } from './test/fixture.mjs';

const execute = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), 'perf-diagnostic-consumer-'));
const env = { ...process.env };
delete env.NODE_OPTIONS;
const fixture = await startFixture();
const receipts = [];
try {
  const artifact = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', directory], { env, encoding: 'utf8' }))[0];
  await writeFile(join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', join(directory, artifact.filename)], { cwd: directory, env, stdio: 'pipe' });
  const installed = join(directory, 'node_modules/perf-observer-browser-diagnostics');
  const { diagnose } = await import(pathToFileURL(join(installed, 'diagnose.mjs')));
  const base = { pageUrl: fixture.origin + '/controlled', workerUrl: fixture.origin + '/worker.js', probeUrl: fixture.origin + '/probe/200?proof=positive', timeoutMs: 500,
    executablePath: process.env.PERF_DIAGNOSTIC_CHROME };
  const check = async (name, options, expectedRegistrations, verify) => {
    fixture.audit.length = 0;
    const report = await diagnose({ ...base, ...options });
    verify(report);
    assert.equal(fixture.audit.filter(method => method === 'register').length, expectedRegistrations, `${name} only fixture app registers`);
    assert.equal(fixture.audit.filter(method => method !== 'register').length, 0, `${name} no update or unregister`);
    receipts.push({ name, exitCode: report.exitCode, probe: report.probe, entry: report.entry, network: report.network, headers: report.headers, registrationCalls: [...fixture.audit] });
    return report;
  };
  const positive = await check('actual packed monitor', { headers: ['x-diagnostic-id'] }, 1, report => {
    assert.equal(report.exitCode, 0); assert.equal(report.entry.state, 'observed');
    assert.equal(report.probe.status, 200); assert.equal(report.network.handling, 'service-worker-observed');
    assert.equal(report.headers[0].worker.value, 'fixture-request');
  });
  assert(!JSON.stringify(positive).includes('proof=positive'));
  await check('default header minimization', {}, 1, report => { assert.deepEqual(report.headers, []); assert(!JSON.stringify(report).includes('fixture-request')); });
  await check('no registration', { pageUrl: fixture.origin + '/plain', timeoutMs: 150 }, 0, report => { assert.equal(report.registration.state, 'missing'); assert.equal(report.entry.state, 'missing'); assert.equal(report.probe.status, 200); assert.equal(report.exitCode, 1); });
  await check('wrong scope', { pageUrl: fixture.origin + '/wrong-scope', workerUrl: fixture.origin + '/elsewhere/worker.js', timeoutMs: 200 }, 1, report => { assert(report.registration.items.some(item => item.expected && !item.coversPage)); assert.equal(report.controller.expected, false); });
  await check('controlled without entry', { pageUrl: fixture.origin + '/silent', workerUrl: fixture.origin + '/silent.js' }, 1, report => { assert.equal(report.controller.expected, true); assert.equal(report.entry.state, 'missing'); assert.equal(report.probe.status, 200); });
  for (const status of [404, 500]) await check(`resolved HTTP ${status}`, { probeUrl: fixture.origin + `/probe/${status}?proof=http` }, 1, report => { assert.equal(report.probe.outcome, 'resolved'); assert.equal(report.probe.status, status); assert.equal(report.entry.observations[0].outcome, 'resolved'); assert.equal(report.entry.observations[0].status, status); assert.equal(report.exitCode, 1); });
  await check('rejected GET', { probeUrl: fixture.origin + '/probe/reject?proof=rejected' }, 1, report => { assert.equal(report.probe.outcome, 'rejected'); assert.equal(report.entry.observations[0].status, 0); assert.equal(report.entry.observations[0].outcome, 'rejected'); });
  await check('opaque GET', { probeUrl: fixture.crossOrigin + '/hidden?proof=opaque', probeMode: 'no-cors' }, 1, report => { assert.equal(report.probe.status, 0); assert.equal(report.probe.responseType, 'opaque'); assert.equal(report.entry.observations[0].outcome, 'opaque'); });
  await check('bounded GET timeout', { probeUrl: fixture.origin + '/probe/timeout?proof=timeout', timeoutMs: 200 }, 1, report => { assert.equal(report.probe.outcome, 'timeout'); assert.equal(report.exitCode, 1); });
  for (const exposed of [false, true]) await check(exposed ? 'CORS exposed' : 'CORS hidden', { probeUrl: fixture.crossOrigin + (exposed ? '/exposed' : '/hidden') + '?proof=cors', headers: ['x-diagnostic-id'] }, 1, report => {
    assert.equal(report.headers[0].network.value, 'cross-request');
    assert.equal(report.headers[0].page.state, exposed ? 'observed' : 'missing');
    assert.equal(report.headers[0].worker.state, exposed ? 'observed' : 'missing');
    assert.equal(report.headers[0].visibility, exposed ? 'worker-visible' : 'filtering-observed');
  });
  await check('iframe messages excluded', { pageUrl: fixture.origin + '/iframe', probeUrl: fixture.origin + '/probe/200?case=iframe' }, 1, report => { assert.equal(report.entry.state, 'observed'); assert.equal(report.entry.count, 1); assert.equal(report.exitCode, 0); });
  await check('direct redirect chain', { pageUrl: fixture.origin + '/plain', timeoutMs: 150, probeUrl: fixture.origin + '/probe/redirect?proof=redirect' }, 0, report => { assert.equal(report.probe.status, 200); assert(report.network.requests.some(request => request.redirectedTo)); assert(!JSON.stringify(report).includes('private')); });
  await check('worker redirect final URL', { probeUrl: fixture.origin + '/probe/redirect?proof=redirect' }, 1, report => { assert.equal(report.probe.status, 200); assert.match(report.probe.finalUrl, /\/probe\/200/); assert(!JSON.stringify(report).includes('private')); });
  await check('malformed entry', { pageUrl: fixture.origin + '/malformed', workerUrl: fixture.origin + '/malformed.js' }, 1, report => { assert.equal(report.entry.state, 'missing'); assert.equal(report.entry.malformedCount, 1); });
  await check('ambiguous entries', { pageUrl: fixture.origin + '/ambiguous', workerUrl: fixture.origin + '/ambiguous.js' }, 1, report => { assert.equal(report.entry.state, 'ambiguous'); assert.equal(report.exitCode, 1); });
  await check('overlapping application GET', { pageUrl: fixture.origin + '/overlap', probeUrl: fixture.origin + '/probe/200?case=overlap' }, 1, report => { assert.equal(report.network.state, 'ambiguous'); assert.equal(report.entry.state, 'ambiguous'); });
  const cli = async args => {
    try { const result = await execute(process.execPath, [join(installed, 'cli.mjs'), ...args], { cwd: directory, env }); return { code: 0, output: result.stdout }; }
    catch (error) { return { code: error.code, output: error.stdout }; }
  };
  const cliArgs = ['--page', base.pageUrl, '--worker', base.workerUrl, '--probe', base.probeUrl, '--timeout-ms', '500'];
  const success = await cli(cliArgs); assert.equal(success.code, 0); assert.equal(JSON.parse(success.output).entry.state, 'observed');
  const text = await cli([...cliArgs, '--format', 'text']); assert.match(text.output, /Entry observed/);
  const failure = await cli(['--page', fixture.origin + '/plain', '--worker', base.workerUrl, '--probe', base.probeUrl, '--timeout-ms', '150']); assert.equal(failure.code, 1);
  const invalid = await cli(['--page', 'https://user:secret@example.com/']); assert.equal(invalid.code, 2); assert(!invalid.output.includes('secret'));
  const unavailable = await cli(['--page', 'http://127.0.0.1:1/?token=secret', '--worker', base.workerUrl, '--probe', base.probeUrl, '--timeout-ms', '150']); assert.equal(unavailable.code, 2); assert(!unavailable.output.includes('secret'));
  console.log(JSON.stringify({ status: 'PASS', packedTool: artifact.shasum, cases: receipts, installedCliExits: [success.code, failure.code, invalid.code, unavailable.code] }, null, 2));
} finally { await fixture.close(); await rm(directory, { recursive: true, force: true }); }
