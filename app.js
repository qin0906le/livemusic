/* LiveTunes — app logic
   Every song plays FULL-LENGTH and free via Audius (no API key, no previews),
   on the HTML5 <audio> engine — so playback continues when the phone is locked
   / backgrounded, with lock-screen controls + auto-advance (Media Session API).
   A ▶️ button opens the official version on YouTube. Multiple playlists +
   light/dark theme persist in localStorage. */

const audio = document.getElementById("audio");
const els = {
  view: document.getElementById("view"),
  title: document.getElementById("view-title"),
  searchInput: document.getElementById("search-input"),
  searchBtn: document.getElementById("search-btn"),
  themeBtn: document.getElementById("theme-btn"),
  newPlaylistBtn: document.getElementById("new-playlist-btn"),
  libraryList: document.getElementById("library-list"),
  addMenu: document.getElementById("add-menu"),
  art: document.getElementById("player-art"),
  pTitle: document.getElementById("player-title"),
  pArtist: document.getElementById("player-artist"),
  pYt: document.getElementById("player-yt"),
  fav: document.getElementById("player-fav"),
  playBtn: document.getElementById("play-btn"),
  prevBtn: document.getElementById("prev-btn"),
  nextBtn: document.getElementById("next-btn"),
  seek: document.getElementById("seek"),
  timeCur: document.getElementById("time-current"),
  timeTot: document.getElementById("time-total"),
  volume: document.getElementById("volume"),
};

const state = {
  view: "home",
  openPlaylist: null,
  queue: [],
  index: -1,
  current: null,
  audiusCache: {},
};

/* ---------- Persistent store ---------- */
const STORE_KEY = "livetunes_v2";
const LIKED_ID = "liked";
function loadStore() {
  let data;
  try { data = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { data = null; }
  if (!data || typeof data !== "object") data = {};
  if (!data.theme) data.theme = "dark";
  if (!Array.isArray(data.playlists)) data.playlists = [];
  if (!data.playlists.some((p) => p.id === LIKED_ID))
    data.playlists.unshift({ id: LIKED_ID, name: "Liked Songs", tracks: [] });
  return data;
}
function saveStore(data) { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function getPlaylists() { return loadStore().playlists; }
function getPlaylist(id) { return getPlaylists().find((p) => p.id === id); }
function createPlaylist(name) {
  const data = loadStore();
  const id = "pl" + Date.now().toString(36);
  data.playlists.push({ id, name: name || "New Playlist", tracks: [] });
  saveStore(data); return id;
}
function deletePlaylist(id) {
  if (id === LIKED_ID) return;
  const data = loadStore();
  data.playlists = data.playlists.filter((p) => p.id !== id);
  saveStore(data);
}
function renamePlaylist(id, name) {
  const data = loadStore();
  const p = data.playlists.find((x) => x.id === id);
  if (p) { p.name = name; saveStore(data); }
}
function addToPlaylist(id, track) {
  const data = loadStore();
  const p = data.playlists.find((x) => x.id === id);
  if (p && !p.tracks.some((t) => t.id === track.id)) { p.tracks.push(track); saveStore(data); }
}
function removeFromPlaylist(id, trackId) {
  const data = loadStore();
  const p = data.playlists.find((x) => x.id === id);
  if (p) { p.tracks = p.tracks.filter((t) => t.id !== trackId); saveStore(data); }
}
function reorderPlaylist(id, from, to) {
  const data = loadStore();
  const p = data.playlists.find((x) => x.id === id);
  if (!p) return;
  const [moved] = p.tracks.splice(from, 1);
  p.tracks.splice(to, 0, moved);
  saveStore(data);
}
function inLiked(track) { return (getPlaylist(LIKED_ID)?.tracks || []).some((t) => t.id === track.id); }
function toggleLiked(track) {
  if (inLiked(track)) removeFromPlaylist(LIKED_ID, track.id);
  else addToPlaylist(LIKED_ID, track);
  refreshFavStates(); renderLibrary();
  if (state.view === "playlist") render();
}

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  els.themeBtn.textContent = theme === "light" ? "☀️" : "🌙";
}
function toggleTheme() {
  const data = loadStore();
  data.theme = data.theme === "light" ? "dark" : "light";
  saveStore(data); applyTheme(data.theme);
}

/* ---------- Audius (free full songs, no API key) ---------- */
let audiusHost = null;
async function getAudiusHost() {
  if (audiusHost) return audiusHost;
  try {
    const res = await fetch("https://api.audius.co");
    const data = await res.json();
    const hosts = data.data || [];
    audiusHost = hosts[Math.floor(Math.random() * hosts.length)] || null;
  } catch { audiusHost = null; }
  return audiusHost;
}
function audiusToTrack(t, host) {
  return {
    id: "au" + t.id,
    title: t.title,
    artist: (t.user && t.user.name) || "Unknown artist",
    art: (t.artwork && (t.artwork["480x480"] || t.artwork["150x150"])) || "",
    src: `${host}/v1/tracks/${t.id}/stream?app_name=LiveTunes`,
    type: "song",
    ytSearch: `${t.title} ${(t.user && t.user.name) || ""}`,
  };
}
async function audiusSearch(query, limit = 40) {
  const host = await getAudiusHost();
  if (!host) return [];
  try {
    const res = await fetch(`${host}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=LiveTunes`);
    const data = await res.json();
    return (data.data || []).filter((t) => t.is_streamable !== false).slice(0, limit).map((t) => audiusToTrack(t, host));
  } catch { return []; }
}
async function audiusTrending(limit = 50) {
  const host = await getAudiusHost();
  if (!host) return [];
  try {
    const res = await fetch(`${host}/v1/tracks/trending?app_name=LiveTunes`);
    const data = await res.json();
    return (data.data || []).slice(0, limit).map((t) => audiusToTrack(t, host));
  } catch { return []; }
}
async function audiusSearchMany(queries, limit = 50) {
  const seen = new Set();
  const out = [];
  for (const q of queries) {
    const tracks = await audiusSearch(q, 12);
    for (const t of tracks) {
      if (!seen.has(t.id)) { seen.add(t.id); out.push(t); }
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/* ---------- YouTube search link ---------- */
function openYouTube(query) {
  window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(query), "_blank", "noopener");
}

/* ---------- Media Session (lock-screen / background) ---------- */
function updateMediaSession(track) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || "",
      artist: track.artist || "",
      album: "LiveTunes",
      artwork: track.art ? [
        { src: track.art, sizes: "256x256", type: "image/jpeg" },
        { src: track.art, sizes: "512x512", type: "image/jpeg" },
      ] : [],
    });
  } catch {}
}
function setMediaPlaybackState(s) {
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = s;
}

