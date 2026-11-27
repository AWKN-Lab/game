import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

function makeDocument() {
  const appended = [];
  const el = (tag) => ({
    tagName: tag, id: '', textContent: '', style: { cssText: '' },
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = value; },
    parentNode: { removeChild() {} }
  });
  return {
    _appended: appended,
    readyState: 'complete',
    documentElement: { classList: { add() {}, remove() {}, contains: () => false } },
    head: { appendChild: (node) => appended.push(['head', node]) },
    body: { appendChild: (node) => { appended.push(['body', node]); node.parentNode = 'body'; } },
    getElementById: (id) => appended.find(([, n]) => n.id === id) || null,
    createElement: (tag) => el(tag),
    querySelectorAll: () => []
  };
}

function loadLightMode({ connection = { effectiveType: '4g' }, mode = null, audio = {} } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  };
  if (mode) localStorage.setItem('st_light_mode', mode);
  const document = makeDocument();
  const navigator = { connection };
  const sandbox = { ...audio, localStorage };
  const source = fs.readFileSync(path.join(root, 'assets/js/light-mode.js'), 'utf8');
  new Function('window', 'location', 'localStorage', 'document', 'navigator', 'setTimeout', source)(
    sandbox, { protocol: 'https:', hostname: 'example.com' }, localStorage, document, navigator, () => {}
  );
  return { sandbox, document, localStorage };
}

test('轻量模式：auto 判定拦截 BGM 时展示一次性提示并记录待恢复曲目', () => {
  let played = [];
  const { sandbox, document } = loadLightMode({
    connection: { saveData: true },
    audio: { AudioManager: { playBGM: (src) => played.push(src) } }
  });
  assert.equal(sandbox.LightMode.enabled(), true);
  sandbox.AudioManager.playBGM('audio/bgm/act1.mp3');
  sandbox.AudioManager.playBGM('audio/bgm/act2.mp3');
  assert.deepEqual(played, []); // 两次都被拦截
  const toasts = document._appended.filter(([, n]) => n.id === 'tt-light-toast');
  assert.equal(toasts.length, 1); // 提示只出现一次
  assert.match(toasts[0][1].textContent, /自动静音背景音乐/);
});

test('轻量模式：手动开启不弹自动提示', () => {
  const loaded = loadLightMode({
    mode: 'on',
    audio: { AudioManager: { playBGM: () => {} } }
  });
  loaded.sandbox.AudioManager.playBGM('audio/bgm/act1.mp3');
  assert.equal(loaded.document._appended.filter(([, n]) => n.id === 'tt-light-toast').length, 0);
});

test('轻量模式：关闭后自动恢复最近被拦截的 BGM', () => {
  let played = [];
  const { sandbox } = loadLightMode({
    connection: { saveData: true },
    audio: { AudioManager: { playBGM: (src) => played.push(src) } }
  });
  sandbox.AudioManager.playBGM('audio/bgm/act1.mp3');
  sandbox.AudioManager.playBGM('audio/bgm/act2.mp3');
  assert.deepEqual(played, []);
  sandbox.LightMode.set('off');
  assert.deepEqual(played, ['audio/bgm/act2.mp3']); // 恢复最近一首
  sandbox.AudioManager.playBGM('audio/bgm/act3.mp3');
  assert.deepEqual(played, ['audio/bgm/act2.mp3', 'audio/bgm/act3.mp3']); // 关闭后直通
});

test('轻量模式：关闭网络省流判定时不误弹提示', () => {
  const { sandbox, document } = loadLightMode({
    connection: { effectiveType: '4g' },
    audio: { AudioManager: { playBGM: () => {} } }
  });
  assert.equal(sandbox.LightMode.enabled(), false);
  sandbox.AudioManager.playBGM('audio/bgm/act1.mp3');
  assert.equal(document._appended.filter(([, n]) => n.id === 'tt-light-toast').length, 0);
});
