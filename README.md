# 🎵 LiveTunes

A lightweight music web app — listen to **live radio**, browse the **Top 50 English** and
**Top 50 Mandarin** charts, and build your own **playlist**. No build step, no framework,
no API keys.

## Features

- **📻 Live Radio** — streams real public internet radio in the browser, 24/7. Stations are grouped
  into **Chill & Eclectic** (SomaFM) and **Mandarin & Asian** pop.
- **🇬🇧 Top 50 English** & **🇨🇳 Top 50 Mandarin** — curated charts. Each track is resolved to
  album art and a **30-second preview** via the free iTunes Search API (no key required).
- **🔍 Search** — find any song or artist and play its preview.
- **❤️ Multiple playlists** — a built-in **Liked Songs** plus any number of custom playlists you
  create. Use ＋ on a song to add it to one (or several), **drag to reorder**, rename, or delete.
  Everything is stored in your browser (`localStorage`) and survives reloads.
- **🌙 Light / dark theme** — toggle in the top bar; your choice is remembered.
- **🎚 Player bar** — play/pause, next/previous, seek, and volume. Live stations show a `● LIVE` badge.

## Run it

No server is required — just open the file:

```bash
# option 1: open directly
open index.html        # macOS  (use "start" on Windows, "xdg-open" on Linux)

# option 2: any static server (recommended, avoids browser file:// quirks)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Publishing (live URL)

This repo ships a GitHub Actions workflow (`.github/workflows/pages.yml`) that deploys the site
to **GitHub Pages** on every push. To turn it on once:

1. Go to the repo on GitHub → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

The workflow then publishes automatically. The live URL appears in the workflow run summary and at
**Settings → Pages**, typically:

```
https://<your-username>.github.io/livemusic/
```

## How it works

| File | Purpose |
|------|---------|
| `index.html` | Layout: sidebar, content area, bottom player. |
| `styles.css` | Dark theme, responsive grid. |
| `data.js`    | The editorial charts (title + artist) and the live radio station list. |
| `app.js`     | Resolves previews from iTunes, handles playback, search, and the playlist. |

## Notes

- Song previews are **30-second clips** served by Apple's public catalog — full tracks are
  not streamed (that requires licensing).
- Live radio and previews need internet access. If the network is blocked, songs still list
  with their title and artist; previews simply won't play.
