/* LiveTunes — app logic
   - Resolves songs to playable 30s previews via the iTunes Search API
   - Streams live internet radio
   - Manages a playlist persisted in localStorage */

const audio = document.getElementById("audio");
const els = {
  view: document.getElementById("view"),
  title: document.getElementById("view-title"),
  searchInput: document.getElementById("search-input"),
  searchBtn: document.getElementById("search-btn"),
  // player
  art: document.getElementById("player-art"),
  pTitle: document.getElementById("player-title"),
  pArtist: document.getElementById("player-artist"),
  fav: document.getElementById("player-fav"),
  playBtn: document.getElementById("play-btn"),
  prevBtn: document.getElementById("prev-btn"),
  nextBtn: document.getElementById("next-btn"),
  seek: document.getElementById("seek"),
  timeCur: document.getElementById("time-current"),
  timeTot: document.getElementById("time-total"),
  volume: document.getElementById("volume"),
  liveBadge: document.getElementById("live-badge"),
};

const state = {
  view: "home",
  queue: [],        // array of track objects currently playing through
  index: -1,        // index in queue
  isLive: false,
  current: null,    // currently playing track object
  cache: {},        // search query -> resolved track
};

/* ---------- Playlist (localStorage) ---------- */
const PLAYLIST_KEY = "livetunes_playlist";
function loadPlaylist() {
  try { return JSON.parse(localStorage.getItem(PLAYLIST_KEY)) || []; }
  catch { return []; }
}
function savePlaylist(list) { localStorage.setItem(PLAYLIST_KEY, JSON.stringify(list)); }
function inPlaylist(track) {
  return loadPlaylist().some((t) => t.id === track.id);
}
function togglePlaylist(track) {
  const list = loadPlaylist();
  const idx = list.findIndex((t) => t.id === track.id);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(track);
  savePlaylist(list);
  refreshFavStates();
  if (state.view === "playlist") render();
}

