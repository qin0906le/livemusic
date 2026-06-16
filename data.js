/* Live radio stations + search terms used to build the Mandarin full-song list.
   All song playback in the app is now full-length & free via Audius (no previews). */

/* Search terms merged to populate the Mandarin Songs view from Audius. */
const MANDARIN_QUERIES = [
  "華語", "国语", "國語", "中文", "中文歌", "粤语", "粵語",
  "mandarin", "chinese pop", "cantopop", "cpop", "華語流行",
];

/* Public live internet radio. <audio> can stream these directly.
   Each station has a `group` so the Live Radio view can section them.
   The SomaFM streams are rock-solid; the Mandarin/Asian community streams
   are public but may occasionally rotate URLs — swap them here if one is down. */
const STATIONS = [
  // --- Chill & Eclectic (SomaFM) ---
  { name: "Groove Salad", genre: "Ambient / Downtempo", emoji: "🌿", group: "Chill & Eclectic", url: "https://ice1.somafm.com/groovesalad-128-mp3" },
  { name: "Indie Pop Rocks", genre: "Indie / Pop", emoji: "🎸", group: "Chill & Eclectic", url: "https://ice1.somafm.com/indiepop-128-mp3" },
  { name: "Lush", genre: "Vocals / Chillout", emoji: "💫", group: "Chill & Eclectic", url: "https://ice1.somafm.com/lush-128-mp3" },
  { name: "Beat Blender", genre: "Deep House", emoji: "🔊", group: "Chill & Eclectic", url: "https://ice1.somafm.com/beatblender-128-mp3" },
  { name: "Secret Agent", genre: "Lounge / Spy Jazz", emoji: "🕵️", group: "Chill & Eclectic", url: "https://ice1.somafm.com/secretagent-128-mp3" },
  { name: "Drone Zone", genre: "Atmospheric", emoji: "🌌", group: "Chill & Eclectic", url: "https://ice1.somafm.com/dronezone-128-mp3" },
  { name: "Folk Forward", genre: "Indie Folk", emoji: "🍂", group: "Chill & Eclectic", url: "https://ice1.somafm.com/folkfwd-128-mp3" },
  { name: "Boot Liquor", genre: "Americana / Country", emoji: "🥃", group: "Chill & Eclectic", url: "https://ice1.somafm.com/bootliquor-128-mp3" },
  { name: "PopTron", genre: "Electro Pop", emoji: "✨", group: "Chill & Eclectic", url: "https://ice1.somafm.com/poptron-128-mp3" },
  { name: "Seven Inch Soul", genre: "Vintage Soul", emoji: "🎤", group: "Chill & Eclectic", url: "https://ice1.somafm.com/7soul-128-mp3" },
  { name: "Fluid", genre: "Future Soul / Hip-Hop", emoji: "💧", group: "Chill & Eclectic", url: "https://ice1.somafm.com/fluid-128-mp3" },
  { name: "DEF CON Radio", genre: "Electronic", emoji: "🤖", group: "Chill & Eclectic", url: "https://ice1.somafm.com/defcon-128-mp3" },

  // --- Mandarin & Asian Pop (community public streams) ---
  { name: "Hit FM 聯播網", genre: "Taiwan Mandarin Pop", emoji: "🇹🇼", group: "Mandarin & Asian", url: "https://stream.rcs.revma.com/em90w4aqwxquv" },
  { name: "KISS Radio 大眾廣播", genre: "Mandarin Hits", emoji: "💋", group: "Mandarin & Asian", url: "https://onair5.rcs.com.tw/991_live.mp3" },
  { name: "RTHK Radio 2", genre: "Cantonese / HK Pop", emoji: "🇭🇰", group: "Mandarin & Asian", url: "https://rthkaudio2-live.akamaized.net/hls/live/2040078/radio2/master.m3u8" },
  { name: "Asia DREAM Radio – C-Pop", genre: "Chinese Pop Mix", emoji: "🏮", group: "Mandarin & Asian", url: "https://kathy.torontocast.com:3060/;" },
];
