# 🎵 LiveTunes

A lightweight music web app — listen to **live radio**, browse the **Top 50 English** and
**Top 50 Mandarin** charts, and build your own **playlist**. No build step, no framework,
no API keys.

## Features

- **🇬🇧 English Songs** & **🇨🇳 Mandarin Songs** — **full-length** tracks, streamed **free and
  legally** from [Audius](https://audius.co) (no API key). Every track plays end to end — no previews.
- **📻 Live Radio** — streams real public internet radio in the browser, 24/7. Stations are grouped
  into **Chill & Eclectic** (SomaFM) and **Mandarin & Asian** pop.
- **▶️ Watch on YouTube** — every song has a button that opens the official version on YouTube.
- **🔍 Search** — searches Audius for full songs you can play right away.
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

- **All songs play full-length** via Audius (free, legal, no key). Audius's catalog leans toward
  **independent artists**, so the English/Mandarin lists are full free tracks rather than a
  major-label "Top 40". The **Mandarin** list is built by merging several Chinese/Mandarin
  search terms, so its size depends on Audius's catalog.
- For a specific **major-label hit** that isn't on Audius, use the **▶️ YouTube** button on any
  song to open the official version — the legal, free way to stream label-owned music.
- Everything is network-dependent (Audius, radio, YouTube). If a source is blocked, the list
  simply won't load.
