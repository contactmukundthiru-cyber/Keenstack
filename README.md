# KeenStack Static Website

## Local development
- From the project root, run:
  - `python -m http.server 8000`
- Open `http://localhost:8000` in your browser.

## GitHub Pages deployment
1) Push this repo to GitHub.
2) In the repo, go to Settings -> Pages.
3) Select the `main` branch and root (`/`) as the source.
4) Save to publish.

Optional GitHub Actions (recommended):
- Create `.github/workflows/pages.yml` using the standard GitHub Pages workflow for static sites.

## Editing content
- Editable content sources live in `assets/content/*.json`.
- Update copy in JSON files first, then mirror the changes in the HTML pages as needed.
- Replace placeholder images in `assets/img/` with cool-toned photography or abstract visuals.

## Brand rules summary
- Colors: Phantom `#112245`, Polar `#ECF2F7`, Keen Green `#20C9A0`, Code Blue `#153CA8`, Slate `#D9DEE2`, White `#FFFFFF`.
- Typography: Headlines `Sora`, Body `Open Sans`.
- Buttons: Title Case labels, Open Sans Regular, slight rounding.
- Visuals: Subtle ripple pattern accents and soft neumorphic cards.
- Imagery: Cool-toned visuals only; avoid warm/orange-heavy imagery.

## Accessibility + SEO
- Includes skip links, visible focus, labels, and structured data.
- Each page includes title, meta description, OpenGraph, and Twitter tags.
# Keenstack
