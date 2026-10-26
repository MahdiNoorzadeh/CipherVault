# CipherVault desktop app review and implementation notes

## Scope

This is a source-level review of the supplied archive. It is not a penetration test, dependency audit, or release certification. Website/portfolio work is intentionally excluded until the desktop app is complete.

## Changes in this pass

- Removed raw Realm initialization exceptions from console output. Native errors can include local file paths; the startup handler reports a sanitized error category instead.
- Closed the Realm instance during application shutdown on a best-effort basis.
- Removed verbose main-process logging of absolute icon paths and local development renderer URLs.
- Removed duplicate Electron Builder configuration from `package.json`; `electron-builder.yml` is now the single configuration source.
- Made the build/cache cleanup scripts work across Windows and other Node-supported environments without adding a dependency.
- Added a `npm run check` syntax-check script for the main-process and security modules.
- Corrected the README preload filename and updated build documentation to match esbuild minification.
- Kept existing crypto record format and PBKDF2 parameters unchanged for compatibility with existing vault data.

## Existing controls observed

- Context isolation and sandboxing are enabled; renderer Node integration is disabled.
- IPC calls are restricted to the trusted main frame and expected local renderer URL.
- New windows are denied and navigation is restricted.
- Token values are encrypted before persistence and are omitted from normal token-list responses.
- Clipboard cleanup clears only the exact value CipherVault copied, avoiding deletion of newer clipboard contents.
- Secure logs use allowlisted event names and metadata fields.
- Batch deletion validates and resolves all requested tokens before mutating the database.
- Reduced-motion styling and visible focus indicators are present.

## Validation performed in the review environment

- Source archive paths were normalized and inspected.
- `node --test --test-force-exit`: 38 tests passed; the Realm CRUD integration test could not load because the archive does not include installed dependencies (`realm`). This is an environment limitation, not a passing integration test.
- Full build, native module behavior, packaged Electron launch, installer behavior, OS keyring access, and real clipboard behavior were not verified because dependencies and a packaged Windows runtime were not available.
- `npm audit --omit=dev` was not run successfully in this environment; the prior audit report documents a registry `ECONNRESET`. Dependency vulnerability status remains unverified.

## Follow-up source review changes

- Removed the remaining production console message that exposed the absolute renderer path.
- Added accessible names and titles to token reveal/copy/edit/delete icon buttons, and polite live-region semantics to snackbar feedback.
- Aligned the CSP image policy with the documented HTTPS custom-icon URL feature. This allows HTTPS image requests only; it does not permit remote scripts or connections, but external image hosts can observe requests and associated network metadata.
- Corrected README recovery guidance: do not delete the Realm database to troubleshoot keyring errors; back up the data directory and preserve the matching OS keyring key.
- Updated build optimization notes to reflect esbuild and the actual renderer/main-process split.
- Made `clean:cache` select the conventional electron-builder cache directory by OS.
- Added `APP-REMAINING-CHECKLIST.md` with installed-build smoke tests and release hygiene.

## Remaining release blockers / follow-up

1. Run `npm ci`, `npm run check`, `npm test`, `npm run test:crud`, `npm run build`, and `npm run electron:build` on the Windows development machine.
2. Re-run `npm audit --omit=dev` on a working registry connection and review the actual report before upgrading packages.
3. Smoke-test keyring failure, existing-vault preservation, restart persistence, CRUD, and clipboard timeout against a packaged build.
4. Decide and design a session-lock / auto-lock model before implementing it. Do not add a superficial timer-based lock that leaves plaintext values or an accessible master key in the renderer.
5. Consider a migration plan for future cryptographic format/parameter changes; this pass intentionally preserves the existing ciphertext format for compatibility.
6. Review and validate any future external icon or URL feature before permitting network access. Current CSP permits image requests to `cdn.simpleicons.org`; verify that this network dependency is intentional for the offline/local-first product.

## Important operational note

Do not delete `ciphervault.realm` as a troubleshooting step unless the user explicitly intends to destroy that vault and has confirmed a backup. Losing the OS keyring key may make the existing encrypted token values unrecoverable.
