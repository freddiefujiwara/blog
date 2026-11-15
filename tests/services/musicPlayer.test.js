import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  destroyMusicPlayer,
  endedPlan,
  formatTime,
  mountMusicPlayer,
  musicFeedUrl,
  parsePodcastFeed,
  resetMusicFeedCache,
  stepIndex
} from '../../src/services/musicPlayer';

describe('musicFeedUrl', () => {
  const endpoint = 'https://script.google.com/macros/s/XXXX/exec';

  it('builds the podcast feed URL on the same endpoint', () => {
    expect(musicFeedUrl(endpoint)).toBe(`${endpoint}?o=rss`);
  });

  it('is empty for an explicitly empty endpoint', () => {
    expect(musicFeedUrl('')).toBe('');
  });
});

describe('parsePodcastFeed', () => {
  it('maps each item guid to its enclosure URL', () => {
    const xml = '<rss version="2.0"><channel>'
      + '<item><title>A</title><guid isPermaLink="false">a-song.mp3</guid>'
      + '<enclosure url="https://archive.org/download/x/a-song.mp3" length="10" type="audio/mpeg"/></item>'
      + '<item><title>B</title><guid isPermaLink="false">b-song.mp3</guid>'
      + '<enclosure url="https://archive.org/download/y/b-song.mp3" length="20" type="audio/mpeg"/></item>'
      + '</channel></rss>';
    expect(parsePodcastFeed(xml)).toEqual({
      'a-song.mp3': 'https://archive.org/download/x/a-song.mp3',
      'b-song.mp3': 'https://archive.org/download/y/b-song.mp3'
    });
  });

  it('skips items without an enclosure or a plain mp3 guid', () => {
    const xml = '<rss version="2.0"><channel>'
      + '<item><guid isPermaLink="false">no-enc.mp3</guid></item>'
      + '<item><guid isPermaLink="false">https://example.com/page</guid>'
      + '<enclosure url="https://archive.org/download/z/z.mp3" length="1" type="audio/mpeg"/></item>'
      + '</channel></rss>';
    expect(parsePodcastFeed(xml)).toEqual({});
  });

  it('reads unusable input as an empty map', () => {
    expect(parsePodcastFeed('')).toEqual({});
    expect(parsePodcastFeed(null)).toEqual({});
    expect(parsePodcastFeed('<html>not a feed</html>')).toEqual({});
  });
});

describe('formatTime', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });

  it('reads unusable values as 0:00', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(undefined)).toBe('0:00');
  });
});

describe('stepIndex', () => {
  it('steps within the list and wraps at both ends', () => {
    expect(stepIndex(0, 3, 1)).toBe(1);
    expect(stepIndex(2, 3, 1)).toBe(0);
    expect(stepIndex(0, 3, -1)).toBe(2);
    expect(stepIndex(0, 0, 1)).toBe(0);
  });
});

describe('endedPlan', () => {
  const base = { index: 0, count: 3, repeat: 'none', random: false, played: new Set([0]) };

  it('replays the same track for repeat one, whatever the mode', () => {
    expect(endedPlan({ ...base, repeat: 'one' })).toEqual({ type: 'replay' });
    expect(endedPlan({ ...base, repeat: 'one', random: true })).toEqual({ type: 'replay' });
  });

  it('advances in list order and stops at the end without repeat', () => {
    expect(endedPlan(base)).toEqual({ type: 'advance', candidates: [1] });
    expect(endedPlan({ ...base, index: 2, played: new Set([2]) })).toEqual({ type: 'stop' });
  });

  it('wraps to the first track at the end with repeat all', () => {
    expect(endedPlan({ ...base, index: 2, repeat: 'all', played: new Set([2]) }))
      .toEqual({ type: 'advance', candidates: [0] });
  });

  it('offers only unplayed tracks in random mode', () => {
    expect(endedPlan({ ...base, random: true, played: new Set([0, 2]) }))
      .toEqual({ type: 'advance', candidates: [1] });
  });

  it('stops a random round once every track has played (no repeat)', () => {
    expect(endedPlan({ ...base, index: 1, random: true, played: new Set([0, 1, 2]) }))
      .toEqual({ type: 'stop' });
  });

  it('starts a fresh random round with repeat all', () => {
    const plan = endedPlan({ ...base, index: 1, random: true, repeat: 'all', played: new Set([0, 1, 2]) });
    expect(plan.type).toBe('advance');
    expect(plan.resetPlayed).toBe(true);
    expect(plan.candidates).toEqual([0, 2]);
  });

  it('keeps a single-track playlist going with repeat all in random mode', () => {
    const plan = endedPlan({ index: 0, count: 1, repeat: 'all', random: true, played: new Set([0]) });
    expect(plan).toEqual({ type: 'advance', candidates: [0], resetPlayed: true });
  });

  it('stops for an empty playlist', () => {
    expect(endedPlan({ index: 0, count: 0, repeat: 'all', random: false, played: new Set() }))
      .toEqual({ type: 'stop' });
  });
});

