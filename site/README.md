Shows & Songs demo site

Files:
- `index.html` — homepage that loads `data/shows.json` and `data/songs.json` and renders shows + song embeds.
- `data/shows.json` and `data/songs.json` — example data (separate lists for shows/anime and songs with YouTube links).

Quick test (PowerShell):

```powershell
# from the repository root
cd .\site
# start a simple server (Python must be installed)
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

Notes:
- Opening `index.html` directly via file:// may cause fetch to fail; the page has fallback data so it will still show samples.
- To publish on GitHub Pages, push the repository to GitHub and enable Pages for the `main` branch (or publish the `site/` folder as the docs folder).

MyAnimeList integration:
- The page can import your MyAnimeList animelist by scraping your MAL animelist pages through a local proxy server. Enter your MAL username in the text field and click "Import anime list"; the UI will fetch each status page (watching, plan_to_watch, completed, on_hold, dropped) via the proxy and extract titles, links and cover images where available.
- This approach avoids relying on the Jikan public API and works around CORS by routing requests through the local proxy (`/proxy`). A small local server (included as `server.py`) implements the proxy and an optional `/save-shows` endpoint to persist updates back to `data/shows.json`.

Autoplay notes for songs:
- Songs marked with `"autoplay": true` in `data/shows_songs.json` will have `autoplay=1&mute=1` applied to their YouTube embed URL so modern browsers will allow autoplay (muted). Browsers may still enforce autoplay policies.

If you'd like, I can add a small preference toggle to allow unmuted playback after a user gesture (click) or implement sequential playback using the YouTube Player API.

Import & export (update local JSON)
----------------------------------
- The page includes a UI to import your MyAnimeList animelist via the local proxy. Enter your MAL username and click "Import anime list"; the UI will fetch each animelist status page, extract entries, and replace the `shows` list in memory.
- The imported data is saved to `localStorage` (key: `shows_songs_data_v1`) so it persists across reloads. You can also click "Download JSON" to export the current data; the download contains separate `shows` and `songs` lists.
- If you run the included `server.py` in the `site/` folder it exposes an optional `/save-shows` POST endpoint which the UI will call after import to persist `data/shows.json` on disk (useful for local development). For a static-hosted site (GitHub Pages), use the download-and-replace workflow instead.

Notes on reliability
--------------------
- The import scrapes public MAL pages via the proxy and therefore depends on the MAL page structure; if MyAnimeList changes their page HTML the scraper selectors may need tweaking. The import makes multiple requests (one per status) and may take a few seconds for large lists.
- The proxy server helps avoid CORS and can optionally persist `data/shows.json` locally during development. When deploying to a static host, use the download workflow to update packaged JSON.