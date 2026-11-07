import { beforeEach, describe, expect, it } from 'vitest';
import {
  destroyMusicPlayer,
  extractMusicTracks,
  mountMusicPlayer,
  musicTrackUrl
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

describe('musicTrackUrl', () => {
  it('builds the blog-local audio URL', () => {
    expect(musicTrackUrl('kawaguchi-no-higashi.mp3'))
      .toBe('/blog/audio/kawaguchi-no-higashi.mp3');
  });

  it('rejects names that are not plain mp3 files', () => {
    expect(musicTrackUrl('a/b.mp3')).toBe('');
    expect(musicTrackUrl('../x.mp3')).toBe('');
    expect(musicTrackUrl('x.wav')).toBe('');
    expect(musicTrackUrl('')).toBe('');
    expect(musicTrackUrl(null)).toBe('');
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

  it('builds one playlist where the first placeholder was', async () => {
    document.body.innerHTML = '<div id="root"><p>導入</p>'
      + '<div class="music-track" data-title="曲1" data-file="abc-DEF_123.mp3"></div>'
      + '<div class="music-track" data-title="曲2" data-file="zzz.mp3"></div></div>';
    await mountMusicPlayer(document.getElementById('root'));
    expect(FakeAPlayer.instances).toHaveLength(1);
    const { options } = FakeAPlayer.instances[0];
    expect(options.audio).toEqual([
      { name: '曲1', artist: '藤原史和', url: '/blog/audio/abc-DEF_123.mp3' },
      { name: '曲2', artist: '藤原史和', url: '/blog/audio/zzz.mp3' }
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
