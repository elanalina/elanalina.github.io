# elanalina.github.io

Personal website of **Elanaliina Elanchezhiyan**, Senior Data Engineer.
Live at **https://elanalina.github.io**.

Plain HTML, CSS and vanilla JavaScript: no build step, no frameworks, no trackers.

## Highlights

- **Query my résumé:** the hero has a working, read-only SQL console
  (`assets/js/sql.js`), with `SELECT`, `WHERE`, `ORDER BY`, `LIMIT`,
  `COUNT(*)` and psql-style `\dt`, `\d <table>` and `\x`.
- **Visual case studies:** every project opens a page with an animated
  architecture diagram, before/after slider, demos and step-by-step visuals.
- **Command palette:** press <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> or <kbd>/</kbd>.
- Light and dark themes, with a circular reveal when switching.
- Responsive and accessible, and it respects `prefers-reduced-motion`.

## Structure

```
index.html            page content (all sections)
projects/*.html       visual case-study pages, one per project
Elanaliina_Elanchezhiyan_Resume.pdf  100% ATS-compatible single-page résumé PDF
404.html              custom "relation does not exist" page
assets/css/styles.css design tokens (colors, type, spacing) + styles
assets/js/data.js     tables behind the SQL console (edit these!)
assets/js/sql.js      tiny read-only SQL engine
assets/js/main.js     theme, nav, reveals, console UI, command palette
assets/css/case.css   case-study page components (pipelines, sliders, charts)
assets/js/case.js     case-study interactions (slider, chat demo, template cycler)
assets/img/           portrait, favicon, social preview image
```

## Editing

- **Text and sections:** edit `index.html`.
- **Console data:** edit the tables in `assets/js/data.js`.
- **Colors and fonts:** change the tokens at the top of `assets/css/styles.css`.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Deploy

Pushing to `main` publishes the site with GitHub Pages.
