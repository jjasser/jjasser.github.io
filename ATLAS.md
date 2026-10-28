# Atlas blog theme

Atlas is the active theme in hugo.toml. It keeps the approved cream-and-green layout, portrait, article illustrations, and reading views. All production navigation works without JavaScript. The previous preview theme remains separate.

## Preview locally

From this repository in PowerShell:

```powershell
& C:\Hugo\bin\hugo.exe server --bind 127.0.0.1 --port 1314 --disableFastRender --destination "$env:TEMP\jasser-atlas-preview"
```

Open http://localhost:1314/ in a browser on this computer. The destination keeps generated preview output outside the tracked public directory.

## Verify the site

Requires Node.js, Hugo 0.159.0, and Playwright:

```powershell
npm install
npx playwright install chromium
$env:HUGO_BIN = 'C:\Hugo\bin\hugo.exe'
npm run test:site
```

For a system Chrome installation, set JASSER_CHROME to its executable path instead of downloading Chromium. The verification script creates a clean temporary Hugo build and serves it only for the test run. It checks every generated page at 320, 390, 768, and 1440 pixels; internal links and anchors; all image/CSS/favicon assets; RSS and sitemap XML; canonical URLs; redirects; no-JavaScript navigation; keyboard access; table of contents; About/certification navigation; and 404 recovery. Screenshots and a JSON report are written to validation/atlas, which is ignored by Git. External checks record provider blocks/timeouts separately from broken internal links.

## Content and customization

- Identity, social links, menus, and site metadata: hugo.toml.
- Homepage: themes/atlas/layouts/index.html.
- Colors, typography, spacing, and responsive layouts: themes/atlas/assets/css/atlas.css.
- About and certifications: content/about.md.
- Articles: content/post/. Each post's title, description, series, and date drive its card automatically.
- Source images: static/images/. Never place source images only inside public/.
- Article code highlighting: themes/atlas/assets/css/syntax.css.

The three homepage card illustrations are decorative CSS artwork; the original article thumbnails remain available as source images. Article text is preserved apart from correcting the Part 1 link. Old /posts/, /certifications/, and /post/ai-security-series-part-1/ URLs redirect to their current pages.

## GitHub Pages

The existing workflow publishes the Atlas theme after a push to main. It uses Hugo 0.159.0 and cleans generated output first, preventing the old tracked public pages from being included in the deployment. No Node.js or Sass dependencies are needed for the Hugo build; Node.js and Playwright are only used by the verification script.

This change does not push or publish the repository. Keep the existing personal edits inside the Anatole submodule separate when reviewing your commit.