/* ---------- iTunes preview resolver ---------- */
async function resolveTrack(label) {
  if (state.cache[label]) return state.cache[label];
  // label is "Title - Artist"
  const [titlePart, artistPart] = label.split(" - ");
  const term = encodeURIComponent(label.replace(" - ", " "));
  const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`;
  let track;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const r = data.results && data.results[0];
    if (r) {
      track = {
        id: "it" + r.trackId,
        title: r.trackName,
        artist: r.artistName,
        art: r.artworkUrl100 ? r.artworkUrl100.replace("100x100", "200x200") : "",
        preview: r.previewUrl || "",
        type: "song",
      };
    }
  } catch (e) { /* offline / blocked — fall through to placeholder */ }

  if (!track) {
    track = {
      id: "ph" + btoa(unescape(encodeURIComponent(label))).slice(0, 16),
      title: titlePart || label,
      artist: artistPart || "Unknown artist",
      art: "",
      preview: "",
      type: "song",
    };
  }
  state.cache[label] = track;
  return track;
}

/* ---------- Playback ---------- */
function playTrack(track, queue, idx) {
  if (queue) { state.queue = queue; state.index = idx; }
  state.current = track;
  state.isLive = track.type === "station";

  if (track.type === "station") {
    audio.src = track.url;
    els.liveBadge.hidden = false;
  } else {
    if (!track.preview) {
      els.pTitle.textContent = track.title + " (preview unavailable)";
      els.pArtist.textContent = track.artist;
      return;
    }
    audio.src = track.preview;
    els.liveBadge.hidden = true;
  }

  audio.play().catch(() => {});
  els.art.src = track.art || transparentPixel();
  els.pTitle.textContent = track.title;
  els.pArtist.textContent = track.artist;
  els.playBtn.textContent = "⏸";
  refreshFavStates();
  markPlayingRows();
}

function togglePlay() {
  if (!state.current) return;
  if (audio.paused) { audio.play(); els.playBtn.textContent = "⏸"; }
  else { audio.pause(); els.playBtn.textContent = "▶"; }
}

function playNext() {
  if (state.isLive || !state.queue.length) return;
  const next = (state.index + 1) % state.queue.length;
  playTrack(state.queue[next], state.queue, next);
}
function playPrev() {
  if (state.isLive || !state.queue.length) return;
  const prev = (state.index - 1 + state.queue.length) % state.queue.length;
  playTrack(state.queue[prev], state.queue, prev);
}

function transparentPixel() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#18213a"/><text x="50%" y="54%" font-size="34" text-anchor="middle" dominant-baseline="middle">🎵</text></svg>'
  );
}

/* ---------- Rendering ---------- */
const VIEW_TITLES = {
  home: "Home",
  live: "Live Radio",
  english: "Top 50 English Songs",
  mandarin: "Top 50 Mandarin Songs",
  playlist: "Your Playlist",
  search: "Search Results",
};

function setView(view) {
  state.view = view;
  els.title.textContent = VIEW_TITLES[view] || "LiveTunes";
  document.querySelectorAll(".nav-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view));
  render();
}

function render() {
  const v = state.view;
  if (v === "home") return renderHome();
  if (v === "live") return renderStations();
  if (v === "english") return renderChart(TOP_ENGLISH, "english");
  if (v === "mandarin") return renderChart(TOP_MANDARIN, "mandarin");
  if (v === "playlist") return renderPlaylist();
}

function renderHome() {
  els.view.innerHTML = `
    <div class="hero-grid">
      <div class="hero-card" data-go="live">
        <span class="hero-emoji">📻</span>
        <h3>Live Radio</h3><p>Stream curated stations playing right now, 24/7.</p>
      </div>
      <div class="hero-card" data-go="english">
        <span class="hero-emoji">🇬🇧</span>
        <h3>Top 50 English</h3><p>The biggest English-language hits, ranked.</p>
      </div>
      <div class="hero-card" data-go="mandarin">
        <span class="hero-emoji">🇨🇳</span>
        <h3>Top 50 Mandarin</h3><p>華語金曲 — the top 50 Mandarin tracks.</p>
      </div>
      <div class="hero-card" data-go="playlist">
        <span class="hero-emoji">❤️</span>
        <h3>Your Playlist</h3><p>Everything you've saved, in one place.</p>
      </div>
    </div>
    <h2 class="section-title">Featured stations</h2>
    <div id="home-stations" class="station-grid"></div>
  `;
  els.view.querySelectorAll("[data-go]").forEach((c) =>
    c.addEventListener("click", () => setView(c.dataset.go)));
  renderStationGrid(document.getElementById("home-stations"), STATIONS.slice(0, 6));
}

function renderStations() {
  els.view.innerHTML = `<div class="station-grid" id="all-stations"></div>`;
  renderStationGrid(document.getElementById("all-stations"), STATIONS);
}

function renderStationGrid(container, stations) {
  container.innerHTML = "";
  stations.forEach((s) => {
    const track = { id: "st" + s.name, title: s.name, artist: s.genre, art: "", type: "station", url: s.url };
    const card = document.createElement("div");
    card.className = "station-card" + (state.current && state.current.id === track.id ? " playing" : "");
    card.innerHTML = `
      <div class="station-emoji">${s.emoji}</div>
      <div class="station-name">${s.name}</div>
      <div class="station-genre">${s.genre}</div>`;
    card.addEventListener("click", () => { playTrack(track); render(); });
    container.appendChild(card);
  });
}

async function renderChart(labels, viewKey) {
  els.view.innerHTML = `<div class="loading">Loading the chart…</div>`;
  const list = document.createElement("div");
  list.className = "track-list";
  els.view.innerHTML = "";
  els.view.appendChild(list);

  // Resolve in small batches so the UI fills in progressively.
  const resolved = [];
  for (let i = 0; i < labels.length; i++) {
    const track = await resolveTrack(labels[i]);
    resolved.push(track);
    list.appendChild(trackRow(track, i, resolved, viewKey));
  }
}

function trackRow(track, i, queue, viewKey) {
  const row = document.createElement("div");
  row.className = "track";
  row.dataset.trackId = track.id;
  if (state.current && state.current.id === track.id) row.classList.add("playing");
  const fav = inPlaylist(track);
  row.innerHTML = `
    <div class="track-rank">${i + 1}</div>
    <img class="track-art" src="${track.art || transparentPixel()}" alt="" />
    <div class="track-info">
      <div class="track-name">${escapeHtml(track.title)}</div>
      <div class="track-artist">${escapeHtml(track.artist)}</div>
    </div>
    <div class="track-actions">
      <button class="icon-btn fav-btn ${fav ? "fav" : ""}" title="Add to playlist">${fav ? "❤️" : "🤍"}</button>
    </div>`;
  row.addEventListener("click", (e) => {
    if (e.target.closest(".fav-btn")) return;
    playTrack(track, queue, i);
  });
  row.querySelector(".fav-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    togglePlaylist(track);
  });
  return row;
}

function renderPlaylist() {
  const list = loadPlaylist();
  if (!list.length) {
    els.view.innerHTML = `<div class="empty">Your playlist is empty.<br>Tap the 🤍 on any song to save it here.</div>`;
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "track-list";
  els.view.innerHTML = "";
  els.view.appendChild(wrap);
  list.forEach((track, i) => wrap.appendChild(trackRow(track, i, list, "playlist")));
}

async function runSearch(q) {
  if (!q.trim()) return;
  setView("search");
  els.view.innerHTML = `<div class="loading">Searching for “${escapeHtml(q)}”…</div>`;
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=30`;
    const res = await fetch(url);
    const data = await res.json();
    const tracks = (data.results || []).map((r) => ({
      id: "it" + r.trackId,
      title: r.trackName,
      artist: r.artistName,
      art: r.artworkUrl100 ? r.artworkUrl100.replace("100x100", "200x200") : "",
      preview: r.previewUrl || "",
      type: "song",
    }));
    if (!tracks.length) { els.view.innerHTML = `<div class="empty">No results for “${escapeHtml(q)}”.</div>`; return; }
    const wrap = document.createElement("div");
    wrap.className = "track-list";
    els.view.innerHTML = "";
    els.view.appendChild(wrap);
    tracks.forEach((t, i) => wrap.appendChild(trackRow(t, i, tracks, "search")));
  } catch {
    els.view.innerHTML = `<div class="empty">Search is unavailable right now (network blocked).</div>`;
  }
}

