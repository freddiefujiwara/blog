// Embedded music player. blog-gas turns a document paragraph of the
// form [[music|タイトル|音源ファイル名.mp3]] into a placeholder
//   <div class="music-track" data-title="..." data-file="..."></div>
// in the article HTML. This module collects the placeholders of an
// article (in document order) into a single playlist player.
//
// The MP3s live in Google Drive; Drive's direct-download responses
// arrive as Content-Disposition: attachment, which browsers refuse
// to play in an <audio> element, and the files are not hosted on
// GitHub either. The music-gas endpoint bridges the gap: it returns
// a track's bytes as base64 JSON, which the player decodes into a
// Blob and hands the element an object URL.
//
// The player itself is hand-rolled around a single <audio> element
// (an earlier version embedded the APlayer library; its icon-only
// controls were hard to read, so the controls here are labelled
// buttons in Japanese: 再生／一時停止, 前へ, 次へ, a seek bar with
// elapsed/total times, リピート：なし／全曲／1曲 and
// ランダム：オフ／オン, over a tappable track list).

import { MUSIC_ENDPOINT } from '../constants.js';

const AUDIO_FILE_PATTERN = /^[A-Za-z0-9_-]+\.mp3$/;
const TRACK_PLACEHOLDER_PATTERN =
  /<div class="music-track" data-title="([^"]*)" data-file="([A-Za-z0-9_-]+\.mp3)"><\/div>/g;

const unescapeHtml = (text) => String(text ?? '')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

// The tracks an article HTML declares, in order. Used to decide
// whether the player is needed at all and covered by unit tests;
// the mount below re-reads the same data from the live DOM.
export const extractMusicTracks = (html) => {
  const tracks = [];
  const pattern = new RegExp(TRACK_PLACEHOLDER_PATTERN.source, 'g');
  let match;
  while ((match = pattern.exec(String(html ?? ''))) !== null) {
    tracks.push({ title: unescapeHtml(match[1]), file: match[2] });
  }
  return tracks;
};

// The music-gas request URL for one track. The file name is
// validated again here so a malformed placeholder can never make
// the player ask the endpoint for anything but a plain mp3 name.
// Returns '' while the endpoint is not configured.
export const musicTrackApiUrl = (file, endpoint = MUSIC_ENDPOINT) => (
  AUDIO_FILE_PATTERN.test(file ?? '') && endpoint
    ? `${endpoint}?track=${encodeURIComponent(file)}`
    : ''
);

export const decodeBase64ToBlob = (base64, mime) => {
  const binary = atob(String(base64 ?? ''));
  const chunkSize = 0x8000;
  const parts = [];
  for (let offset = 0; offset < binary.length; offset += chunkSize) {
    const chunk = binary.slice(offset, offset + chunkSize);
    const bytes = new Uint8Array(chunk.length);
    for (let i = 0; i < chunk.length; i += 1) bytes[i] = chunk.charCodeAt(i);
    parts.push(bytes);
  }
  return new Blob(parts, { type: mime || 'audio/mpeg' });
};

// Fetched track blobs are kept for the session: switching back to
// a track that already played never asks music-gas again.
const blobCache = new Map();

export const fetchTrackBlob = (file, endpoint = MUSIC_ENDPOINT) => {
  if (blobCache.has(file)) return blobCache.get(file);
  const promise = (async () => {
    const url = musicTrackApiUrl(file, endpoint);
    if (!url) throw new Error('music endpoint is not configured');
    const response = await fetch(url);
    const payload = await response.json();
    if (!payload || !payload.ok) {
      throw new Error((payload && payload.error) || 'music-gas request failed');
    }
    return decodeBase64ToBlob(payload.data, payload.mime);
  })();
  blobCache.set(file, promise);
  promise.catch(() => blobCache.delete(file));
  return promise;
};

// Seconds → "m:ss" for the progress readout. Anything unusable
// (NaN before metadata arrives, Infinity for a stream) reads 0:00.
export const formatTime = (seconds) => {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
};

// One step through the playlist, wrapping at both ends.
export const stepIndex = (index, count, delta) => {
  if (!count) return 0;
  return (((index + delta) % count) + count) % count;
};

