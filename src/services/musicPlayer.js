// Embedded music player. blog-gas turns a document paragraph of the
// form [[music|タイトル|DriveファイルID]] into a placeholder
//   <div class="music-track" data-title="..." data-drive-id="..."></div>
// in the article HTML. This module collects the placeholders of an
// article (in document order) into a single APlayer playlist whose
// audio files stream straight from Google Drive. APlayer is a
// vendored library under public/vendor and is loaded lazily, only
// for articles that actually carry tracks.

const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const TRACK_PLACEHOLDER_PATTERN =
  /<div class="music-track" data-title="([^"]*)" data-drive-id="([A-Za-z0-9_-]+)"><\/div>/g;

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
    tracks.push({ title: unescapeHtml(match[1]), driveId: match[2] });
  }
  return tracks;
};

// Direct-download URL for a shared Drive file. The id is validated
// again here so a malformed placeholder can never smuggle another
// URL shape into the player.
export const musicTrackUrl = (driveId) => (DRIVE_ID_PATTERN.test(driveId ?? '')
  ? `https://drive.usercontent.google.com/download?id=${driveId}&export=download`
  : '');

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
    .map((el) => ({ title: el.dataset.title || '', driveId: el.dataset.driveId || '' }))
    .filter((track) => DRIVE_ID_PATTERN.test(track.driveId));
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
    audio: tracks.map((track) => ({
      name: track.title,
      artist: '藤原史和',
      url: musicTrackUrl(track.driveId)
    }))
  });
};