/* ---------- Helpers ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtTime(sec) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function refreshFavStates() {
  // player fav button
  if (state.current && state.current.type === "song") {
    els.fav.textContent = inPlaylist(state.current) ? "❤️" : "🤍";
    els.fav.classList.toggle("fav", inPlaylist(state.current));
  } else {
    els.fav.textContent = "🤍";
  }
  // any visible rows
  document.querySelectorAll(".track").forEach((row) => {
    const id = row.dataset.trackId;
    const btn = row.querySelector(".fav-btn");
    if (!btn) return;
    const isFav = loadPlaylist().some((t) => t.id === id);
    btn.textContent = isFav ? "❤️" : "🤍";
    btn.classList.toggle("fav", isFav);
  });
}
function markPlayingRows() {
  document.querySelectorAll(".track").forEach((row) =>
    row.classList.toggle("playing", state.current && row.dataset.trackId === state.current.id));
}

/* ---------- Events ---------- */
document.querySelectorAll(".nav-item").forEach((b) =>
  b.addEventListener("click", () => setView(b.dataset.view)));

els.playBtn.addEventListener("click", togglePlay);
els.nextBtn.addEventListener("click", playNext);
els.prevBtn.addEventListener("click", playPrev);
els.fav.addEventListener("click", () => { if (state.current && state.current.type === "song") togglePlaylist(state.current); });

els.volume.addEventListener("input", () => { audio.volume = els.volume.value / 100; });
audio.volume = els.volume.value / 100;

els.seek.addEventListener("input", () => {
  if (state.isLive || !audio.duration) return;
  audio.currentTime = (els.seek.value / 100) * audio.duration;
});

audio.addEventListener("timeupdate", () => {
  if (state.isLive) { els.timeCur.textContent = "LIVE"; els.timeTot.textContent = ""; els.seek.value = 0; return; }
  els.timeCur.textContent = fmtTime(audio.currentTime);
  els.timeTot.textContent = fmtTime(audio.duration);
  els.seek.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
});
audio.addEventListener("ended", playNext);
audio.addEventListener("play", () => { els.playBtn.textContent = "⏸"; });
audio.addEventListener("pause", () => { els.playBtn.textContent = "▶"; });

els.searchBtn.addEventListener("click", () => runSearch(els.searchInput.value));
els.searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(els.searchInput.value); });

// init
els.art.src = transparentPixel();
setView("home");
