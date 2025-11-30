# CipherVault Setup Guide

This guide will walk you through setting up CipherVault on your system, including installation, configuration, and troubleshooting.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Development Setup](#development-setup)
4. [Production Build](#production-build)
5. [Troubleshooting](#troubleshooting)
6. [Platform-Specific Notes](#platform-specific-notes)

## System Requirements

### Minimum Requirements

- **Operating System**: Windows 10+, macOS 10.13+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 500MB free space

### Build Tools (Required for Native Modules)

CipherVault uses native Node.js modules (Keytar, Realm) that require compilation. You'll need build tools:

#### Windows

1. Install **Visual Studio Build Tools** or **Visual Studio Community**
   - Download from: https://visualstudio.microsoft.com/downloads/
   - During installation, select "Desktop development with C++"
   - Or install just the build tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/

2. Install **Python 3.x** (required by node-gyp)
   - Download from: https://www.python.org/downloads/
   - Make sure to check "Add Python to PATH" during installation

#### macOS

1. Install **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```

2. If you encounter issues, install full Xcode from the App Store

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3 libsecret-1-dev
```

#### Linux (Fedora/RHEL)

```bash
sudo dnf install -y gcc-c++ make python3 libsecret-devel
```

## Installation

### Step 1: Clone or Download the Project

If you have the project in a Git repository:
```bash
git clone <repository-url>
cd ciphervault
```

Or extract the project files to a directory of your choice.

### Step 2: Install Dependencies

Navigate to the project directory and install dependencies:

```bash
npm install
```

This will install all required packages including:
- Electron
- Vue.js and Vite
- Vuetify
- Realm
- Keytar
- And other dependencies

**Note**: The installation may take several minutes, especially when compiling native modules (Keytar, Realm).

### Step 3: Verify Installation

Check that all dependencies installed correctly:

```bash
npm list --depth=0
```

You should see all packages listed without errors.

## Development Setup

### Running in Development Mode

To run CipherVault with hot-reload and developer tools:

```bash
npm run electron:dev
```

This command:
1. Starts the Vite development server on `http://localhost:5173`
2. Waits for the server to be ready
3. Launches Electron with the development build

### Development Workflow

1. **Make changes** to Vue components in `src/components/`
2. **Save files** - Vite will automatically reload
3. **View changes** in the Electron window (auto-reloads)
4. **Use DevTools** - Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS) to open developer tools

### Running Individual Commands

If you prefer to run commands separately:

**Terminal 1** - Start Vite dev server:
```bash
npm run dev
```

**Terminal 2** - Start Electron (after Vite is running):
```bash
npm run electron
```

## Production Build

### Building the Application

To create a production build:

```bash
npm run electron:build
```

This will:
1. Build the Vue application (outputs to `dist/`)
2. Package the Electron application
3. Create distributable files in `dist/` directory

### Build Output

After building, you'll find:
- **Windows**: `.exe` installer and unpacked files
- **macOS**: `.dmg` file and `.app` bundle
- **Linux**: `.AppImage`, `.deb`, or `.rpm` depending on configuration

### Running the Production Build

After building, you can run the application directly:

**Windows**:
```bash
.\dist\win-unpacked\CipherVault.exe
```

**macOS**:
```bash
open dist/mac/CipherVault.app
```

**Linux**:
```bash
./dist/linux-unpacked/ciphervault
```

## Troubleshooting

### Issue: Keytar Installation Fails

**Symptoms**: Error during `npm install` related to Keytar compilation

**Solutions**:

1. **Windows**:
   - Ensure Visual Studio Build Tools are installed
   - Run: `npm config set msvs_version 2019` (or your VS version)
   - Try: `npm install --build-from-source keytar`

2. **macOS**:
   - Ensure Xcode Command Line Tools are installed
   - Run: `xcode-select --reset`
   - Try: `npm install --build-from-source keytar`

3. **Linux**:
   - Install `libsecret-1-dev`: `sudo apt-get install libsecret-1-dev`
   - Try: `npm install --build-from-source keytar`

### Issue: Realm Installation Fails

**Symptoms**: Error during `npm install` related to Realm compilation

**Solutions**:

1. Ensure all build tools are installed (see [Build Tools](#build-tools-required-for-native-modules))
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` and `package-lock.json`, then reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Issue: Electron Window Doesn't Open

**Symptoms**: Process starts but no window appears

**Solutions**:

1. Check console for errors
2. Verify Vite is running on port 5173
3. Check firewall settings
4. Try running with `npm run electron` separately

### Issue: Database Errors

**Symptoms**: "Realm instance not initialized" or database access errors

**Solutions**:

1. Close the application completely
2. Check application data directory permissions
3. If corrupted, delete the database file (see [README.md](./README.md#troubleshooting))

### Issue: Master Key Not Found

**Symptoms**: Application can't retrieve master key from keyring

**Solutions**:

1. **Windows**: Check Windows Credential Manager for "CipherVault" entry
2. **macOS**: Check Keychain Access for "CipherVault" entry
3. **Linux**: Check Secret Service (using `seahorse` or similar tool)
4. If key is missing, the app will generate a new one (existing tokens will be inaccessible)

### Issue: Port 5173 Already in Use

**Symptoms**: Vite dev server fails to start

**Solutions**:

1. Find and kill the process using port 5173:
   ```bash
   # Windows
   netstat -ano | findstr :5173
   taskkill /PID <PID> /F
   
   # macOS/Linux
   lsof -ti:5173 | xargs kill
   ```

2. Or change the port in `vite.config.js`:
   ```javascript
   server: {
     port: 5174  // or any other available port
   }
   ```

## Platform-Specific Notes

### Windows

- **Antivirus**: Some antivirus software may flag Electron apps. Add the project directory to exclusions if needed.
- **Path Length**: Windows has a 260-character path limit. Keep project paths short.
- **Permissions**: Run PowerShell/Command Prompt as Administrator if you encounter permission errors.

### macOS

- **Gatekeeper**: First launch may require allowing the app in System Preferences > Security & Privacy
- **Notarization**: For distribution, you'll need to notarize the app (requires Apple Developer account)
- **Code Signing**: Required for distribution outside the App Store

### Linux

- **AppImage**: May need to make executable: `chmod +x CipherVault.AppImage`
- **Dependencies**: Some distributions may require additional libraries
- **Desktop Integration**: AppImage may need desktop file for proper integration

## Next Steps

After successful setup:

1. **First Launch**: The app will generate a master key automatically
2. **Create a Project**: Click the + button in the sidebar
3. **Add Tokens**: Select a project and add your first token
4. **Explore Features**: Try the theme toggle, token visibility, and copy functions

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [README.md](./README.md) for general information
2. Review error messages in the console/DevTools
3. Check the application logs (usually in the application data directory)
4. Open an issue on the project repository with:
   - Your operating system and version
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Complete error message
   - Steps to reproduce

## Security Best Practices

1. **Backup Your Master Key**: While stored securely, consider backing up your OS keyring
2. **Regular Backups**: Export important tokens to a secure location
3. **OS Updates**: Keep your operating system updated for security patches
4. **Firewall**: Consider firewall rules for the application if needed

---

**Happy Token Managing! 🔐**