// Builds a podcast feed carrying the given files, with the same
// shape music-gas publishes: guid = file name, enclosure = the
// track's archive URL.
const feedXmlFor = (files) => '<?xml version="1.0" encoding="UTF-8"?>'
  + '<rss version="2.0"><channel><title>川口の歌</title>'
  + files.map((file) => '<item><title>' + file + '</title>'
    + '<guid isPermaLink="false">' + file + '</guid>'
    + '<enclosure url="https://archive.org/download/freddiefujiwara-'
    + file.replace(/\.mp3$/, '') + '/' + file
    + '" length="100" type="audio/mpeg"/></item>').join('')
  + '</channel></rss>';

const archiveUrlFor = (file) => 'https://archive.org/download/freddiefujiwara-'
  + file.replace(/\.mp3$/, '') + '/' + file;

// The feed the mount tests share by default: every file a mount
// test uses, except feed-c.mp3, which must stay out of the feed
// for the not-carried test.
const UNIVERSAL_FEED_XML = feedXmlFor([
  'dom-a.mp3', 'dom-b.mp3', 'tap-a.mp3', 'tap-b.mp3', 'cycle-a.mp3',
  'rnd-a.mp3', 'adv-a.mp3', 'adv-b.mp3', 'stop-a.mp3', 'stop-b.mp3',
  'one-a.mp3', 'one-b.mp3', 'wrap-a.mp3', 'wrap-b.mp3',
  'rstop-a.mp3', 'rstop-b.mp3', 'warm-a.mp3', 'warm-b.mp3', 'warm-c.mp3',
  'bg-a.mp3', 'bg-b.mp3', 'bg-c.mp3', 'feed-a.mp3', 'feed-b.mp3',
  'kpi-a.mp3', 'kpi-b.mp3', 'rdy-a.mp3', 'rdy-b.mp3',
  'lat-a.mp3', 'lat-b.mp3', 'fix-a.mp3', 'fix-b.mp3', 'bye-a.mp3'
]);

