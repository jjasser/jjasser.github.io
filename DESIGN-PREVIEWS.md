# Five design directions

A complete, separate Hugo theme with five homepage compositions and matching article, archive, and About views. The existing Anatole theme, site configuration, content, and working changes are preserved.

Run from this repository:

```powershell
& C:\Hugo\bin\hugo.exe server --config hugo.toml,design-preview.toml --bind 127.0.0.1 --port 1313 --disableFastRender --destination "$env:TEMP\jasser-design-preview"
```

Open http://localhost:1313/compare/ for the visual comparison, or http://localhost:1313/?design=atlas to explore. Switch designs with the floating preview bar. The selected design persists as you browse. The server only listens on your own computer.

| Option | Design | Direction |
| --- | --- | --- |
| 1 | Atlas | Cream and forest green, serif headlines, portrait, three-column journal. |
| 2 | Cipher | Dark navy and mint, AI stack diagram, bordered research cards. |
| 3 | Folio | Blue profile sidebar, bright portfolio, a featured story and compact cards. |
| 4 | Fieldnotes | Warm paper, purple details, numbered text-first notebook. |
| 5 | Signal | Orange and charcoal magazine, bold masthead, asymmetric featured story. |

These previews use the actual post titles, summaries, dates, reading times, article bodies, profile photograph, and About content. The homepage diagrams are CSS illustrations. No post text was changed. Preview pages are marked `noindex, nofollow`.

To adopt an option later, set `theme = "jasser-preview"` and `params.design` to its identifier in your production configuration. Before publishing, remove the preview dock/script and preview `robots` directive from the theme, and replace the preview stylesheet name if desired. The preview configuration intentionally does not change the live site's build.

The existing About file lacks Hugo front matter, so the preview template supplies its own heading. Some older article image links already point to missing files in this checkout; the preview preserves those references.

Desktop and mobile screenshots live in `design-previews/`. `scripts/verify-designs.cjs` uses Playwright to check all five homepages, mobile overflow, article and About navigation, and design switching. It regenerates screenshots and `verification.json`; it expects the preview server to be running and Playwright available via `NODE_PATH` or `JASSER_NODE_MODULES`.