// What happens when the current track ends. Pure, so every
// combination is unit-tested; the caller picks one of the advance
// candidates at random when random mode is on.
//
//   repeat 'one'  → replay the same track
//   random        → advance to a track not yet played this round;
//                   with repeat 'all' a fresh round starts when the
//                   round runs out, otherwise playback stops after
//                   every track has played once
//   list order    → advance to the next track; at the end of the
//                   list, repeat 'all' wraps to the first track and
//                   anything else stops
// `played` holds the indices already started this round (including
// the current one). A resetPlayed plan starts a new round with
// only the chosen track in it.
export const endedPlan = ({ index, count, repeat, random, played }) => {
  if (!count) return { type: 'stop' };
  if (repeat === 'one') return { type: 'replay' };
  if (random) {
    const remaining = [];
    for (let i = 0; i < count; i += 1) {
      if (i !== index && !played.has(i)) remaining.push(i);
    }
    if (remaining.length) return { type: 'advance', candidates: remaining };
    if (repeat === 'all') {
      const fresh = [];
      for (let i = 0; i < count; i += 1) {
        if (count === 1 || i !== index) fresh.push(i);
      }
      return { type: 'advance', candidates: fresh, resetPlayed: true };
    }
    return { type: 'stop' };
  }
  if (index + 1 < count) return { type: 'advance', candidates: [index + 1] };
  if (repeat === 'all') return { type: 'advance', candidates: [0] };
  return { type: 'stop' };
};

const REPEAT_LABELS = { none: 'リピート：なし', all: 'リピート：全曲', one: 'リピート：1曲' };
const REPEAT_CYCLE = { none: 'all', all: 'one', one: 'none' };

const pickRandom = (candidates) => candidates[Math.floor(Math.random() * candidates.length)];

// audio.play() returns a promise in modern browsers; an autoplay
// rejection (or a non-promise return in odd embeddings) must never
// surface as an unhandled error in the article.
const tryPlay = (audio) => {
  try {
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
  } catch (err) {
    // Playback could not start; the reader can press play again.
  }
};

