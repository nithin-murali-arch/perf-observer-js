# Changelog

## 2.3.1 (2026-10-15)

- README gained npm downloads, license, types and bundle size badges
- README gained framework guides for React, Next.js App Router, Vue 3, Svelte 5 and Angular, and a recipe that sends entries to an analytics endpoint with `navigator.sendBeacon`. The Next.js setup now links to its guide, which calls `disconnect()` on cleanup instead of only `unsubscribe()`.

## 2.3.0 (2026-10-15)

- `disconnect()` now removes the page's `message` listener from `navigator.serviceWorker`. Before, each monitor left its listener behind. A `disconnect()` that runs before registration finishes, as in React StrictMode, also stops the listener from being added. `disconnect()` is terminal, so create a new monitor to start again.
- the worker posts each entry only to the page that made the request. Before, every tab received the requests of all controlled tabs. Requests made before the worker controls the page are not reported.
- removed the `DISCONNECT` message. The worker never handled it, because `self.close()` does not exist in a service worker, and `disconnect()` skipped it on a fresh install. A new worker ignores `DISCONNECT` from an older library, and a new library sends none.

## 2.2.5 (2026-10-15)

- `main` and `types` now point at `dist/index`, so `PerformanceEntryWithHeaders`, `PerformanceMonitorConfig` and `Subscription` can be imported from `perf-observer-js`
- removed `toJSON` from the `PerformanceEntryWithHeaders` type, because the worker never attaches it to entries
- the published package now contains only `dist`, `public`, the README, the license and the changelog (no `examples`, `tests` or `src`)
- README rewritten: states that the package monitors service worker requests and does not measure Web Vitals, fixes the install name, documents which entry fields are measured and which `timing` fields are placeholders, corrects the Next.js setup, and replaces the browser version list
- release workflow skips `npm publish` when the version already exists on npm

## 2.2.4 (2026-10-02)

- repository/bugs/homepage metadata added
- CI moved to Node 22/24 with actions v4 plus build step
- ESLint 9 added
- audit fixes (18 to 1, brace-expansion high remains, breaking-only fix)
- repository.url uses the plain GitHub URL form (trusted publishing requires an exact match)
