import assert from 'node:assert/strict';
import test from 'node:test';
import { validateOptions } from '../diagnose.mjs';
import { safeUrl } from '../report.mjs';

const options = { pageUrl: 'https://example.com/', workerUrl: 'https://example.com/worker.js', probeUrl: 'https://example.com/probe?token=secret' };

test('all public URL values redact credentials and query values', () => {
  assert.equal(safeUrl('https://user:secret@example.com/a?token=secret&token=second#secret'), 'https://example.com/a?token=%5Bredacted%5D');
  assert.equal(validateOptions(options).probeUrl, options.probeUrl);
});

test('boundary rejects credential URLs, unsupported protocols, unsafe headers, and unbounded waits', () => {
  for (const pageUrl of ['https://user:secret@example.com/', 'file:///etc/passwd', 'https://example.com/#fragment']) assert.throws(() => validateOptions({ ...options, pageUrl }));
  for (const timeoutMs of [0, 49, 60001, Infinity, '3000']) assert.throws(() => validateOptions({ ...options, timeoutMs }));
  for (const headers of [['x-id\r\ncookie'], [''], [4], 'x-id']) assert.throws(() => validateOptions({ ...options, headers }));
  assert.deepEqual(validateOptions({ ...options, headers: ['X-ID', 'x-id'] }).headers, ['x-id']);
});
