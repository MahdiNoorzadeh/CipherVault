# CipherVault Phase 1 Security Audit — Preliminary Notes

Scope: source archive supplied for review. These are source-level findings; this is not a penetration test or a claim of release certification.

## Controls observed
- Main-process IPC wrapper validates the sender webContents, main frame, and expected renderer URL.
- BrowserWindow uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`.
- `setWindowOpenHandler` denies new windows and `will-navigate` blocks non-allowlisted navigation.
- Token values are encrypted before persistence and decrypted only for explicit reveal/copy operations.
- Batch deletion resolves and scopes all token IDs before mutating the Realm database.
- Secure logging uses an allowlist for events and metadata fields.

## Findings to address/verify
1. `src/main/keytar-manager.js` originally logged raw keytar exceptions and success messages. Raw errors are now suppressed in this patch; callers already fail closed if keyring access is unavailable.
2. `src/main/realm-config.js` logs raw Realm exceptions. Replace with a sanitized error category in a follow-up if diagnostic requirements permit; do not print full error objects in production.
3. There is no explicit external-link allowlist/`shell.openExternal` flow in the reviewed preload API. New windows are denied. If external links are added later, validate HTTPS and an explicit hostname allowlist in main process.
4. Existing tests cover unit-level validation, crypto, logging, batch-delete, shortcuts, and search, but did not include a full Realm CRUD lifecycle.
5. The new CRUD integration test opens a temporary Realm database, uses synthetic test data and a test-only key, and removes its temporary directory in `finally`. It does not exercise the app's IPC wrapper or the user's real vault.
6. Dependency advisories and the packaged production application still need to be checked on the developer machine with the current lockfile and native Electron/Realm/keytar installation.

## Commands
- `npm test`
- `npm run test:crud`
- `npm run build`
- `npm audit --omit=dev` (review results before upgrading; do not blindly force major updates)

The archive did not include `node_modules`, so these commands have not been executed against the project's installed native dependencies during this review.


### Dependency vulnerability audit — blocked by environment

**Status:** Pending — unable to complete the npm audit.

**Attempted command:**
```powershell
npm audit --omit=dev
```

**Observed result:** The npm registry audit request fails with `ECONNRESET`. The failure was reproduced using Node.js v24.19.0 with both `fetch()` and the built-in `https` module. `curl.exe` can reach the registry, but the test payload used during diagnosis was rejected with HTTP 400; this does not establish that a complete audit request succeeds.

**Environment checked:**
- npm: 12.0.2
- Node.js: v24.19.0
- OpenSSL: 3.5.7
- npm registry: `https://registry.npmjs.org/`
- npm strict SSL: enabled
- npm proxy configuration: unset
- WinHTTP proxy: direct access

**Security decision:** TLS certificate verification remains enabled. No security controls were weakened to work around the connection failure.

**Follow-up:** Retry `npm audit --omit=dev` in a working network environment. Review and resolve any reported production dependency vulnerabilities before considering the dependency audit complete.

**Limitation:** The dependency vulnerability status remains unverified. This is not evidence that the dependencies are vulnerability-free.
