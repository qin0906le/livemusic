/* LiveTunes — app logic
   - Resolves songs to playable 30s previews via the iTunes Search API
   - Streams live internet radio (grouped stations)
   - Multiple named playlists + a default "Liked Songs", persisted in localStorage
   - Light/dark theme, drag-to-reorder within a playlist */

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
  openPlaylist: null, // id of playlist being viewed
  queue: [],
  index: -1,
  isLive: false,
  current: null,
  cache: {},
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
  saveStore(data);
  return id;
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
  refreshFavStates();
  renderLibrary();
  if (state.view === "playlist") render();
}
function inAnyPlaylist(track) { return getPlaylists().some((p) => p.tracks.some((t) => t.id === track.id)); }

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  els.themeBtn.textContent = theme === "light" ? "☀️" : "🌙";
}
function toggleTheme() {
  const data = loadStore();
  data.theme = data.theme === "light" ? "dark" : "light";
  saveStore(data);
  applyTheme(data.theme);
}

/* ---------- iTunes preview resolver ---------- */
async function resolveTrack(label) {
  if (state.cache[label]) return state.cache[label];
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
  } catch (e) { /* offline / blocked */ }

  if (!track) {
    track = {
      id: "ph" + btoa(unescape(encodeURIComponent(label))).slice(0, 16),
      title: titlePart || label,
      artist: artistPart || "Unknown artist",
      art: "", preview: "", type: "song",
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
  els.art.src = track.art || placeholderArt();
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
  const n = (state.index + 1) % state.queue.length;
  playTrack(state.queue[n], state.queue, n);
}
function playPrev() {
  if (state.isLive || !state.queue.length) return;
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
  home: "Home", live: "Live Radio",
  english: "Top 50 English Songs", mandarin: "Top 50 Mandarin Songs",
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
    case "live": return renderStations();
    case "english": return renderChart(TOP_ENGLISH);
    case "mandarin": return renderChart(TOP_MANDARIN);
    case "playlist": return renderPlaylist();
  }
}

function renderHome() {
  els.view.innerHTML = `
    <div class="hero-grid">
      <div class="hero-card" data-go="live"><span class="hero-emoji">📻</span><h3>Live Radio</h3><p>Stream curated stations playing right now, 24/7.</p></div>
      <div class="hero-card" data-go="english"><span class="hero-emoji">🇬🇧</span><h3>Top 50 English</h3><p>The biggest English-language hits, ranked.</p></div>
      <div class="hero-card" data-go="mandarin"><span class="hero-emoji">🇨🇳</span><h3>Top 50 Mandarin</h3><p>華語金曲 — the top 50 Mandarin tracks.</p></div>
      <div class="hero-card" data-go="liked"><span class="hero-emoji">❤️</span><h3>Liked Songs</h3><p>Everything you've hearted, in one place.</p></div>
    </div>
    <h2 class="section-title">Featured stations</h2>
    <div id="home-stations" class="station-grid"></div>`;
  els.view.querySelectorAll("[data-go]").forEach((c) =>
    c.addEventListener("click", () => {
      if (c.dataset.go === "liked") setView("playlist", LIKED_ID);
      else setView(c.dataset.go);
    }));
  renderStationGrid(document.getElementById("home-stations"), STATIONS.slice(0, 6));
}

function renderStations() {
  els.view.innerHTML = "";
  const groups = [...new Set(STATIONS.map((s) => s.group))];
  groups.forEach((g) => {
    const h = document.createElement("h2");
    h.className = "section-title";
    h.textContent = g;
    els.view.appendChild(h);
    const grid = document.createElement("div");
    grid.className = "station-grid";
    els.view.appendChild(grid);
    renderStationGrid(grid, STATIONS.filter((s) => s.group === g));
  });
  const note = document.createElement("p");
  note.className = "muted-note";
  note.textContent = "Mandarin & Asian stations are public community streams and may occasionally change URLs.";
  els.view.appendChild(note);
}

function renderStationGrid(container, stations) {
  container.innerHTML = "";
  stations.forEach((s) => {
    const track = { id: "st" + s.name, title: s.name, artist: s.genre, art: "", type: "station", url: s.url };
    const card = document.createElement("div");
    card.className = "station-card" + (state.current && state.current.id === track.id ? " playing" : "");
    card.innerHTML = `<div class="station-emoji">${s.emoji}</div><div class="station-name">${escapeHtml(s.name)}</div><div class="station-genre">${escapeHtml(s.genre)}</div>`;
    card.addEventListener("click", () => { playTrack(track); render(); });
    container.appendChild(card);
  });
}

