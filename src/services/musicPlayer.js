// Embedded music player. blog-gas turns a document paragraph of the
// form [[music|タイトル|音源ファイル名.mp3]] into a placeholder
//   <div class="music-track" data-title="..." data-file="..."></div>
// in the article HTML. This module collects the placeholders of an
// article (in document order) into a single APlayer playlist.
//
// The MP3s live in Google Drive; Drive's direct-download responses
// arrive as Content-Disposition: attachment, which browsers refuse
// to play in an <audio> element, and the files are not hosted on
// GitHub either. The music-gas endpoint bridges the gap: it returns
// a track's bytes as base64 JSON, and the custom APlayer audio type
// below fetches that, decodes it into a Blob and hands the element
// an object URL. APlayer itself is a vendored library under
// public/vendor, loaded lazily, only for articles with tracks.

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

// APlayer custom audio type: APlayer calls this instead of setting
// the element's src itself whenever the current track changes. A
// monotonically increasing activation id keeps a slow fetch for an
// earlier track from hijacking the element after the reader has
// already moved on.
//
// APlayer follows the handler call by seeking to 0 and resuming
// playback, but our replacement bytes arrive seconds later — left
// as-is, the element would replay the PREVIOUS track from its
// start in the meantime. So the old source is detached
// synchronously, before the fetch starts.
//
// Whether to resume is decided when the bytes ARRIVE, by reading
// player.paused then — not at handler entry. APlayer signals its
// intent through that flag after the handler returns: its play()
// flips it to false synchronously (setUIPlaying in the vendored
// source), and the ended → skipForward → play() sequence of a
// natural track end does exactly that. Reading the flag at entry
// missed the loop-around case: right after a track ends the
// player still reads paused, so the first track of the next round
// loaded but never started. Reading it late also honors a pause
// the reader presses while the fetch is in flight.
let latestActivation = 0;
const liveObjectUrls = new Set();

// Once one track is in, quietly fetch the rest of the playlist in
// the background, one at a time. Most switches then find their
// bytes already in the session cache, which also keeps iOS from
// treating a long-delayed programmatic play() as unsolicited
// autoplay. Runs at most once per page session.
let prefetchStarted = false;
const prefetchRemainingTracks = (player) => {
  if (prefetchStarted) return;
  const audios = (player && player.list && player.list.audios) || [];
  const files = [];
  audios.forEach((entry) => {
    try {
      const file = new URL(entry.url).searchParams.get('track') || '';
      if (file && AUDIO_FILE_PATTERN.test(file)) files.push(file);
    } catch (err) {
      // A malformed playlist entry must not break the prefetch.
    }
  });
  if (!files.length) return;
  prefetchStarted = true;
  files.reduce(
    (chain, file) => chain.then(() => fetchTrackBlob(file)).catch(() => {}),
    Promise.resolve()
  );
};

export const gasAudioType = (audioElement, audio, player) => {
  const activation = ++latestActivation;
  audioElement.pause();
  audioElement.removeAttribute('src');
  audioElement.load();
  let file = '';
  try {
    file = new URL(audio.url).searchParams.get('track') || '';
  } catch (err) {
    file = '';
  }
  if (!file) {
    if (player && typeof player.notice === 'function') {
      player.notice('音源を読み込めませんでした', 2000);
    }
    return;
  }
  fetchTrackBlob(file)
    .then((blob) => {
      if (activation !== latestActivation) return;
      const objectUrl = URL.createObjectURL(blob);
      liveObjectUrls.add(objectUrl);
      audioElement.src = objectUrl;
      prefetchRemainingTracks(player);
      if (player && !player.paused) {
        const attempt = audioElement.play();
        if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
      }
    })
    .catch(() => {
      if (activation === latestActivation && player && typeof player.notice === 'function') {
        player.notice('音源を読み込めませんでした', 2000);
      }
    });
};

let loadPromise = null;

const loadAPlayer = () => {
  if (typeof window !== 'undefined' && window.APlayer) {
    return Promise.resolve(window.APlayer);
  }
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve) => {
    const base = import.meta.env.BASE_URL || '/';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${base}vendor/APlayer.min.css`;
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = `${base}vendor/APlayer.min.js`;
    script.onload = () => resolve(window.APlayer || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return loadPromise;
};

let currentPlayer = null;

export const destroyMusicPlayer = () => {
  latestActivation += 1;
  liveObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  liveObjectUrls.clear();
  if (!currentPlayer) return;
  try {
    currentPlayer.destroy();
  } catch (err) {
    // A half-initialised player must not break article navigation.
  }
  currentPlayer = null;
};

// The player's accent (play button, progress, active-track bar)
// follows the site's primary color instead of APlayer's stock
// blue, in whichever of light/dark the reader is using.
const playerTheme = () => {
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim();
    return value || '#b23a1f';
  } catch {
    return '#b23a1f';
  }
};

// A labelled random-playback toggle above the player. APlayer
// ships its own order icon in the control bar, but it is a small
// unlabelled glyph most readers never find, so the same setting
// gets a text button here. The button defers to the built-in icon
// when it exists (that handler flips the order and swaps its own
// glyph), and the label re-reads player.options.order after every
// change, whichever control was used.
export const attachOrderToggle = (wrapper, player) => {
  if (!wrapper || !player || !player.options) return null;
  const bar = document.createElement('div');
  bar.className = 'music-controls';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'music-order-toggle';
  const sync = () => {
    const random = player.options.order === 'random';
    button.textContent = random ? 'ランダム再生：オン' : 'ランダム再生：オフ';
    button.setAttribute('aria-pressed', random ? 'true' : 'false');
    button.classList.toggle('is-random', random);
  };
  const icon = wrapper.querySelector('.aplayer-icon-order');
  button.addEventListener('click', () => {
    if (icon) {
      icon.click();
    } else {
      player.options.order = player.options.order === 'random' ? 'list' : 'random';
    }
    sync();
  });
  if (icon) icon.addEventListener('click', () => { setTimeout(sync, 0); });
  bar.appendChild(button);
  wrapper.insertBefore(bar, wrapper.firstChild);
  sync();
  return button;
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
  const APlayer = await loadAPlayer();
  if (!APlayer || !container.isConnected) return;
  currentPlayer = new APlayer({
    container,
    theme: playerTheme(),
    listFolded: false,
    order: 'list',
    customAudioType: { gas: gasAudioType },
    audio: tracks.map((track) => ({
      name: track.title,
      artist: '藤原史和',
      url: musicTrackApiUrl(track.file),
      type: 'gas'
    }))
  });
  if (tracks.length > 1) attachOrderToggle(container, currentPlayer);
};
