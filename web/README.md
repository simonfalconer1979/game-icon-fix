# Game Icon Fixer (Web)

This is the browser-based, 160×64 SVGA-style UI. It uses a monospaced font and a text buffer to emulate the 1990s Turbo Pascal look and feel.

## Run locally

- Deno (recommended):
  ```bash
  deno run -A https://deno.land/std@0.224.0/http/file_server.ts ./web --port 5173 --cors
  ```
- Python:
  ```bash
  python -m http.server 5173 --directory web
  ```
- Batch launcher (Windows): double-click `steam-icon-fixer.bat`.

Then open: http://127.0.0.1:5173

## Deploy

- GitHub Pages workflow `.github/workflows/deploy-pages.yml` publishes `web/`.
- Enable Pages in repository settings, select "GitHub Actions" as the source.

## Notes

- The original Deno CLI implementation remains in the repository under legacy files. It is not required to run the web app.