async function renderChart(labels) {
  els.view.innerHTML = `<div class="loading">Loading the chart…</div>`;
  const list = document.createElement("div");
  list.className = "track-list";
  els.view.innerHTML = "";
  els.view.appendChild(list);
  const resolved = [];
  for (let i = 0; i < labels.length; i++) {
    const track = await resolveTrack(labels[i]);
    resolved.push(track);
    if (state.view !== "english" && state.view !== "mandarin") return; // user navigated away
    list.appendChild(trackRow(track, i, resolved, { rank: true }));
  }
}

function trackRow(track, i, queue, opts = {}) {
  const row = document.createElement("div");
  row.className = "track";
  row.dataset.trackId = track.id;
  if (state.current && state.current.id === track.id) row.classList.add("playing");

  const liked = inLiked(track);
  const dragHandle = opts.reorder ? `<div class="drag-handle" title="Drag to reorder">⋮⋮</div>` : "";
  const rank = opts.rank ? `<div class="track-rank">${i + 1}</div>` : `<div class="track-rank">${opts.reorder ? "" : i + 1}</div>`;
  const removeBtn = opts.removable ? `<button class="icon-btn remove-btn" title="Remove">✕</button>` : "";

  row.innerHTML = `
    ${opts.reorder ? dragHandle : rank}
    <img class="track-art" src="${track.art || placeholderArt()}" alt="" />
    <div class="track-info">
      <div class="track-name">${escapeHtml(track.title)}</div>
      <div class="track-artist">${escapeHtml(track.artist)}</div>
    </div>
    <div class="track-actions">
      <button class="icon-btn add-btn" title="Add to playlist">＋</button>
      <button class="icon-btn fav-btn ${liked ? "fav" : ""}" title="Like">${liked ? "❤️" : "🤍"}</button>
      ${removeBtn}
    </div>`;

  row.addEventListener("click", (e) => {
    if (e.target.closest(".fav-btn") || e.target.closest(".add-btn") || e.target.closest(".remove-btn")) return;
    playTrack(track, queue, i);
  });
  row.querySelector(".fav-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleLiked(track); });
  row.querySelector(".add-btn").addEventListener("click", (e) => { e.stopPropagation(); openAddMenu(e.currentTarget, track); });
  if (opts.removable)
    row.querySelector(".remove-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      removeFromPlaylist(state.openPlaylist, track.id);
      render(); renderLibrary();
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
    list.className = "track-list";
    list.id = "pl-list";
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
    e.preventDefault();
    row.classList.remove("drop-target");
    if (dragFrom === null || dragFrom === index) return;
    reorderPlaylist(state.openPlaylist, dragFrom, index);
    render();
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
  let left = r.right - menuW;
  if (left < 8) left = 8;
  let top = r.bottom + 6;
  els.addMenu.style.left = left + "px";
  els.addMenu.style.top = top + "px";
  // if it would overflow bottom, show above
  const mh = els.addMenu.offsetHeight;
  if (top + mh > window.innerHeight - 100) els.addMenu.style.top = (r.top - mh - 6) + "px";

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
      closeAddMenu();
      refreshFavStates(); renderLibrary();
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

/* ---------- Search ---------- */
async function runSearch(q) {
  if (!q.trim()) return;
  setView("search");
  els.view.innerHTML = `<div class="loading">Searching for “${escapeHtml(q)}”…</div>`;
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=30`;
    const res = await fetch(url);
    const data = await res.json();
    const tracks = (data.results || []).map((r) => ({
      id: "it" + r.trackId, title: r.trackName, artist: r.artistName,
      art: r.artworkUrl100 ? r.artworkUrl100.replace("100x100", "200x200") : "",
      preview: r.previewUrl || "", type: "song",
    }));
    if (state.view !== "search") return;
    if (!tracks.length) { els.view.innerHTML = `<div class="empty">No results for “${escapeHtml(q)}”.</div>`; return; }
    const wrap = document.createElement("div");
    wrap.className = "track-list";
    els.view.innerHTML = "";
    els.view.appendChild(wrap);
    tracks.forEach((t, i) => wrap.appendChild(trackRow(t, i, tracks, { rank: false })));
  } catch {
    els.view.innerHTML = `<div class="empty">Search is unavailable right now (network blocked).</div>`;
  }
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
    const id = row.dataset.trackId;
    const btn = row.querySelector(".fav-btn");
    if (!btn) return;
    const liked = (getPlaylist(LIKED_ID)?.tracks || []).some((t) => t.id === id);
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
els.themeBtn.addEventListener("click", toggleTheme);
els.newPlaylistBtn.addEventListener("click", () => {
  const name = prompt("New playlist name");
  if (name && name.trim()) { const id = createPlaylist(name.trim()); setView("playlist", id); }
});

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

/* ---------- Init ---------- */
applyTheme(loadStore().theme);
els.art.src = placeholderArt();
renderLibrary();
setView("home");
