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
      + '<div class="music-track" data-title="鳩ヶ谷から浦和まで" data-drive-id="1VoWmQ8TSoSPzX_b_PNcsQNypUonoyp7w"></div>'
      + '<div class="music-track" data-title="朝5:37 芝川サイクリングロードを走ってみた" data-drive-id="1L0FXTEgf_RXmQmKZ0T6S-DEXE1JWQdyh"></div>';
    expect(extractMusicTracks(html)).toEqual([
      { title: '鳩ヶ谷から浦和まで', driveId: '1VoWmQ8TSoSPzX_b_PNcsQNypUonoyp7w' },
      { title: '朝5:37 芝川サイクリングロードを走ってみた', driveId: '1L0FXTEgf_RXmQmKZ0T6S-DEXE1JWQdyh' }
    ]);
  });

  it('unescapes entities in the title', () => {
    const html = '<div class="music-track" data-title="a&quot;b&amp;c" data-drive-id="x"></div>';
    expect(extractMusicTracks(html)).toEqual([{ title: 'a"b&c', driveId: 'x' }]);
  });

  it('ignores malformed placeholders and empty input', () => {
    expect(extractMusicTracks('<div class="music-track" data-title="曲"></div>')).toEqual([]);
    expect(extractMusicTracks('')).toEqual([]);
    expect(extractMusicTracks(null)).toEqual([]);
  });
});

describe('musicTrackUrl', () => {
  it('builds the Drive direct-download URL', () => {
    expect(musicTrackUrl('1DiuhMvUT4pS06O1bfQuiwWHz-i6goMCQ'))
      .toBe('https://drive.usercontent.google.com/download?id=1DiuhMvUT4pS06O1bfQuiwWHz-i6goMCQ&export=download');
  });

  it('rejects ids outside [A-Za-z0-9_-]', () => {
    expect(musicTrackUrl('a/b')).toBe('');
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
      + '<div class="music-track" data-title="曲1" data-drive-id="abc-DEF_123"></div>'
      + '<div class="music-track" data-title="曲2" data-drive-id="zzz"></div></div>';
    await mountMusicPlayer(document.getElementById('root'));
    expect(FakeAPlayer.instances).toHaveLength(1);
    const { options } = FakeAPlayer.instances[0];
    expect(options.audio).toEqual([
      { name: '曲1', artist: '藤原史和', url: 'https://drive.usercontent.google.com/download?id=abc-DEF_123&export=download' },
      { name: '曲2', artist: '藤原史和', url: 'https://drive.usercontent.google.com/download?id=zzz&export=download' }
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
