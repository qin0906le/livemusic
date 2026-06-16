# 🎵 LiveTunes

A lightweight music web app — listen to **live radio**, browse the **Top 50 English** and
**Top 50 Mandarin** charts, and build your own **playlist**. No build step, no framework,
no API keys.

## Features

- **📻 Live Radio** — streams real public internet radio stations (SomaFM) right in the browser, 24/7.
- **🇬🇧 Top 50 English** & **🇨🇳 Top 50 Mandarin** — curated charts. Each track is resolved to
  album art and a **30-second preview** via the free iTunes Search API (no key required).
- **🔍 Search** — find any song or artist and play its preview.
- **❤️ Playlist** — tap the heart on any song to save it; your playlist is stored in your
  browser (`localStorage`) and survives reloads.
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
