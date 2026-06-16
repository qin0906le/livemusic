# 🎵 LiveTunes

A lightweight music web app — listen to **live radio**, browse the **Top 50 English** and
**Top 50 Mandarin** charts, and build your own **playlist**. No build step, no framework,
no API keys.

## Features

- **🇬🇧 Top 50 English** & **🇨🇳 Top 50 Mandarin** — curated **hit lists** that play **full songs**
  through an **embedded YouTube player** (no API key). A wrong/blocked video id auto-falls back to
  opening the correct YouTube search.
- **📻 Live Radio** — streams real public internet radio in the browser, 24/7. Stations are grouped
  into **Chill & Eclectic** (SomaFM) and **Mandarin & Asian** pop.
- **▶️ Open on YouTube** — every song has a button that opens the official version on YouTube.
- **🔍 Search** — searches [Audius](https://audius.co) for free full songs you can play right away.
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

- The **Top 50** lists play full songs via YouTube's official embedded player (the legal, free way
  to stream label-owned music). English songs carry hardcoded video ids; Mandarin songs without an
  id (`y: ""` in `data.js`) open the correct YouTube search on tap. **If any video plays the wrong
  thing, fix its id in `data.js`** — that's the only field to change.
- **Search** uses Audius (free full songs, indie-leaning) and **Live Radio** streams full audio.
- Everything is network-dependent (YouTube, Audius, radio). If a source is blocked it won't play.
