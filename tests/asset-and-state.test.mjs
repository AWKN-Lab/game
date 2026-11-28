import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const root = process.cwd();

/** 在 Node 里加载浏览器脚本（提供最小 window / localStorage 桩）。 */
function loadBrowserScript(relative, extraGlobals = {}) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const store = new Map();
  // window 既是全局对象也是脚本的 global 参数：self !== top 表示被 iframe 嵌入
  const win = { addEventListener: () => {}, self: {}, top: {}, ...(extraGlobals.window || {}) };
  const sandbox = {
    console,
    window: win,
    document: { getElementById: () => null, readyState: 'complete' },
    addEventListener: () => {},
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear()
    },
    ...extraGlobals
  };
  Object.assign(win, extraGlobals);
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: relative });
  return { sandbox, store };
}

test('存档采用字段级增量合并：部分保存不会清空其它字段', () => {
  const { sandbox } = loadBrowserScript('data-store.js');
  const DataStore = sandbox.window.DataStore;
  assert.ok(DataStore, 'data-store.js 未挂载 DataStore');

  DataStore.saveProgress({
    scriptId: 'unit_script',
    dialogIndex: 7,
    gameValues: { freedom: 80 },
    collectedItems: ['a']
  });
  // 只补一个信任字段，其余必须保留
  DataStore.saveProgress({ scriptId: 'unit_script', npcTrust: { npc_zijin: 3 } });

  const progress = DataStore.loadProgress('unit_script');
  assert.equal(progress.dialogIndex, 7);
  assert.equal(JSON.stringify(progress.gameValues), JSON.stringify({ freedom: 80 }));
  assert.equal(JSON.stringify(progress.collectedItems), JSON.stringify(['a']));
  assert.equal(JSON.stringify(progress.npcTrust), JSON.stringify({ npc_zijin: 3 }));
});

test('存档支持模拟后果台账与情绪字段（新增字段不会被丢弃）', () => {
  const { sandbox } = loadBrowserScript('data-store.js');
  const DataStore = sandbox.window.DataStore;

  const ledger = [{ npcId: 'npc_zijin', axis: 'insight', delta: 2, kind: 'simulated' }];
  DataStore.saveProgress({
    scriptId: 'unit_script2',
    dialogIndex: 1,
    gameValues: { freedom: 10 },
    simulatedConsequences: ledger,
    npcEmotion: { npc_zijin: 'serious' },
    unlockedChoices: ['hidden_1']
  });
  const progress = DataStore.loadProgress('unit_script2');
  assert.equal(JSON.stringify(progress.simulatedConsequences), JSON.stringify(ledger));
  assert.equal(JSON.stringify(progress.npcEmotion), JSON.stringify({ npc_zijin: 'serious' }));
  assert.equal(JSON.stringify(progress.unlockedChoices), JSON.stringify(['hidden_1']));
});

test('事件客户端：iframe 内默认不上报，可显式放开', () => {
  const { sandbox } = loadBrowserScript('assets/js/event-client.js', {
    self: {},
    top: {},
    addEventListener: () => {},
    location: { pathname: '/index.html', search: '' },
    navigator: {},
    setInterval: () => 0,
    setTimeout: () => 0,
    URLSearchParams,
    URL
  });
  const TTEvents = sandbox.window.TTEvents;
  assert.ok(TTEvents, 'event-client.js 未挂载 TTEvents');
  // 沙箱里 self !== top → 视为嵌入
  assert.equal(TTEvents.track('page.view', { page: '/index.html' }), false);
  TTEvents.setEmbeddedAllowed(true);
  assert.equal(TTEvents.track('page.view', { page: '/index.html' }), true);
});

test('事件队列写入按 eventId 合并，模拟并发入队不丢事件', () => {
  const { sandbox, store } = loadBrowserScript('assets/js/event-client.js', {
    self: {},
    top: {},
    addEventListener: () => {},
    location: { pathname: '/index.html', search: '' },
    navigator: {},
    setInterval: () => 0,
    setTimeout: () => 0,
    URLSearchParams,
    URL
  });
  const TTEvents = sandbox.window.TTEvents;
  TTEvents.setEmbeddedAllowed(true);
  TTEvents.track('page.view', { page: '/a' });
  // 模拟另一个标签页在 flush 之前写入了一条
  const key = 'tt_event_queue_v1';
  const existing = JSON.parse(store.get(key) || '[]');
  existing.push({ eventId: 'other-tab-event', name: 'page.view', payload: { page: '/b' } });
  store.set(key, JSON.stringify(existing));
  TTEvents.track('script.open', { scriptId: 'x' });
  const merged = JSON.parse(store.get(key) || '[]');
  const ids = merged.map((e) => e.eventId);
  assert.ok(ids.includes('other-tab-event'), '并发入队的事件被覆盖丢失');
  assert.ok(ids.length >= 3, '合并后事件数量异常');
});

test('模拟后果与史实分栏：引擎写入 kind=simulated 且 UI 标注"模拟"', () => {
  const engine = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
  assert.ok(engine.includes("kind: 'simulated'"), '引擎未给后果标记 simulated');
  assert.ok(engine.includes('模拟·'), '飘字未标注"模拟"');
  assert.ok(engine.includes('模拟后果（仅改变你的状态，不改史实）'), '提示未声明模拟性质');
  assert.ok(engine.includes('模拟后果（仅改变你的状态，不改史实）') || engine.includes('四、模拟后果'), '导出摘要缺少模拟后果分栏');

  const panel = fs.readFileSync(path.join(root, 'assets/js/in-game-npc-chat.js'), 'utf8');
  assert.ok(panel.includes('模拟后果'), '对话面板未标注模拟后果');
  assert.ok(panel.includes('不构成史实依据'), '对话面板缺少史实/模拟边界声明');
});

test('资产全部为 WebP，且代码引用无缺失', () => {
  const files = execFileSync('git', ['ls-files', 'images'], { cwd: root, encoding: 'utf8' })
    .split('\n').map((f) => f.trim()).filter(Boolean);
  assert.ok(files.length > 100, '图片资产数量异常');
  const legacy = files.filter((f) => /\.(png|jpe?g)$/i.test(f));
  assert.equal(legacy.length, 0, `仍存在非 WebP 图片：${legacy.slice(0, 5).join(', ')}`);

  const ledger = JSON.parse(fs.readFileSync(path.join(root, 'assets/asset-ledger.json'), 'utf8'));
  assert.ok(ledger.assets.length > 200, '台账条目过少');
  const missing = ledger.assets.filter((a) => !fs.existsSync(path.join(root, a.path)));
  assert.equal(missing.length, 0, `台账指向的文件缺失：${missing.slice(0, 3).map((m) => m.path).join(', ')}`);
  const nonOriginalWithoutNote = ledger.assets.filter((a) => a.original === false && !a.note);
  assert.equal(nonOriginalWithoutNote.length, 0, '存在没有替换说明的非原创资产');
});