describe('mountMusicPlayer', () => {
  let playSpy;
  let pauseSpy;

  const flush = async () => {
    for (let i = 0; i < 6; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => { setTimeout(resolve, 0); });
    }
  };

  const mountWith = async (tracksHtml) => {
    document.body.innerHTML = `<div id="root">${tracksHtml}</div>`;
    await mountMusicPlayer(document.getElementById('root'));
    return document.querySelector('.music-player');
  };

  beforeEach(() => {
    vi.unstubAllGlobals();
    resetMusicFeedCache();
    document.body.innerHTML = '';
    playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve());
    pauseSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {});
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    // The player may only ever read the podcast feed; any other
    // request (such as the retired per-track bridge) fails here.
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('o=rss')) {
        return { ok: true, text: async () => UNIVERSAL_FEED_XML };
      }
      throw new Error(`unexpected fetch: ${url}`);
    }));
  });

  it('builds the labelled controls and the track list', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="dom-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="dom-b.mp3"></div>'
    );
    expect(document.querySelectorAll('.music-track')).toHaveLength(0);
    expect(player.querySelector('.mp-now').textContent).toBe('曲1');
    expect(player.querySelector('.mp-play svg path').getAttribute('d')).toBe('M8 5v14l11-7z');
    expect(player.querySelector('.mp-play').getAttribute('aria-label')).toBe('再生');
    expect(player.querySelector('.mp-prev svg')).not.toBeNull();
    expect(player.querySelector('.mp-prev').getAttribute('aria-label')).toBe('前へ');
    expect(player.querySelector('.mp-next svg')).not.toBeNull();
    expect(player.querySelector('.mp-next').getAttribute('aria-label')).toBe('次へ');
    expect(player.querySelector('.mp-repeat').getAttribute('aria-label')).toBe('リピート：なし');
    expect(player.querySelector('.mp-repeat svg')).not.toBeNull();
    expect(player.querySelector('.mp-random').getAttribute('aria-label')).toBe('ランダム：オフ');
    expect(player.querySelector('.mp-random svg')).not.toBeNull();
    const items = [...player.querySelectorAll('.mp-track .mp-track-title')];
    expect(items.map((n) => n.textContent)).toEqual(['曲1', '曲2']);
    destroyMusicPlayer();
  });

  it('leaves articles without placeholders untouched', async () => {
    document.body.innerHTML = '<div id="root"><p>本文だけ</p></div>';
    await mountMusicPlayer(document.getElementById('root'));
    expect(document.querySelector('.music-player')).toBeNull();
  });

  it('plays a track when its list entry is tapped', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="tap-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="tap-b.mp3"></div>'
    );
    player.querySelectorAll('.mp-track')[1].click();
    await flush();
    const audio = player.querySelector('audio');
    expect(audio.getAttribute('src')).toBe(archiveUrlFor('tap-b.mp3'));
    expect(playSpy).toHaveBeenCalled();
    expect(player.querySelector('.mp-now').textContent).toBe('曲2');
    expect(player.querySelectorAll('.mp-track')[1].classList.contains('is-active')).toBe(true);
    destroyMusicPlayer();
  });

  it('cycles the repeat state なし → 全曲 → 1曲 → なし', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="cycle-a.mp3"></div>'
    );
    const button = player.querySelector('.mp-repeat');
    const badge = button.querySelector('.mp-badge');
    button.click();
    expect(button.getAttribute('aria-label')).toBe('リピート：全曲');
    expect(button.classList.contains('is-on')).toBe(true);
    expect(badge.hidden).toBe(true);
    button.click();
    expect(button.getAttribute('aria-label')).toBe('リピート：1曲');
    expect(badge.hidden).toBe(false);
    button.click();
    expect(button.getAttribute('aria-label')).toBe('リピート：なし');
    expect(button.classList.contains('is-on')).toBe(false);
    expect(badge.hidden).toBe(true);
    destroyMusicPlayer();
  });

  it('toggles the random state and aria-pressed', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="rnd-a.mp3"></div>'
    );
    const button = player.querySelector('.mp-random');
    button.click();
    expect(button.getAttribute('aria-label')).toBe('ランダム：オン');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList.contains('is-on')).toBe(true);
    button.click();
    expect(button.getAttribute('aria-label')).toBe('ランダム：オフ');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.classList.contains('is-on')).toBe(false);
    destroyMusicPlayer();
  });

  it('advances to the next track when a track ends in list order', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="adv-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="adv-b.mp3"></div>'
    );
    player.querySelectorAll('.mp-track')[0].click();
    await flush();
    expect(playSpy).toHaveBeenCalledTimes(1);
    player.querySelector('audio').dispatchEvent(new Event('ended'));
    await flush();
    expect(player.querySelector('.mp-now').textContent).toBe('曲2');
    expect(playSpy).toHaveBeenCalledTimes(2);
    destroyMusicPlayer();
  });

  it('stops after the last track without repeat', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="stop-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="stop-b.mp3"></div>'
    );
    player.querySelectorAll('.mp-track')[1].click();
    await flush();
    expect(playSpy).toHaveBeenCalledTimes(1);
    player.querySelector('audio').dispatchEvent(new Event('ended'));
    await flush();
    expect(player.querySelector('.mp-now').textContent).toBe('曲2');
    expect(playSpy).toHaveBeenCalledTimes(1);
    destroyMusicPlayer();
  });

  it('replays the same track on ended with repeat one', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="one-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="one-b.mp3"></div>'
    );
    player.querySelector('.mp-repeat').click();
    player.querySelector('.mp-repeat').click();
    player.querySelectorAll('.mp-track')[0].click();
    await flush();
    expect(playSpy).toHaveBeenCalledTimes(1);
    player.querySelector('audio').dispatchEvent(new Event('ended'));
    await flush();
    expect(player.querySelector('.mp-now').textContent).toBe('曲1');
    expect(playSpy).toHaveBeenCalledTimes(2);
    destroyMusicPlayer();
  });

  it('wraps to the first track on ended with repeat all', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="wrap-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="wrap-b.mp3"></div>'
    );
    player.querySelector('.mp-repeat').click();
    player.querySelectorAll('.mp-track')[1].click();
    await flush();
    player.querySelector('audio').dispatchEvent(new Event('ended'));
    await flush();
    expect(player.querySelector('.mp-now').textContent).toBe('曲1');
    destroyMusicPlayer();
  });

  it('plays every track once in random mode, then stops without repeat', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="rstop-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="rstop-b.mp3"></div>'
    );
    player.querySelector('.mp-random').click();
    player.querySelectorAll('.mp-track')[0].click();
    await flush();
    const audio = player.querySelector('audio');
    audio.dispatchEvent(new Event('ended'));
    await flush();
    expect(player.querySelector('.mp-now').textContent).toBe('曲2');
    const playsAfterAdvance = playSpy.mock.calls.length;
    audio.dispatchEvent(new Event('ended'));
    await flush();
    expect(playSpy.mock.calls.length).toBe(playsAfterAdvance);
    destroyMusicPlayer();
  });

  it('reads only the podcast feed at mount and warms the first track from it', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('o=rss')) {
        return { ok: true, text: async () => UNIVERSAL_FEED_XML };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="warm-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="warm-b.mp3"></div>'
      + '<div class="music-track" data-title="曲3" data-file="warm-c.mp3"></div>'
    );
    await flush();
    const requested = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requested).toHaveLength(1);
    expect(requested[0]).toContain('o=rss');
    // The warmed first track is attached straight from the feed.
    expect(player.querySelector('audio').getAttribute('src'))
      .toBe(archiveUrlFor('warm-a.mp3'));
    destroyMusicPlayer();
  });

  it('never requests per-track bytes, even once playback starts', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('o=rss')) {
        return { ok: true, text: async () => UNIVERSAL_FEED_XML };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="bg-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="bg-b.mp3"></div>'
      + '<div class="music-track" data-title="曲3" data-file="bg-c.mp3"></div>'
    );
    await flush();
    player.querySelector('audio').dispatchEvent(new Event('play'));
    player.querySelectorAll('.mp-track')[2].click();
    await flush();
    const requested = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requested.every((url) => url.includes('o=rss'))).toBe(true);
    expect(player.querySelector('audio').getAttribute('src'))
      .toBe(archiveUrlFor('bg-c.mp3'));
    destroyMusicPlayer();
  });

  // The podcast feed both feed tests below share: feed-a/feed-b
  // resolve from it, feed-c never appears in it.
  const FEED_XML = '<?xml version="1.0" encoding="UTF-8"?>'
    + '<rss version="2.0"><channel><title>川口の歌</title>'
    + '<item><title>曲A</title><guid isPermaLink="false">feed-a.mp3</guid>'
    + '<enclosure url="https://archive.org/download/freddiefujiwara-feed-a/feed-a.mp3" length="100" type="audio/mpeg"/></item>'
    + '<item><title>曲B</title><guid isPermaLink="false">feed-b.mp3</guid>'
    + '<enclosure url="https://archive.org/download/freddiefujiwara-feed-b/feed-b.mp3" length="100" type="audio/mpeg"/></item>'
    + '</channel></rss>';
  const stubFeedFetch = () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('o=rss')) return { ok: true, text: async () => FEED_XML };
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('plays feed tracks from their archive URLs without the track endpoint', async () => {
    const fetchMock = stubFeedFetch();
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="feed-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="feed-b.mp3"></div>'
    );
    await flush();
    const audio = player.querySelector('audio');
    // The warmed first track is attached straight from the feed.
    expect(audio.getAttribute('src'))
      .toBe('https://archive.org/download/freddiefujiwara-feed-a/feed-a.mp3');
    player.querySelectorAll('.mp-track')[1].click();
    await flush();
    expect(audio.getAttribute('src'))
      .toBe('https://archive.org/download/freddiefujiwara-feed-b/feed-b.mp3');
    expect(playSpy).toHaveBeenCalled();
    const requested = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requested.some((url) => url.includes('track='))).toBe(false);
    destroyMusicPlayer();
  });

  it('shows an error for a track the feed does not carry, and does not play it', async () => {
    stubFeedFetch();
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="feed-a.mp3"></div>'
      + '<div class="music-track" data-title="曲3" data-file="feed-c.mp3"></div>'
    );
    await flush();
    player.querySelectorAll('.mp-track')[1].click();
    await flush();
    // There is no second source: the element keeps the warmed
    // first track, nothing plays, and the status explains why.
    expect(playSpy).not.toHaveBeenCalled();
    expect(player.querySelector('audio').getAttribute('src'))
      .toBe('https://archive.org/download/freddiefujiwara-feed-a/feed-a.mp3');
    expect(player.querySelector('.mp-status').textContent)
      .toBe('音源を読み込めませんでした');
    destroyMusicPlayer();
  });

  it('counts play presses as music_play events', async () => {
    window.gtag = vi.fn();
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="kpi-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="kpi-b.mp3"></div>'
    );
    player.querySelectorAll('.mp-track')[1].click();
    await flush();
    expect(window.gtag).toHaveBeenCalledWith('event', 'music_play', { method: 'list' });
    player.querySelector('.mp-play').click();
    expect(window.gtag).toHaveBeenCalledWith('event', 'music_play', { method: 'button' });
    delete window.gtag;
    destroyMusicPlayer();
  });

  it('reports music_ready once the first track is warmed', async () => {
    window.gtag = vi.fn();
    await mountWith(
      '<div class="music-track" data-title="曲1" data-file="rdy-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="rdy-b.mp3"></div>'
    );
    await flush();
    expect(window.gtag).toHaveBeenCalledWith('event', 'music_ready', { ready_ms: expect.any(Number) });
    delete window.gtag;
    destroyMusicPlayer();
  });

  it('reports music_latency from a list tap until playback starts', async () => {
    window.gtag = vi.fn();
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="lat-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="lat-b.mp3"></div>'
    );
    await flush();
    player.querySelectorAll('.mp-track')[1].click();
    await flush();
    const audio = player.querySelector('audio');
    audio.dispatchEvent(new Event('playing'));
    expect(window.gtag).toHaveBeenCalledWith('event', 'music_latency', {
      latency_ms: expect.any(Number),
      method: 'list'
    });
    delete window.gtag;
    destroyMusicPlayer();
  });

  it('attaches the warmed first track so the first press only presses play', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="fix-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="fix-b.mp3"></div>'
    );
    await flush();
    const audio = player.querySelector('audio');
    // No click yet, but the element already holds the first track.
    expect(audio.getAttribute('src')).toBe(archiveUrlFor('fix-a.mp3'));
    // The press must reach play() synchronously (iOS gesture rule):
    // assert before any promise gets a chance to run.
    player.querySelector('.mp-play').click();
    expect(playSpy).toHaveBeenCalled();
    destroyMusicPlayer();
  });

  it('starts a feed track synchronously on tap', async () => {
    stubFeedFetch();
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="feed-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="feed-b.mp3"></div>'
    );
    await flush();
    playSpy.mockClear();
    // One tap on a feed-resolved track: its archive URL is already
    // known, so play() fires within the tap (the iOS gesture rule).
    player.querySelectorAll('.mp-track')[1].click();
    expect(playSpy).toHaveBeenCalled();
    expect(player.querySelector('.mp-now').textContent).toBe('曲2');
    expect(player.querySelector('audio').getAttribute('src'))
      .toBe('https://archive.org/download/freddiefujiwara-feed-b/feed-b.mp3');
    destroyMusicPlayer();
  });

  it('destroy tears the player down', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="bye-a.mp3"></div>'
    );
    player.querySelectorAll('.mp-track')[0].click();
    await flush();
    destroyMusicPlayer();
    expect(pauseSpy).toHaveBeenCalled();
    expect(player.innerHTML).toBe('');
  });
});
