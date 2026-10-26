# Build Optimization & Memory Improvements

This document outlines the optimizations made to CipherVault for better build performance and reduced memory usage.

## Build Issues Fixed

### 1. Electron Builder Code Signing Errors
- **Issue**: Build was failing due to code signing tool extraction errors on Windows
- **Solution**: Disabled code signing for development builds in `electron-builder.yml`
  - Set `sign: null` to skip signing
  - Added `signAndEditExecutable: false` for Windows
  - Added `identity: null` for macOS

### 2. Symbolic Link Errors
- **Issue**: Windows requires admin privileges to create symbolic links for macOS tools
- **Solution**: Build only for Windows platform by default (`--win` flag)
  - Use `npm run electron:build` for Windows only
  - Use `npm run electron:build:all` for all platforms (requires admin on Windows)

### 3. Checksum Mismatches
- **Issue**: Corrupted downloads in electron-builder cache
- **Solution**: Clear cache if issues persist:
  ```bash
  npm run clean:cache
  ```
  Or manually delete: `%LOCALAPPDATA%\electron-builder\Cache`

## Memory Optimizations

### 1. Code Splitting
- **Vite Configuration**: Added manual chunks for better code splitting
  - `vuetify`: Separated Vuetify library
  - `vue-vendor`: Separated Vue core
  - Realm and Keytar remain in the Electron main process and are not renderer chunks
- **Result**: Smaller initial bundle, faster load times, better memory usage

### 2. Lazy Component Loading
- **App.vue**: Changed to use `defineAsyncComponent` for:
  - `ProjectSidebar`
  - `TokenManager`
- **Result**: Components load only when needed, reducing initial memory footprint

### 3. Build Optimizations
- **Terser Minification**: Enabled with console.log removal in production
- **CSS Code Splitting**: Enabled for better caching
- **Chunk Size Warning**: Increased to 1000KB (fonts are large)
- **Target**: Set to `esnext` for modern JavaScript

### 4. Electron Window Optimizations
- **Background Color**: Set to match dark theme (prevents white flash)
- **Show on Ready**: Window only shows when ready (prevents visual glitches)
- **Disabled Features**:
  - Spellcheck (saves memory)
  - Remote module (security + memory)
  - WebSQL (unused feature)
- **Background Throttling**: Enabled to reduce CPU usage when minimized

### 5. Font Optimization
- **Minified CSS**: Using `materialdesignicons.min.css` instead of full version
- **Note**: Font files are still large (~2MB) but are loaded asynchronously

## Build Commands

```bash
# Development
npm run electron:dev

# Build for Windows only (recommended)
npm run electron:build

# Build for all platforms (may require admin on Windows)
npm run electron:build:all

# Clean build artifacts
npm run clean:build

# Clear electron-builder cache (if build fails)
npm run clean:cache
```

## Memory Usage Tips

1. **Close DevTools in Production**: DevTools consume significant memory
2. **Limit Open Projects**: Large numbers of projects/tokens may increase memory
3. **Regular Restarts**: For long-running sessions, restart occasionally
4. **Monitor Memory**: Use Task Manager to monitor memory usage

## Expected Memory Usage

- **Idle**: ~100-150 MB
- **With Projects**: ~150-250 MB
- **With DevTools**: ~250-400 MB

## Troubleshooting

### Build Still Fails
1. Clear electron-builder cache: `npm run clean:cache`
2. Delete `node_modules` and reinstall: `npm install`
3. Run as Administrator (for Windows builds)
4. Check disk space (builds require ~500MB free)

### High Memory Usage
1. Close DevTools
2. Restart the application
3. Check for memory leaks in console
4. Reduce number of open projects/tokens

### Slow Performance
1. Disable hardware acceleration if causing issues
2. Check for background processes
3. Ensure sufficient RAM (4GB minimum, 8GB recommended)

## Future Optimizations

Potential improvements:
- [ ] Tree-shake Vuetify components more aggressively
- [ ] Use icon subset instead of full MDI font
- [ ] Implement virtual scrolling for large token lists
- [ ] Add service worker for offline caching
- [ ] Optimize Realm queries for better performance



## Release verification status

The source archive review includes static checks and unit tests, but it does not include `node_modules` or a packaged Electron runtime. Do not treat the expected memory figures above as measured benchmarks; measure them on supported target machines before publishing them as guarantees.

Before each release, run these commands from the project root on Windows:

```powershell
npm ci
npm run check
npm test
npm run test:crud
npm run build
npm run electron:build
npm audit --omit=dev
```

Confirm that the packaged app starts, creates a test vault, can create/reveal/copy/update/delete a token, preserves the vault after restart, and fails safely if the OS keyring is unavailable. Confirm that the clipboard timer does not clear text copied by another application. Verify the installer and uninstall flow on a clean Windows test account.

The npm audit status remains unverified if the registry audit endpoint fails. Do not disable TLS verification to bypass that failure.
