# 🎵 LiveTunes

A lightweight music web app — listen to **live radio**, browse the **Top 50 English** and
**Top 50 Mandarin** charts, and build your own **playlist**. No build step, no framework,
no API keys.

## Features

- **🎧 Free Full Songs** — full-length tracks streamed **free and legally** from
  [Audius](https://audius.co) (no API key). Browse trending or search for anything.
- **📻 Live Radio** — streams real public internet radio in the browser, 24/7. Stations are grouped
  into **Chill & Eclectic** (SomaFM) and **Mandarin & Asian** pop.
- **🇬🇧 Top 50 English** & **🇨🇳 Top 50 Mandarin** — curated charts. Each track is resolved to
  album art and a **30-second preview** via the free iTunes Search API (no key required).
- **▶️ Watch on YouTube** — every song has a button that opens the full official track on YouTube.
- **🏷 FULL / 0:30 badges** — every song shows whether in-app playback is the full song
  (Audius / live radio) or a 30-second preview (iTunes).
- **🔍 Search** — searches Audius (full songs) **and** iTunes (previews) together.
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

- **Full songs:** the **Free Full Songs** section and search results badged **FULL** play
  complete tracks via Audius (free, legal, no key) — its catalog leans toward independent
  artists. **Live Radio** is also full, continuous audio.
- **Mainstream Top 50 hits** are owned by major labels, so in-app they play as **30-second
  previews** (iTunes). Use the **▶️ YouTube** button on any song to hear the full official track —
  the legal, free way to stream label-owned music.
- Everything network-dependent (Audius, previews, radio, YouTube) needs internet access. If a
  source is blocked, songs still list with title/artist; that source simply won't play.
