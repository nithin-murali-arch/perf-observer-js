export function safeUrl(value) {
  const url = new URL(value);
  url.username = '';
  url.password = '';
  for (const key of [...url.searchParams.keys()]) url.searchParams.set(key, '[redacted]');
  url.hash = '';
  return url.href;
}

export function assess(evidence) {
  const issues = [];
  const add = (code, evidencePath) => issues.push({ code, evidencePath });
  const registrations = evidence.registration;
  if (!registrations.items.some(item => item.expected && item.coversPage)) add('EXPECTED_REGISTRATION_MISSING', 'registration');
  if (!evidence.controller.expected) add('EXPECTED_CONTROLLER_MISSING', 'controller');
  if (evidence.probe.outcome === 'rejected') add('GET_REJECTED', 'probe');
  if (evidence.probe.outcome === 'resolved' && evidence.probe.status >= 400) add('GET_HTTP_ERROR', 'probe.status');
  if (evidence.entry.state !== 'observed') add(`ENTRY_${evidence.entry.state.toUpperCase()}`, 'entry');
  if (evidence.network.state === 'ambiguous') add('NETWORK_AMBIGUOUS', 'network');
  for (const header of evidence.headers) {
    if (header.worker.state !== 'observed') add(`EXPECTED_HEADER_${header.worker.state.toUpperCase()}`, `headers.${header.name}.worker`);
  }
  return { schemaVersion: 1, ...evidence, issues, exitCode: issues.length ? 1 : 0 };
}

export function renderText(report) {
  return [
    `Browser diagnostic schema ${report.schemaVersion}. Exit ${report.exitCode}.`,
    `Page ${report.input.pageUrl}`,
    `Registration ${report.registration.state}. Controller ${report.controller.state}${report.controller.state === 'observed' ? report.controller.expected ? ' (expected)' : ' (unexpected)' : ''}.`,
    `GET ${report.probe.outcome}${report.probe.status === undefined ? '' : ` HTTP ${report.probe.status}`}. Entry ${report.entry.state}.`,
    ...report.headers.map(header => `${header.name}: page ${header.page.state}, worker ${header.worker.state}, network ${header.network.state}, visibility ${header.visibility}.`),
    ...report.issues.map(issue => `${issue.code} at ${issue.evidencePath}`),
    'One explicit GET observation. No Web Vitals or complete request coverage claim.'
  ].join('\n');
}
