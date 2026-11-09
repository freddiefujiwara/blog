import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decodeBase64ToBlob,
  destroyMusicPlayer,
  endedPlan,
  extractMusicTracks,
  fetchTrackBlob,
  formatTime,
  mountMusicPlayer,
  musicTrackApiUrl,
  stepIndex
} from '../../src/services/musicPlayer';

describe('extractMusicTracks', () => {
  it('collects placeholders in document order', () => {
    const html = '<p>本文</p>'
      + '<div class="music-track" data-title="鳩ヶ谷から浦和まで" data-file="hatogaya-urawa.mp3"></div>'
      + '<div class="music-track" data-title="朝5:37 芝川サイクリングロードを走ってみた" data-file="shibakawa-cycling-road.mp3"></div>';
    expect(extractMusicTracks(html)).toEqual([
      { title: '鳩ヶ谷から浦和まで', file: 'hatogaya-urawa.mp3' },
      { title: '朝5:37 芝川サイクリングロードを走ってみた', file: 'shibakawa-cycling-road.mp3' }
    ]);
  });

  it('unescapes entities in the title', () => {
    const html = '<div class="music-track" data-title="a&quot;b&amp;c" data-file="x.mp3"></div>';
    expect(extractMusicTracks(html)).toEqual([{ title: 'a"b&c', file: 'x.mp3' }]);
  });

  it('ignores malformed placeholders and empty input', () => {
    expect(extractMusicTracks('<div class="music-track" data-title="曲"></div>')).toEqual([]);
    expect(extractMusicTracks('')).toEqual([]);
    expect(extractMusicTracks(null)).toEqual([]);
  });
});

describe('musicTrackApiUrl', () => {
  const endpoint = 'https://script.google.com/macros/s/XXXX/exec';

  it('builds the music-gas request URL', () => {
    expect(musicTrackApiUrl('kawaguchi-no-higashi.mp3', endpoint))
      .toBe(`${endpoint}?track=kawaguchi-no-higashi.mp3`);
  });

  it('rejects names that are not plain mp3 files', () => {
    expect(musicTrackApiUrl('a/b.mp3', endpoint)).toBe('');
    expect(musicTrackApiUrl('../x.mp3', endpoint)).toBe('');
    expect(musicTrackApiUrl('x.wav', endpoint)).toBe('');
    expect(musicTrackApiUrl('', endpoint)).toBe('');
    expect(musicTrackApiUrl(null, endpoint)).toBe('');
  });

  it('is empty for an explicitly empty endpoint', () => {
    expect(musicTrackApiUrl('x.mp3', '')).toBe('');
  });

  it('builds on the configured default endpoint when none is passed', () => {
    expect(musicTrackApiUrl('x.mp3')).toContain('track=x.mp3');
  });
});

describe('decodeBase64ToBlob', () => {
  it('decodes into a Blob with the given mime type', async () => {
    const blob = decodeBase64ToBlob('AQID', 'audio/mpeg');
    expect(blob.type).toBe('audio/mpeg');
    expect(blob.size).toBe(3);
    const buffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    expect([...new Uint8Array(buffer)]).toEqual([1, 2, 3]);
  });
});

describe('fetchTrackBlob', () => {
  it('rejects for an explicitly empty endpoint', async () => {
    await expect(fetchTrackBlob('anything.mp3', '')).rejects.toThrow('not configured');
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
    document.body.innerHTML = '';
    let urlSeq = 0;
    URL.createObjectURL = vi.fn(() => `blob:fake-${(urlSeq += 1)}`);
    URL.revokeObjectURL = vi.fn();
    playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve());
    pauseSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {});
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ ok: true, data: btoa('mp3'), mime: 'audio/mpeg' })
    })));
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
    expect(audio.getAttribute('src')).toMatch(/^blob:fake-/);
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

  it('warms only the first track at mount so the first press is fast', async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ ok: true, data: btoa('mp3'), mime: 'audio/mpeg' })
    }));
    vi.stubGlobal('fetch', fetchMock);
    await mountWith(
      '<div class="music-track" data-title="曲1" data-file="warm-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="warm-b.mp3"></div>'
      + '<div class="music-track" data-title="曲3" data-file="warm-c.mp3"></div>'
    );
    await flush();
    const requested = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requested.some((url) => url.includes('track=warm-a.mp3'))).toBe(true);
    expect(requested.some((url) => url.includes('track=warm-b.mp3'))).toBe(false);
    expect(requested.some((url) => url.includes('track=warm-c.mp3'))).toBe(false);
    destroyMusicPlayer();
  });

  it('fetches the remaining tracks in the background once playback starts', async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ ok: true, data: btoa('mp3'), mime: 'audio/mpeg' })
    }));
    vi.stubGlobal('fetch', fetchMock);
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="bg-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="bg-b.mp3"></div>'
      + '<div class="music-track" data-title="曲3" data-file="bg-c.mp3"></div>'
    );
    await flush();
    const requested = () => fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requested().some((url) => url.includes('track=bg-b.mp3'))).toBe(false);
    player.querySelector('audio').dispatchEvent(new Event('play'));
    await flush();
    expect(requested().some((url) => url.includes('track=bg-b.mp3'))).toBe(true);
    expect(requested().some((url) => url.includes('track=bg-c.mp3'))).toBe(true);
    destroyMusicPlayer();
  });

  it('serves a tapped track before the background prefetch finishes', async () => {
    const pending = new Map();
    const fetchMock = vi.fn((url) => {
      const file = /track=([^&]+)/.exec(String(url))[1];
      if (file === 'jump-a.mp3') {
        return Promise.resolve({
          json: async () => ({ ok: true, data: btoa('mp3'), mime: 'audio/mpeg' })
        });
      }
      return new Promise((resolve) => { pending.set(file, resolve); });
    });
    vi.stubGlobal('fetch', fetchMock);
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="jump-a.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="jump-b.mp3"></div>'
      + '<div class="music-track" data-title="曲3" data-file="jump-c.mp3"></div>'
    );
    await flush();
    // Playback starts: the background chain begins with track 2 and
    // is still waiting on it.
    player.querySelector('audio').dispatchEvent(new Event('play'));
    await flush();
    expect(pending.has('jump-b.mp3')).toBe(true);
    expect(pending.has('jump-c.mp3')).toBe(false);
    // The reader taps track 3: its fetch starts right away, ahead
    // of the still-pending background fetch.
    player.querySelectorAll('.mp-track')[2].click();
    await flush();
    expect(pending.has('jump-c.mp3')).toBe(true);
    pending.get('jump-c.mp3')({
      json: async () => ({ ok: true, data: btoa('mp3'), mime: 'audio/mpeg' })
    });
    await flush();
    const audio = player.querySelector('audio');
    expect(audio.getAttribute('src')).toMatch(/^blob:fake-/);
    expect(player.querySelector('.mp-now').textContent).toBe('曲3');
    expect(playSpy).toHaveBeenCalled();
    pending.get('jump-b.mp3')({
      json: async () => ({ ok: true, data: btoa('mp3'), mime: 'audio/mpeg' })
    });
    await flush();
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

  it('destroy tears the player down', async () => {
    const player = await mountWith(
      '<div class="music-track" data-title="曲1" data-file="bye-a.mp3"></div>'
    );
    player.querySelectorAll('.mp-track')[0].click();
    await flush();
    destroyMusicPlayer();
    expect(pauseSpy).toHaveBeenCalled();
    expect(player.innerHTML).toBe('');
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
