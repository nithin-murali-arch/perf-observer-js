#!/usr/bin/env node
import { diagnose, validateOptions } from './diagnose.mjs';
import { renderText, safeUrl } from './report.mjs';

const help = `Usage: perf-observer-diagnose --page URL --worker URL --probe URL [--header NAME] [--format json|text] [--timeout-ms NUMBER] [--mode cors|no-cors|same-origin]

Observe an application's existing service worker and one explicit GET.
The probe URL is sent unchanged. Supply a unique URL to reduce ambiguity.
The tool does not register, unregister, update, or reload workers.
Header values are exported only for explicitly requested header names.
All exported URL query values are redacted. A fresh context has no saved login.
Set PERF_DIAGNOSTIC_CHROME to an installed Chrome executable if needed.
Exit 0: requested observations satisfied. Exit 1: diagnostic issues. Exit 2: invalid input or collection error.
No Web Vitals or complete request coverage claim.`;

function parse(args) {
  const options = { headers: [] };
  const names = { '--page': 'pageUrl', '--worker': 'workerUrl', '--probe': 'probeUrl', '--timeout-ms': 'timeoutMs', '--mode': 'probeMode', '--format': 'format' };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!['--header', ...Object.keys(names)].includes(flag) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('INVALID_ARGUMENT');
    const value = args[++i];
    if (flag === '--header') options.headers.push(value);
    else {
      if (names[flag] in options) throw new Error('DUPLICATE_ARGUMENT');
      options[names[flag]] = flag === '--timeout-ms' ? Number(value) : value;
    }
  }
  if (options.format && !['json', 'text'].includes(options.format)) throw new Error('INVALID_FORMAT');
  return validateOptions(options);
}

if (process.argv.includes('--help')) {
  console.log(help);
} else {
  let options;
  try {
    options = parse(process.argv.slice(2));
    const report = await diagnose({ ...options, executablePath: process.env.PERF_DIAGNOSTIC_CHROME });
    console.log(options.format === 'text' ? renderText(report) : JSON.stringify(report, null, 2));
    process.exitCode = report.exitCode;
  } catch {
    const report = { schemaVersion: 1, exitCode: 2, error: { code: options ? 'COLLECTION_ERROR' : 'INVALID_INPUT' },
      ...(options ? { input: { pageUrl: safeUrl(options.pageUrl), workerUrl: safeUrl(options.workerUrl), probeUrl: safeUrl(options.probeUrl) } } : {}) };
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 2;
  }
}
