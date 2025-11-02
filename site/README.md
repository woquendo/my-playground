Shows & Songs demo site

Files:
- `index.html` — homepage that loads `data/shows_songs.json` and renders shows + song embeds.
- `data/shows_songs.json` — example data (shows and songs with YouTube links).

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
- The page will try to fetch your anime list from the Jikan API using the `anime_username` field in `data/shows_songs.json` (set to your MAL username). If it succeeds it groups anime by status (watching, plan_to_watch, completed, on_hold, dropped).
- Currently this uses the public Jikan endpoint: https://api.jikan.moe. If that API is down or CORS restricted, the page will fall back to the `shows` in the JSON file or the built-in fallback data.

Autoplay notes for songs:
- Songs marked with `"autoplay": true` in `data/shows_songs.json` will have `autoplay=1&mute=1` applied to their YouTube embed URL so modern browsers will allow autoplay (muted). Browsers may still enforce autoplay policies.

If you'd like, I can add a small preference toggle to allow unmuted playback after a user gesture (click) or implement sequential playback using the YouTube Player API.

Import & export (update local JSON)
----------------------------------
- The page now includes a small UI to import your MyAnimeList animelist from Jikan. Enter your MAL username in the text field and click "Import anime list". The page will fetch entries grouped by status (watching, plan_to_watch, completed, on_hold, dropped) and replace the `shows` list in the site's in-memory data.
- The imported data is saved to `localStorage` (key: `shows_songs_data_v1`) so it persists across reloads.
- After importing you can click "Download JSON" to save an updated `shows_songs.json` file. Replace the repository file `site/data/shows_songs.json` with the downloaded file (or push it to your GitHub repo) to make the changes permanent in the source.
- If you need the browser to write the file directly, that's not safe for a static site — the page provides a download instead. Alternatively, you can use the File System Access API in Chromium-based browsers; if you'd like I can add an experimental "Write to disk" button that will prompt for a file handle.

Notes on reliability
--------------------
- Jikan's public API is rate-limited and may have occasional downtime. If Jikan fails, the UI will fall back to the packaged JSON data or to the previously imported localStorage data if present.
- The import makes multiple requests (one per status) and may take a few seconds for large lists.