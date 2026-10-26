# CipherVault 🔐

A secure, easy-to-use token management application built with Electron, Vue.js, and Realm. CipherVault allows you to securely store and manage API tokens across multiple projects and environments (Production/Development).

## Features

- 🔒 **Secure Storage**: All tokens are encrypted using AES-256-GCM encryption
- 🔑 **OS Keyring Integration**: Master encryption key stored securely in your OS keyring using Keytar
- 📁 **Multi-Project Support**: Organize tokens by project
- 🌍 **Environment Management**: Separate tokens for Production and Development environments
- 🎨 **Modern UI**: Beautiful interface built with Vuetify, supporting Dark and Light themes
- 👁️ **Token Visibility Toggle**: Show/hide token values with a single click
- 📋 **One-Click Copy**: Quickly copy tokens to clipboard
- ✏️ **Full CRUD Operations**: Create, read, update, and delete projects and tokens

## Technology Stack

- **Desktop Framework**: Electron
- **Frontend**: Vue.js 3 with Vite
- **UI Library**: Vuetify 3
- **Database**: Realm (local NoSQL database)
- **Encryption**: Node.js `crypto` module (AES-256-GCM)
- **Key Storage**: Keytar (OS keyring integration)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git** (optional, for cloning)

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run in Development Mode**
   ```bash
   npm run electron:dev
   ```

3. **Build for Production**
   ```bash
   npm run electron:build
   ```

For detailed setup instructions, see [SETUPGUIDE.md](./SETUPGUIDE.md).

## Project Structure

```
ciphervault/
├── electron-main.js          # Electron main process
├── preload.cjs               # Preload script for secure IPC
├── vite.config.js            # Vite configuration
├── package.json              # Project dependencies
├── src/
│   ├── main.js              # Vue app entry point
│   ├── App.vue              # Main application component
│   ├── style.css            # Global styles
│   ├── components/
│   │   ├── ProjectSidebar.vue    # Projects sidebar component
│   │   └── TokenManager.vue       # Token management component
│   ├── plugins/
│   │   └── vuetify.js       # Vuetify configuration
│   └── main/
│       ├── realm-config.js  # Realm database configuration
│       ├── keytar-manager.js # Keytar key management
│       └── crypto-utils.js  # Encryption/decryption utilities
└── dist/                    # Build output (generated)
```

## Security

### Encryption

- All token values are encrypted using **AES-256-GCM** before being stored in the database
- The master encryption key is stored securely in your OS keyring (Windows Credential Manager, macOS Keychain, or Linux Secret Service)
- Tokens are only decrypted for an explicit reveal, copy, or edit operation
- Clipboard copies are cleared after a short timeout only if the clipboard still contains the exact value CipherVault copied
- Service icons may load from HTTPS image URLs; remote image hosts can observe the request and may log network metadata. Use local image uploads if you prefer to avoid external icon requests

### Key Management

- On first launch, CipherVault generates a random 32-byte master key
- This key is stored in your OS keyring using Keytar
- The master key never leaves your machine and is never stored in plain text

## Usage

### Creating a Project

1. Click the **+** button in the sidebar
2. Enter a project name
3. Click "Create"

### Adding Tokens

1. Select a project from the sidebar
2. Choose either "Production" or "Development" tab
3. Click "Add Token"
4. Fill in:
   - **Token Name**: A descriptive name for the token
   - **Service**: The service/provider (e.g., GitHub, AWS, etc.)
   - **Token Value**: The actual token value
5. Click "Create"

### Managing Tokens

- **View Token**: Click the eye icon to reveal the token value
- **Copy Token**: Click the copy icon to copy the token to clipboard
- **Edit Token**: Click the pencil icon to modify token details
- **Delete Token**: Click the trash icon to remove a token

### Theming

Toggle between Dark and Light themes using the theme button in the top-right corner of the application.

## Development

### Available Scripts

- `npm run dev` - Start Vite dev server only
- `npm run electron` - Run Electron with built app
- `npm run electron:dev` - Run Electron with Vite dev server (development mode)
- `npm run build` - Build the Vue app for production
- `npm run electron:build` - Build the complete Electron app

### Building for Distribution

```bash
npm run electron:build
```

This will create distributable packages in the `dist` folder for your platform.

## Troubleshooting

### Keytar Installation Issues

If you encounter issues with Keytar installation:

- **Windows**: Ensure you have Visual Studio Build Tools installed
- **macOS**: Xcode Command Line Tools should be installed
- **Linux**: Install `libsecret-1-dev` package

See [SETUPGUIDE.md](./SETUPGUIDE.md) for detailed troubleshooting steps.

### Realm Database or Keyring Issues

**Do not delete `ciphervault.realm` as a first troubleshooting step.** The database contains your encrypted vault records, and the encryption key is stored separately in your operating-system keyring. If the key is missing, deleting or recreating the database will not recover your existing tokens.

1. Close CipherVault.
2. Make a backup copy of the entire application data directory before attempting recovery.
3. Check that the operating-system keyring used by CipherVault is available and that you are signed into the same OS user account that created the vault.
4. Restart CipherVault and review the displayed error. Do not generate a replacement key for an existing vault.
5. If you intentionally want to permanently reset the vault, first confirm that you have a backup or no longer need the existing tokens. Only then, with CipherVault closed, move the database aside rather than immediately deleting it. Keep the backup until you have confirmed the new vault works.

Typical application data locations are:
- **Windows**: `%APPDATA%\ciphervault\` (confirm the actual `userData` directory for your installed build if it differs)
- **macOS**: `~/Library/Application Support/ciphervault/`
- **Linux**: `~/.config/ciphervault/`

A database backup without the matching OS keyring key may not be sufficient to decrypt the stored tokens. Protect both the database backup and access to the original keyring accordingly.

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or feature requests, please open an issue on the project repository.

---

**Note**: Always keep backups of your tokens. While CipherVault provides secure storage, it's important to maintain your own backups for critical tokens.

