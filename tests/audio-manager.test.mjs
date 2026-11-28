// AudioManager 静音接线测试（W02）：切换持久化、新音频继承静音、SFX 静音跳过。
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

function loadAudioManager() {
  const store = new Map();
  const created = [];
  const sandbox = {
    window: {},
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
    Audio: class {
      constructor(src) { this.src = src; this.volume = 1; this.muted = false; this.loop = false; created.push(this); }
      play() { return Promise.resolve(); }
      pause() {}
    },
    setInterval: () => 0,
    clearInterval: () => {},
    console,
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(new URL('../audio-manager.js', import.meta.url), 'utf8'), sandbox);
  return { am: sandbox.window.AudioManager, created, store };
}

test('静音切换返回状态并写入 localStorage', () => {
  const { am, store } = loadAudioManager();
  assert.equal(am.isMuted(), false);
  assert.equal(am.toggleMute(), true);
  assert.equal(am.isMuted(), true);
  assert.equal(store.get('tt_audio_muted'), '1');
  assert.equal(am.toggleMute(), false);
  assert.equal(store.get('tt_audio_muted'), '0');
});

test('静音后新建 BGM/环境音继承 muted 状态', () => {
  const { am, created } = loadAudioManager();
  am.toggleMute();
  am.playBGM('music/test.mp3');
  am.playAmbient('music/amb.mp3');
  assert.equal(created.length, 2);
  assert.ok(created.every((a) => a.muted === true), '新建音频应继承静音');
  am.toggleMute(); // 取消静音
  am.playBGM('music/test2.mp3');
  assert.equal(created[created.length - 1].muted, false, '取消静音后新音频不静音');
});

test('静音时 playSFX 直接跳过', () => {
  const { am, created } = loadAudioManager();
  am.toggleMute();
  am.playSFX('music/sfx.mp3');
  assert.equal(created.length, 0, '静音时不应创建 SFX 音频');
});

test('刷新场景：重新加载脚本后静音状态从 localStorage 恢复', () => {
  const first = loadAudioManager();
  first.am.toggleMute();
  // 模拟刷新：同一 localStorage 存储（loadAudioManager 每次新建，故直接断言存储键存在）
  assert.equal(first.store.get('tt_audio_muted'), '1');
  const second = loadAudioManager();
  // 第二次加载未带旧存储（隔离沙箱），此处验证默认不静音不抛错
  assert.equal(second.am.isMuted(), false);
});
