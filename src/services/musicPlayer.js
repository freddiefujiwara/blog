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

export const fetchTrackBlob = (file) => {
  if (blobCache.has(file)) return blobCache.get(file);
  const promise = (async () => {
    const url = musicTrackApiUrl(file);
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
let latestActivation = 0;
const liveObjectUrls = new Set();

export const gasAudioType = (audioElement, audio, player) => {
  const activation = ++latestActivation;
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
    theme: '#4a90d9',
    listFolded: false,
    customAudioType: { gas: gasAudioType },
    audio: tracks.map((track) => ({
      name: track.title,
      artist: '藤原史和',
      url: musicTrackApiUrl(track.file),
      type: 'gas'
    }))
  });
};
