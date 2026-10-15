# Changelog

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