// Builds one player inside container for the given tracks and
// returns its handle. All state lives in this closure; the module
// only remembers the current player so article navigation can tear
// it down.
const createPlayer = (container, tracks) => {
  const audio = new Audio();
  audio.preload = 'auto';

  const state = {
    index: 0,
    repeat: 'none',
    random: false,
    played: new Set(),
    history: [],
    wantPlay: false,
    loadedFile: '',
    loading: false,
    loadSeq: 0,
    destroyed: false
  };

  const objectUrls = new Map();
  const objectUrlFor = async (file) => {
    if (objectUrls.has(file)) return objectUrls.get(file);
    const blob = await fetchTrackBlob(file);
    const url = URL.createObjectURL(blob);
    objectUrls.set(file, url);
    return url;
  };

  // --- DOM ------------------------------------------------------------
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const nowEl = el('p', 'mp-now', tracks[0].title);
  const prevButton = el('button', 'mp-button mp-prev', '前へ');
  const playButton = el('button', 'mp-button mp-play', '再生');
  const nextButton = el('button', 'mp-button mp-next', '次へ');
  [prevButton, playButton, nextButton].forEach((b) => { b.type = 'button'; });
  const controlsEl = el('div', 'mp-controls');
  controlsEl.append(prevButton, playButton, nextButton);

  const currentTimeEl = el('span', 'mp-time mp-current', '0:00');
  const seekEl = document.createElement('input');
  seekEl.type = 'range';
  seekEl.className = 'mp-seek';
  seekEl.min = '0';
  seekEl.max = '0';
  seekEl.step = '0.1';
  seekEl.value = '0';
  seekEl.setAttribute('aria-label', '再生位置');
  const totalTimeEl = el('span', 'mp-time mp-total', '0:00');
  const progressEl = el('div', 'mp-progress');
  progressEl.append(currentTimeEl, seekEl, totalTimeEl);

  const repeatButton = el('button', 'mp-button mp-repeat', REPEAT_LABELS.none);
  repeatButton.type = 'button';
  const randomButton = el('button', 'mp-button mp-random', 'ランダム：オフ');
  randomButton.type = 'button';
  randomButton.setAttribute('aria-pressed', 'false');
  const togglesEl = el('div', 'mp-toggles');
  togglesEl.append(repeatButton, randomButton);

  const listEl = el('ol', 'mp-list');
  const itemButtons = tracks.map((track, i) => {
    const item = el('li', 'mp-item');
    const button = el('button', 'mp-track');
    button.type = 'button';
    button.append(
      el('span', 'mp-track-index', String(i + 1)),
      el('span', 'mp-track-title', track.title)
    );
    button.addEventListener('click', () => {
      state.wantPlay = true;
      startTrack(i);
    });
    item.appendChild(button);
    listEl.appendChild(item);
    return button;
  });

  const statusEl = el('p', 'mp-status', '');
  statusEl.setAttribute('role', 'status');

  container.append(nowEl, controlsEl, progressEl, togglesEl, listEl, statusEl);
  container.appendChild(audio);

  // --- UI sync ----------------------------------------------------------
  const syncNow = () => {
    nowEl.textContent = tracks[state.index].title;
    itemButtons.forEach((button, i) => {
      button.classList.toggle('is-active', i === state.index);
    });
  };
  const syncPlayButton = () => {
    playButton.textContent = state.loading ? '読み込み中…' : (audio.paused ? '再生' : '一時停止');
  };
  const syncProgress = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    seekEl.max = String(duration);
    if (document.activeElement !== seekEl) seekEl.value = String(audio.currentTime || 0);
    currentTimeEl.textContent = formatTime(audio.currentTime);
    totalTimeEl.textContent = formatTime(duration);
  };
  const setStatus = (text) => { statusEl.textContent = text; };

  // --- Track loading ------------------------------------------------------
  // Once one track is in, quietly fetch the rest of the playlist in
  // the background, one at a time. Most switches then find their
  // bytes already in the session cache, which also keeps iOS from
  // treating a long-delayed programmatic play() as unsolicited
  // autoplay.
  let prefetchStarted = false;
  const prefetchRemaining = () => {
    if (prefetchStarted) return;
    prefetchStarted = true;
    tracks.reduce(
      (chain, track) => chain.then(() => fetchTrackBlob(track.file)).catch(() => {}),
      Promise.resolve()
    );
  };

  // Starts the track at index i. Records it in the round's played
  // set and the back-history, loads its bytes if the element does
  // not hold them yet, and plays when the reader's intent is to
  // listen (a list tap, the play button, an automatic advance).
  const startTrack = (i, { record = true } = {}) => {
    state.index = i;
    if (record) {
      state.played.add(i);
      state.history.push(i);
      if (state.history.length > 100) state.history.shift();
    }
    syncNow();
    const file = tracks[i].file;
    const seq = ++state.loadSeq;
    if (state.loadedFile === file && audio.src) {
      audio.currentTime = 0;
      if (state.wantPlay) tryPlay(audio);
      syncPlayButton();
      return;
    }
    state.loading = true;
    syncPlayButton();
    setStatus('');
    objectUrlFor(file)
      .then((url) => {
        if (state.destroyed || seq !== state.loadSeq) return;
        state.loading = false;
        state.loadedFile = file;
        audio.src = url;
        prefetchRemaining();
        if (state.wantPlay) tryPlay(audio);
        syncPlayButton();
        syncProgress();
      })
      .catch(() => {
        if (state.destroyed || seq !== state.loadSeq) return;
        state.loading = false;
        setStatus('音源を読み込めませんでした');
        syncPlayButton();
      });
  };

  // --- Controls -----------------------------------------------------------
  playButton.addEventListener('click', () => {
    if (!audio.paused) {
      state.wantPlay = false;
      audio.pause();
      return;
    }
    state.wantPlay = true;
    if (state.loadedFile === tracks[state.index].file && audio.src) {
      tryPlay(audio);
    } else {
      startTrack(state.index, { record: false });
    }
  });

  nextButton.addEventListener('click', () => {
    if (state.random && tracks.length > 1) {
      const others = tracks.map((_, i) => i).filter((i) => i !== state.index);
      startTrack(pickRandom(others));
    } else {
      startTrack(stepIndex(state.index, tracks.length, 1));
    }
  });

  prevButton.addEventListener('click', () => {
    if (state.random) {
      // Back means "the track I heard before this one": walk the
      // history back to the most recent different track.
      const history = state.history;
      for (let k = history.length - 2; k >= 0; k -= 1) {
        if (history[k] !== state.index) {
          state.history = history.slice(0, k);
          startTrack(history[k]);
          return;
        }
      }
    }
    startTrack(stepIndex(state.index, tracks.length, -1));
  });

  repeatButton.addEventListener('click', () => {
    state.repeat = REPEAT_CYCLE[state.repeat];
    repeatButton.textContent = REPEAT_LABELS[state.repeat];
  });

  randomButton.addEventListener('click', () => {
    state.random = !state.random;
    randomButton.textContent = state.random ? 'ランダム：オン' : 'ランダム：オフ';
    randomButton.setAttribute('aria-pressed', state.random ? 'true' : 'false');
    randomButton.classList.toggle('is-on', state.random);
    // A fresh round starts with the current track as its first.
    state.played = new Set([state.index]);
  });

  seekEl.addEventListener('input', () => {
    const value = Number(seekEl.value);
    if (Number.isFinite(value)) {
      audio.currentTime = value;
      currentTimeEl.textContent = formatTime(value);
    }
  });

  // --- Audio events ---------------------------------------------------------
  audio.addEventListener('play', syncPlayButton);
  audio.addEventListener('pause', syncPlayButton);
  audio.addEventListener('timeupdate', syncProgress);
  audio.addEventListener('loadedmetadata', syncProgress);
  audio.addEventListener('durationchange', syncProgress);
  audio.addEventListener('error', () => {
    if (state.loadedFile) setStatus('音源を読み込めませんでした');
  });
  audio.addEventListener('ended', () => {
    const plan = endedPlan({
      index: state.index,
      count: tracks.length,
      repeat: state.repeat,
      random: state.random,
      played: state.played
    });
    if (plan.type === 'replay') {
      audio.currentTime = 0;
      tryPlay(audio);
      return;
    }
    if (plan.type === 'advance') {
      const next = state.random ? pickRandom(plan.candidates) : plan.candidates[0];
      if (plan.resetPlayed) state.played = new Set();
      state.wantPlay = true;
      startTrack(next);
      return;
    }
    // stop: leave the finished track selected; pressing play
    // starts it over, as an ended element replays from 0.
    state.wantPlay = false;
    syncPlayButton();
  });

  syncNow();
  syncPlayButton();
  syncProgress();

  return {
    destroy() {
      state.destroyed = true;
      state.loadSeq += 1;
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (err) {
        // A half-initialised element must not break navigation.
      }
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
      container.innerHTML = '';
    }
  };
};

let currentPlayer = null;

export const destroyMusicPlayer = () => {
  if (!currentPlayer) return;
  try {
    currentPlayer.destroy();
  } catch (err) {
    // A half-initialised player must not break article navigation.
  }
  currentPlayer = null;
};

// Replaces the placeholders under rootEl with one playlist player
// sitting where the first placeholder was. No placeholders (the
// common case) leaves the article untouched.
export const mountMusicPlayer = async (rootEl) => {
  if (!rootEl) return;
  const placeholders = [...rootEl.querySelectorAll('.music-track')];
  if (!placeholders.length) return;
  const tracks = placeholders
    .map((el) => ({ title: el.dataset.title || '', file: el.dataset.file || '' }))
    .filter((track) => AUDIO_FILE_PATTERN.test(track.file));
  const container = document.createElement('div');
  container.className = 'music-player';
  placeholders[0].replaceWith(container);
  placeholders.forEach((el) => el.remove());
  if (!tracks.length) return;
  destroyMusicPlayer();
  if (!container.isConnected) return;
  currentPlayer = createPlayer(container, tracks);
};
