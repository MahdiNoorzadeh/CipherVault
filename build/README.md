# Icon Files

This directory should contain the application icons for different platforms.

## Required Files

1. **icon.ico** - Windows icon file
   - Format: Multi-resolution ICO file
   - Recommended sizes: 16x16, 32x32, 48x48, 256x256 pixels
   - Used for: Windows executable and installer

2. **icon.icns** - macOS icon file
   - Format: ICNS file with multiple resolutions
   - Recommended sizes: 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024
   - Used for: macOS .app bundle and DMG

3. **icon.png** - Linux icon file
   - Format: PNG file
   - Recommended size: 512x512 or 1024x1024 pixels
   - Used for: Linux AppImage, DEB, and RPM packages

## Creating Icons

### From PNG/Image to ICO (Windows)

**Online Tools:**
- https://convertio.co/png-ico/
- https://www.icoconverter.com/

**Using ImageMagick (Command Line):**
```bash
magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### From PNG/Image to ICNS (macOS)

**Using iconutil (macOS only):**
1. Create an iconset directory:
   ```bash
   mkdir icon.iconset
   ```
2. Add images at different sizes:
   ```bash
   sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
   sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
   sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
   sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
   sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
   sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
   sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
   sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
   sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
   sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
   ```
3. Convert to ICNS:
   ```bash
   iconutil -c icns icon.iconset
   ```

**Online Tools:**
- https://cloudconvert.com/png-to-icns
- https://iconverticons.com/online/

### For Linux (PNG)

Simply use a high-resolution PNG (512x512 or 1024x1024 pixels).

## Quick Setup Instructions

1. **Get your icon image** - You should have a PNG or image file of the CipherVault icon (blue shield with padlock and "C")

2. **Convert to required formats:**
   - **Windows (icon.ico)**: Use an online converter like https://convertio.co/png-ico/ or https://www.icoconverter.com/
   - **macOS (icon.icns)**: Use https://cloudconvert.com/png-to-icns or follow the iconutil method above
   - **Linux (icon.png)**: Use your original PNG (512x512 or 1024x1024 recommended)

3. **Place the files** in this `build/` directory:
   - `build/icon.ico` (Windows)
   - `build/icon.icns` (macOS)
   - `build/icon.png` (Linux)

4. **Test the icon** by running the app - the window icon should appear in the title bar

## Current Status

⚠️ **Icon files are required!** Please add your CipherVault icon files to this directory.

The icon should feature:
- A blue shield with a padlock
- A white "C" letter inside the padlock
- Professional, modern design matching the CipherVault branding

Once you add the icon files, they will be used in:
- Application window title bar
- Taskbar/dock icon
- Built executable files
- Installer packages