/* ---------- Playback ---------- */
function playTrack(track, queue, idx) {
  if (queue) { state.queue = queue; state.index = idx; }
  state.current = track;
  if (!track.src) { setPlayerInfo(track); return; }
  audio.src = track.src;
  audio.play().catch(() => {});
  setPlayerInfo(track);
  els.playBtn.textContent = "⏸";
  refreshFavStates();
  markPlayingRows();
}
function setPlayerInfo(track) {
  els.art.src = track.art || placeholderArt();
  els.pTitle.textContent = track.title;
  els.pArtist.textContent = track.artist;
  els.pYt.hidden = false;
  updateMediaSession(track);
}
function togglePlay() {
  if (!state.current) return;
  if (audio.paused) { audio.play(); els.playBtn.textContent = "⏸"; }
  else { audio.pause(); els.playBtn.textContent = "▶"; }
}
function playNext() {
  if (!state.queue.length) return;
  const n = (state.index + 1) % state.queue.length;
  playTrack(state.queue[n], state.queue, n);
}
function playPrev() {
  if (!state.queue.length) return;
  const p = (state.index - 1 + state.queue.length) % state.queue.length;
  playTrack(state.queue[p], state.queue, p);
}
function placeholderArt() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#18213a"/><text x="50%" y="54%" font-size="34" text-anchor="middle" dominant-baseline="middle">🎵</text></svg>'
  );
}

