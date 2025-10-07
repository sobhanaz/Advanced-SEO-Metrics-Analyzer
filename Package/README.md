# Packaging Tecso SEO Analyzer (Chrome Extension)

This folder contains a PowerShell script to create a clean ZIP archive ready for the Chrome Web Store.

## What gets packaged
- manifest.json
- background.js
- content.js
- popup.html
- popup_app.js
- icons/ (16/32/48/128)

## How to build the ZIP (Windows PowerShell)

1. Open PowerShell and run the script:

```powershell
# From the repo root or the Package folder
cd Package
./package.ps1
```

2. Output:
- `Package/dist/` — a clean copy of the extension files
- `Package/tecso-seo-analyzer.zip` — upload this to the Chrome Web Store

## Notes
- Ensure `manifest.json` is MV3 and references files relative to the root.
- If you add new assets (images, fonts), update the `package.ps1` include list.
- You can safely delete `Package/dist/` after publishing.
