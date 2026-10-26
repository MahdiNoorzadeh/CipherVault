# CipherVault final app verification checklist

This checklist closes the remaining application work before the portfolio website is resumed. Source changes are not a substitute for testing the installed application on the target OS.

## Automated checks (Windows PowerShell)

Run from the repository root after `npm ci`:

```powershell
npm run check
npm test
npm run test:crud
npm run build
npm run electron:build
```

Expected results: all syntax checks pass; all tests pass; Vite builds; electron-builder produces the Windows x64 NSIS installer. Review npm deprecation and blocked-install-script warnings; do not bypass npm security controls without understanding why a package script is needed.

## Installed-build smoke test

- [ ] Install the generated NSIS installer into a non-admin per-user location.
- [ ] Launch CipherVault and confirm the existing projects, environments, and tokens are present.
- [ ] Create, edit, reveal, copy, hide, and delete a test token; verify the actual token value is unchanged after save/reload.
- [ ] Verify token copy clears after the timeout only if the clipboard still contains the exact value CipherVault copied; copy unrelated text afterward and confirm it is not cleared.
- [ ] Close and relaunch the app; verify vault persistence.
- [ ] Confirm dark/light themes, project selection, environment tabs, search, batch deletion, keyboard shortcuts, and custom icon upload work.
- [ ] Confirm keyboard-only use: focus indicators are visible, dialogs can be opened/closed, context menus work with Shift+F10/arrow keys/Escape, and icon-only buttons have useful accessible names.
- [ ] Test a custom HTTPS icon and a locally uploaded icon. External images disclose a request to the image host; use local uploads if that is undesirable.
- [ ] Confirm no unexpected navigation, pop-up window, DevTools, or renderer error appears in the packaged build.
- [ ] Test keyring failure only with a disposable Windows user/profile or isolated test environment. Never remove the keyring entry or vault database for the real vault as a test.

## Release hygiene

- [ ] Run `npm audit --omit=dev` on a working npm registry connection and review the full report; registry failures are not a clean audit.
- [ ] Check the installer and executable hashes and scan the artifacts with the normal endpoint protection tooling.
- [ ] Decide whether to sign Windows releases. Unsigned installers can trigger SmartScreen warnings; do not claim the app is signed unless a valid signing certificate was used.
- [ ] Keep the database and keyring recovery warning in the README. A vault backup without its matching OS keyring key may not decrypt.
- [ ] Commit only reviewed source and documentation files; keep build output, audit dumps, backups, and duplicate scratch files out of Git.

## Deferred by design

Auto-lock/session locking is not included. It needs a deliberate unlock/session-key lifecycle design rather than a timer that only hides the UI while plaintext remains accessible in memory.