/* ---------- Views ---------- */
const VIEW_TITLES = {
  home: "Home",
  english: "English Songs", mandarin: "Mandarin Songs",
  search: "Search Results",
};
function setView(view, playlistId) {
  state.view = view;
  state.openPlaylist = playlistId || null;
  let title = VIEW_TITLES[view];
  if (view === "playlist") title = getPlaylist(playlistId)?.name || "Playlist";
  els.title.textContent = title || "LiveTunes";
  document.querySelectorAll(".nav-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view));
  renderLibrary();
  render();
}
function render() {
  closeAddMenu();
  switch (state.view) {
    case "home": return renderHome();
    case "english": return renderSongs("english");
    case "mandarin": return renderSongs("mandarin");
    case "playlist": return renderPlaylist();
  }
}

function renderHome() {
  els.view.innerHTML = `
    <div class="hero-grid">
      <div class="hero-card" data-go="english"><span class="hero-emoji">🇬🇧</span><h3>English Songs</h3><p>Full-length English tracks, free to play.</p></div>
      <div class="hero-card" data-go="mandarin"><span class="hero-emoji">🇨🇳</span><h3>Mandarin Songs</h3><p>華語歌曲 — full songs, free to play.</p></div>
      <div class="hero-card" data-go="liked"><span class="hero-emoji">❤️</span><h3>Liked Songs</h3><p>Everything you've hearted, in one place.</p></div>
    </div>
    <p class="muted-note">All songs play full-length and keep playing when your phone is locked.</p>`;
  els.view.querySelectorAll("[data-go]").forEach((c) =>
    c.addEventListener("click", () => {
      if (c.dataset.go === "liked") setView("playlist", LIKED_ID);
      else setView(c.dataset.go);
    }));
}

async function renderSongs(kind) {
  const label = kind === "mandarin" ? "Mandarin" : "English";
  els.view.innerHTML = `<div class="hint">Full songs, free &amp; legal via Audius. Plays in full and keeps going when locked. ▶️ opens the official version on YouTube.</div><div class="loading">Loading ${label} songs…</div>`;
  let tracks = state.audiusCache[kind];
  if (!tracks) {
    tracks = kind === "mandarin"
      ? await audiusSearchMany(MANDARIN_QUERIES, 50)
      : await audiusTrending(50);
    if (tracks.length) state.audiusCache[kind] = tracks;
  }
  if (state.view !== kind) return;
  if (!tracks.length) {
    els.view.innerHTML = `<div class="empty">Couldn't load ${label} songs right now.<br>Check your connection and try again.</div>`;
    return;
  }
  const list = document.createElement("div");
  list.className = "track-list";
  els.view.querySelector(".loading").replaceWith(list);
  tracks.forEach((t, i) => list.appendChild(trackRow(t, i, tracks, { rank: true })));
}

function trackRow(track, i, queue, opts = {}) {
  const row = document.createElement("div");
  row.className = "track";
  row.dataset.trackId = track.id;
  if (state.current && state.current.id === track.id) row.classList.add("playing");
  const liked = inLiked(track);
  const lead = opts.reorder
    ? `<div class="drag-handle" title="Drag to reorder">⋮⋮</div>`
    : `<div class="track-rank">${opts.rank ? i + 1 : ""}</div>`;
  const removeBtn = opts.removable ? `<button class="icon-btn remove-btn" title="Remove">✕</button>` : "";
  row.innerHTML = `
    ${lead}
    <img class="track-art" src="${track.art || placeholderArt()}" alt="" />
    <div class="track-info">
      <div class="track-name">${escapeHtml(track.title)}</div>
      <div class="track-artist">${escapeHtml(track.artist)}</div>
    </div>
    <div class="track-actions">
      <button class="icon-btn yt-btn" title="Open on YouTube">▶️</button>
      <button class="icon-btn add-btn" title="Add to playlist">＋</button>
      <button class="icon-btn fav-btn ${liked ? "fav" : ""}" title="Like">${liked ? "❤️" : "🤍"}</button>
      ${removeBtn}
    </div>`;
  row.addEventListener("click", (e) => {
    if (e.target.closest(".fav-btn") || e.target.closest(".add-btn") || e.target.closest(".remove-btn") || e.target.closest(".yt-btn")) return;
    playTrack(track, queue, i);
  });
  row.querySelector(".fav-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleLiked(track); });
  row.querySelector(".add-btn").addEventListener("click", (e) => { e.stopPropagation(); openAddMenu(e.currentTarget, track); });
  row.querySelector(".yt-btn").addEventListener("click", (e) => { e.stopPropagation(); openYouTube(track.ytSearch || `${track.title} ${track.artist}`); });
  if (opts.removable)
    row.querySelector(".remove-btn").addEventListener("click", (e) => {
      e.stopPropagation(); removeFromPlaylist(state.openPlaylist, track.id); render(); renderLibrary();
    });
  if (opts.reorder) enableDrag(row, i);
  return row;
}

function renderPlaylist() {
  const pl = getPlaylist(state.openPlaylist);
  if (!pl) { setView("home"); return; }
  els.view.innerHTML = "";
  const header = document.createElement("div");
  header.className = "playlist-header";
  header.innerHTML = `
    <div class="playlist-cover">${pl.id === LIKED_ID ? "❤️" : "🎶"}</div>
    <div class="playlist-headinfo">
      <div class="playlist-kind">Playlist</div>
      <h2 class="playlist-title">${escapeHtml(pl.name)}</h2>
      <div class="playlist-count">${pl.tracks.length} song${pl.tracks.length === 1 ? "" : "s"}</div>
      <div class="playlist-tools">
        ${pl.tracks.length ? `<button class="pill-btn" id="play-all">▶ Play all</button>` : ""}
        ${pl.id !== LIKED_ID ? `<button class="pill-btn ghost" id="rename-pl">Rename</button><button class="pill-btn ghost danger" id="delete-pl">Delete</button>` : ""}
      </div>
    </div>`;
  els.view.appendChild(header);
  if (!pl.tracks.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML = `This playlist is empty.<br>Use ＋ on any song to add it here.`;
    els.view.appendChild(empty);
  } else {
    const list = document.createElement("div");
    list.className = "track-list"; list.id = "pl-list";
    els.view.appendChild(list);
    pl.tracks.forEach((t, i) => list.appendChild(trackRow(t, i, pl.tracks, { reorder: true, removable: true })));
  }
  const playAll = document.getElementById("play-all");
  if (playAll) playAll.addEventListener("click", () => playTrack(pl.tracks[0], pl.tracks, 0));
  const renameBtn = document.getElementById("rename-pl");
  if (renameBtn) renameBtn.addEventListener("click", () => {
    const name = prompt("Rename playlist", pl.name);
    if (name && name.trim()) { renamePlaylist(pl.id, name.trim()); setView("playlist", pl.id); }
  });
  const deleteBtn = document.getElementById("delete-pl");
  if (deleteBtn) deleteBtn.addEventListener("click", () => {
    if (confirm(`Delete playlist "${pl.name}"?`)) { deletePlaylist(pl.id); setView("home"); }
  });
}

/* ---------- Drag to reorder ---------- */
let dragFrom = null;
function enableDrag(row, index) {
  row.setAttribute("draggable", "true");
  row.addEventListener("dragstart", () => { dragFrom = index; row.classList.add("dragging"); });
  row.addEventListener("dragend", () => { row.classList.remove("dragging"); dragFrom = null; });
  row.addEventListener("dragover", (e) => { e.preventDefault(); row.classList.add("drop-target"); });
  row.addEventListener("dragleave", () => row.classList.remove("drop-target"));
  row.addEventListener("drop", (e) => {
    e.preventDefault(); row.classList.remove("drop-target");
    if (dragFrom === null || dragFrom === index) return;
    reorderPlaylist(state.openPlaylist, dragFrom, index); render();
  });
}

/* ---------- Add-to-playlist popover ---------- */
function openAddMenu(anchor, track) {
  const playlists = getPlaylists();
  els.addMenu.innerHTML = `
    <div class="add-menu-head">Add to playlist</div>
    ${playlists.map((p) => `
      <button class="add-menu-item" data-pl="${p.id}">
        <span>${p.id === LIKED_ID ? "❤️" : "🎶"} ${escapeHtml(p.name)}</span>
        <span class="check">${p.tracks.some((t) => t.id === track.id) ? "✓" : ""}</span>
      </button>`).join("")}
    <button class="add-menu-item new" data-new="1">＋ New playlist…</button>`;
  const r = anchor.getBoundingClientRect();
  els.addMenu.hidden = false;
  const menuW = 240;
  let left = r.right - menuW; if (left < 8) left = 8;
  els.addMenu.style.left = left + "px";
  els.addMenu.style.top = (r.bottom + 6) + "px";
  const mh = els.addMenu.offsetHeight;
  if (r.bottom + 6 + mh > window.innerHeight - 100) els.addMenu.style.top = (r.top - mh - 6) + "px";
  els.addMenu.querySelectorAll(".add-menu-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.dataset.new) {
        const name = prompt("New playlist name");
        if (name && name.trim()) { const id = createPlaylist(name.trim()); addToPlaylist(id, track); }
      } else {
        const id = btn.dataset.pl;
        if (getPlaylist(id).tracks.some((t) => t.id === track.id)) removeFromPlaylist(id, track.id);
        else addToPlaylist(id, track);
      }
      closeAddMenu(); refreshFavStates(); renderLibrary();
      if (state.view === "playlist") render();
    });
  });
}
function closeAddMenu() { els.addMenu.hidden = true; els.addMenu.innerHTML = ""; }
document.addEventListener("click", (e) => {
  if (!els.addMenu.hidden && !e.target.closest("#add-menu") && !e.target.closest(".add-btn")) closeAddMenu();
});

