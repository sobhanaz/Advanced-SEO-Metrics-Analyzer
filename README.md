# Tecso SEO Analyzer

Actionable website SEO insights by Tecso — a digital marketing agency. Learn more at https://tecso.team

## What it does
- On-Page SEO: title/meta, headings hierarchy, link and image checks, keyword distribution
- Technical SEO: HTTPS, viewport, canonical, robots meta, favicon, minified assets, basic performance signals
- Content Quality: length, readability, text-to-HTML ratio, duplicate checks, images-in-content
- Off-Page SEO: Open Graph, Twitter Cards, social links, microdata, external link rel usage
- Background: robots.txt and sitemap discovery; mock backlink metrics for demo purposes

## Highlights
- Manifest V3 Chrome extension, CSP-safe (no inline scripts)
- Clean dark theme with Tecso accent color
- Settings panel to enable/disable categories
- One-click JSON export for reports

## Install (developer mode)
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click “Load unpacked” and select this folder
4. Pin “Tecso SEO Analyzer” and click the icon on any site

## Usage
1. Open any normal webpage (not chrome://, PDF, or Web Store)
2. Click the extension icon → Analyze
3. Expand category accordions for details; use Settings to toggle checks
4. Export a JSON report with one click

## Tecso Ads / Services
Need a deeper audit, content strategy, or technical fixes? Tecso can help.
- Free consultation: https://tecso.team
- Custom SEO audits, content plans, technical optimization, and ongoing growth

## File structure
```
seo-checker/
├── manifest.json          # Extension configuration
├── popup.html             # Popup layout (loads popup_app.js)
├── popup_app.js           # Popup logic (UI, messaging, settings, export)
├── content.js             # In-page analysis logic
├── background.js          # Background checks (robots/sitemap/backlinks)
├── icons/                 # Icons
└── README.md              # This file
```

## License
MIT License © 2025 Tecso — see `LICENSE`.