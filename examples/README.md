# Network monitoring examples

Run `npm run verify` from the repository root. It packs this package, installs the tarball in `network-recipes`, type-checks every TypeScript example, builds the browser page, and checks it in Chrome.

The top-level files illustrate subscriptions, transformations, React cleanup, and a monitoring service. Copy the packed worker to `/worker.js` before using them. Create monitors in the browser only, and wait for service worker control before making requests you need to observe.

The [slow request overlay](slow-request-overlay/overlay.ts) lists delayed requests and request IDs. [Network recipes](network-recipes) provide cache and deprecation header checks. [RUM adapters](rum-integrations) forward entries to an OpenTelemetry collector and the Datadog public `addAction` API.

[Browser diagnostics](browser-diagnostics) observes an existing worker, one explicit GET, message delivery, and selected header visibility in Chrome. It includes a standalone CLI and private browser verification fixtures.