/* ---------- Sidebar library ---------- */
function renderLibrary() {
  const playlists = getPlaylists();
  els.libraryList.innerHTML = "";
  playlists.forEach((p) => {
    const btn = document.createElement("button");
    btn.className = "library-item" + (state.view === "playlist" && state.openPlaylist === p.id ? " active" : "");
    btn.innerHTML = `<span class="lib-emoji">${p.id === LIKED_ID ? "❤️" : "🎶"}</span><span class="lib-name">${escapeHtml(p.name)}</span><span class="lib-count">${p.tracks.length}</span>`;
    btn.addEventListener("click", () => setView("playlist", p.id));
    els.libraryList.appendChild(btn);
  });
}

/* ---------- Search (Audius full songs) ---------- */
async function runSearch(q) {
  if (!q.trim()) return;
  setView("search");
  els.view.innerHTML = `<div class="loading">Searching for “${escapeHtml(q)}”…</div>`;
  const tracks = await audiusSearch(q, 40);
  if (state.view !== "search") return;
  if (!tracks.length) {
    els.view.innerHTML = `<div class="empty">No full songs found for “${escapeHtml(q)}”.<br>Try a different term, or use the ▶️ button on a song to open YouTube.</div>`;
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "track-list";
  els.view.innerHTML = "";
  els.view.appendChild(wrap);
  tracks.forEach((t, i) => wrap.appendChild(trackRow(t, i, tracks, {})));
}

/* ---------- Helpers ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtTime(sec) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function refreshFavStates() {
  if (state.current && state.current.type === "song") {
    const liked = inLiked(state.current);
    els.fav.textContent = liked ? "❤️" : "🤍";
    els.fav.classList.toggle("fav", liked);
  } else els.fav.textContent = "🤍";
  document.querySelectorAll(".track").forEach((row) => {
    const btn = row.querySelector(".fav-btn"); if (!btn) return;
    const liked = (getPlaylist(LIKED_ID)?.tracks || []).some((t) => t.id === row.dataset.trackId);
    btn.textContent = liked ? "❤️" : "🤍";
    btn.classList.toggle("fav", liked);
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
els.fav.addEventListener("click", () => { if (state.current && state.current.type === "song") toggleLiked(state.current); });
els.pYt.addEventListener("click", () => { if (state.current) openYouTube(state.current.ytSearch || `${state.current.title} ${state.current.artist}`); });
els.themeBtn.addEventListener("click", toggleTheme);
els.newPlaylistBtn.addEventListener("click", () => {
  const name = prompt("New playlist name");
  if (name && name.trim()) { const id = createPlaylist(name.trim()); setView("playlist", id); }
});

els.volume.addEventListener("input", () => { audio.volume = els.volume.value / 100; });
audio.volume = els.volume.value / 100;

let seeking = false;
els.seek.addEventListener("input", () => { seeking = true; });
els.seek.addEventListener("change", () => {
  seeking = false;
  if (audio.duration) audio.currentTime = (els.seek.value / 100) * audio.duration;
});

audio.addEventListener("timeupdate", () => {
  els.timeCur.textContent = fmtTime(audio.currentTime);
  els.timeTot.textContent = fmtTime(audio.duration);
  if (!seeking) els.seek.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
});
audio.addEventListener("ended", playNext);
audio.addEventListener("play", () => { els.playBtn.textContent = "⏸"; setMediaPlaybackState("playing"); });
audio.addEventListener("pause", () => { els.playBtn.textContent = "▶"; setMediaPlaybackState("paused"); });

/* Lock-screen / headset / notification controls for background audio. */
if ("mediaSession" in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler("play", () => audio.play());
  ms.setActionHandler("pause", () => audio.pause());
  ms.setActionHandler("previoustrack", () => playPrev());
  ms.setActionHandler("nexttrack", () => playNext());
  try {
    ms.setActionHandler("seekto", (e) => {
      if (audio.duration && e.seekTime != null) audio.currentTime = e.seekTime;
    });
  } catch {}
}

els.searchBtn.addEventListener("click", () => runSearch(els.searchInput.value));
els.searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(els.searchInput.value); });

/* ---------- Init ---------- */
applyTheme(loadStore().theme);
els.art.src = placeholderArt();
renderLibrary();
setView("home");
