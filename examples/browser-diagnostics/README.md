# Diagnose one monitored GET in Chrome

Run the setup commands from the repository root. Use Node.js 20 or newer. Run this tool against an application that already registers the perf-observer-js worker. It observes registrations, page control, one deliberate GET, and a matching raw `PERFORMANCE_ENTRY` message.

```sh
npm ci
cd examples/browser-diagnostics
node setup.mjs --install-only
npx playwright install chromium
node cli.mjs --page http://localhost:3000/ --worker http://localhost:3000/worker.js \
  --probe 'http://localhost:3000/diagnostic-get?case=unique-123' --header x-request-id
```

Use a GET route intended for a diagnostic request. The tool sends the supplied URL unchanged. Use a unique query value to reduce ambiguity with application traffic. The tool opens a fresh context without saved login state. It observes the application's own worker setup and waits for control. It does not register, update, unregister, or reload a worker.

Set `PERF_DIAGNOSTIC_CHROME` to an installed Chrome executable to use it instead of Playwright Chromium. On macOS the usual path is `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

## Read the result

The default output is JSON with `schemaVersion: 1`. Use `--format text` for a compact result. `--timeout-ms` sets each bounded navigation, controller, GET, and message wait. The default is 3000 milliseconds. Total run time can exceed that value because these waits are sequential. `--mode no-cors` explicitly requests an opaque cross-origin GET. The default preserves Fetch's default mode.

The report records these independent observations.

| Field | Meaning |
| --- | --- |
| `registration` | Existing scopes and worker scripts, with expected-script and page-scope matches. |
| `controller` | Current page controller and observed controller transitions. |
| `probe` | Page Fetch outcome, status, response type, and redacted final URL. |
| `network` | Exact-URL GET requests in the observation window, with page or worker ownership and service-worker response evidence. |
| `entry` | Matching valid raw messages, their statuses and worker Fetch durations, or missing or ambiguous evidence. |
| `headers` | Only explicitly requested header names, in separate privileged network, page Fetch, and worker entry channels. |
| `issues` | Failed expectations with stable codes and evidence paths. |

HTTP 404 and 500 are resolved responses and diagnostic issues. A rejected request is distinct from a resolved opaque response with status 0. Missing entry delivery does not establish that a worker failed to handle the request. Duplicate plausible entries or requests are ambiguous.

A header present in a worker-owned privileged response but absent from page Fetch and the entry records observed filtering. The report does not infer server omission when privileged evidence is unavailable. This evidence does not establish a particular server CORS configuration as the cause.

Exit 0 means the requested checks were observed. Exit 1 means a completed diagnostic found missing, failed, or ambiguous expectations. Exit 2 means invalid input or a browser collection error. Exit 0 does not establish application health.

## Data exported

The tool rejects credential-bearing input URLs. Exported URLs omit fragments and redact query values. It does not export cookie values, arbitrary headers, response bodies, or raw browser error strings. Header values appear only when you explicitly request their names with repeated `--header` flags. Avoid requesting sensitive headers in reports you plan to share.

This tool reports one GET observation. It does not measure Web Vitals, complete request coverage, or browser resource timing phases. The worker's duration wraps Fetch.

## Use the library

```js
import { diagnose } from 'perf-observer-browser-diagnostics';

const report = await diagnose({
	pageUrl: 'http://localhost:3000/',
	workerUrl: 'http://localhost:3000/worker.js',
	probeUrl: 'http://localhost:3000/diagnostic-get?case=unique-123',
	headers: ['x-request-id'],
	timeoutMs: 3000,
});
```

The example package is private and is not published to npm. Pack this directory and install its tarball to use the library by package name. From a repository checkout, run `npm run verify` in this directory. The setup packs the root monitor, installs its actual tarball, then verifies an independently packed diagnostic CLI in a temporary consumer directory. It runs private two-origin browser fixtures and leaves the target application's registrations to the application.
