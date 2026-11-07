export const LIST_ENDPOINT =
  import.meta.env.VITE_GAS_ENDPOINT ??
  'https://script.google.com/macros/s/AKfycbydcnw4yt5K8lz8Wf0PCbG6Q9yD3jf1W2lsGucOor2KII7duJr7qevcMiwNHJTe8GZH/exec';
export const RSS_ENDPOINT = `${LIST_ENDPOINT}?o=rss`;
// music-gas (audio for the embedded player). Filled in once the
// music-gas deployments exist; empty means the player cannot load
// audio yet. Staging builds inject VITE_MUSIC_GAS_ENDPOINT.
export const MUSIC_ENDPOINT =
  import.meta.env.VITE_MUSIC_GAS_ENDPOINT ??
  '';
// Placeholder for link-card images that fail to load (the same image
// the possessions list front-end falls back to).
export const LINK_CARD_FALLBACK_IMAGE =
  'https://tshop.r10s.jp/rukusu/cabinet/images/junbi.jpg';
