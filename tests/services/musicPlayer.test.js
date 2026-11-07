import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decodeBase64ToBlob,
  destroyMusicPlayer,
  extractMusicTracks,
  fetchTrackBlob,
  gasAudioType,
  mountMusicPlayer,
  musicTrackApiUrl
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

  it('is empty while the endpoint is not configured', () => {
    expect(musicTrackApiUrl('x.mp3', '')).toBe('');
    expect(musicTrackApiUrl('x.mp3')).toBe('');
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
  it('rejects while the endpoint is not configured', async () => {
    // MUSIC_ENDPOINT is empty in the test environment.
    await expect(fetchTrackBlob('anything.mp3')).rejects.toThrow('not configured');
  });
});

describe('gasAudioType', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('notices instead of throwing when the track url carries no file', () => {
    const notice = vi.fn();
    const element = {};
    gasAudioType(element, { url: '' }, { paused: true, notice });
    expect(notice).toHaveBeenCalled();
    expect(element.src).toBeUndefined();
  });
});

describe('mountMusicPlayer', () => {
  class FakeAPlayer {
    static instances = [];

    constructor(options) {
      this.options = options;
      FakeAPlayer.instances.push(this);
    }

    destroy() {
      this.destroyed = true;
    }
  }

  beforeEach(() => {
    FakeAPlayer.instances = [];
    window.APlayer = FakeAPlayer;
    document.body.innerHTML = '';
  });

  it('builds one playlist with the gas audio type', async () => {
    document.body.innerHTML = '<div id="root"><p>導入</p>'
      + '<div class="music-track" data-title="曲1" data-file="abc-DEF_123.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="zzz.mp3"></div></div>';
    await mountMusicPlayer(document.getElementById('root'));
    expect(FakeAPlayer.instances).toHaveLength(1);
    const { options } = FakeAPlayer.instances[0];
    expect(options.customAudioType.gas).toBe(gasAudioType);
    expect(options.audio.map((a) => [a.name, a.artist, a.type])).toEqual([
      ['曲1', '藤原史和', 'gas'],
      ['曲2', '藤原史和', 'gas']
    ]);
    expect(document.querySelectorAll('.music-track')).toHaveLength(0);
    expect(document.querySelector('.music-player')).toBe(options.container);
    destroyMusicPlayer();
    expect(FakeAPlayer.instances[0].destroyed).toBe(true);
  });

  it('leaves articles without placeholders untouched', async () => {
    document.body.innerHTML = '<div id="root"><p>本文だけ</p></div>';
    await mountMusicPlayer(document.getElementById('root'));
    expect(FakeAPlayer.instances).toHaveLength(0);
  });
});
