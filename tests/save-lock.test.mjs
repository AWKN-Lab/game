// D2 存档互斥回归：同剧本跨标签页写锁——他签持锁时拒绝写入（禁止静默覆盖），
// 过期锁可接管，显式 force 接管生效，释放后他签可获取
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert';

const root = new URL('..', import.meta.url).pathname;

function makeStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

function makeDataStore(overrides = {}) {
  const sandbox = {
    console: { warn() {}, log() {} },
    localStorage: makeStore(),
    sessionStorage: makeStore(),
    Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error,
    ...overrides,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = fs.readFileSync(root + 'data-store.js', 'utf8');
  vm.runInContext(src, sandbox, { filename: 'data-store.js' });
  return sandbox;
}

// 模拟另一标签页写入新鲜锁
function foreignLock(ds, scriptId, ageMs = 0) {
  ds.localStorage.setItem('st_lock_' + scriptId, JSON.stringify({ tabId: 'tab_other', ts: Date.now() - ageMs }));
}

test('D2-1 无锁时获取成功，本签保存正常写入', () => {
  const ds = makeDataStore();
  const res = ds.DataStore.acquireScriptLock('script_a');
  assert.strictEqual(res.acquired, true);
  assert.strictEqual(res.takeover, false);
  assert.strictEqual(ds.DataStore.holdsScriptLock('script_a'), true);
  ds.DataStore.saveProgress({ scriptId: 'script_a', dialogIndex: 3 });
  assert.strictEqual(ds.DataStore.loadProgress('script_a').dialogIndex, 3);
});

test('D2-2 他签持新鲜锁：acquire 拒绝，saveProgress 被阻止且不覆盖旧存档', () => {
  const ds = makeDataStore();
  ds.DataStore.saveProgress({ scriptId: 'script_b', dialogIndex: 7 }); // 旧存档（新进度）
  foreignLock(ds, 'script_b'); // 他签抢锁
  const res = ds.DataStore.acquireScriptLock('script_b');
  assert.strictEqual(res.acquired, false);
  assert.strictEqual(res.holderTabId, 'tab_other');
  let blockedEvents = 0;
  ds.DataStore.onSaveBlocked = () => { blockedEvents++; };
  ds.DataStore.saveProgress({ scriptId: 'script_b', dialogIndex: 1 }); // 旧标签后台 flush 旧快照
  assert.strictEqual(ds.DataStore.loadProgress('script_b').dialogIndex, 7, '他签持锁期间不得静默覆盖');
  assert.strictEqual(ds.DataStore._blockedSaves, 1);
  assert.strictEqual(blockedEvents, 1, '阻止事件应回调 onSaveBlocked');
});

test('D2-3 他签锁过期（超 TTL）：可接管，takeover=true，保存恢复', () => {
  const ds = makeDataStore();
  foreignLock(ds, 'script_c', 99999); // 远超 8s TTL
  const res = ds.DataStore.acquireScriptLock('script_c');
  assert.strictEqual(res.acquired, true);
  assert.strictEqual(res.takeover, true);
  ds.DataStore.saveProgress({ scriptId: 'script_c', dialogIndex: 5 });
  assert.strictEqual(ds.DataStore.loadProgress('script_c').dialogIndex, 5);
});

test('D2-4 显式接管 force：无视他签新鲜锁夺锁，保存恢复', () => {
  const ds = makeDataStore();
  foreignLock(ds, 'script_d');
  assert.strictEqual(ds.DataStore.acquireScriptLock('script_d').acquired, false);
  const res = ds.DataStore.acquireScriptLock('script_d', { force: true });
  assert.strictEqual(res.acquired, true);
  assert.strictEqual(res.takeover, true);
  ds.DataStore.saveProgress({ scriptId: 'script_d', dialogIndex: 9 });
  assert.strictEqual(ds.DataStore.loadProgress('script_d').dialogIndex, 9);
});

test('D2-5 释放后他签可获取；非持锁方释放/续期不生效', () => {
  const ds = makeDataStore();
  ds.DataStore.acquireScriptLock('script_e');
  assert.strictEqual(ds.DataStore.refreshScriptLock('script_e'), true);
  ds.DataStore.releaseScriptLock('script_e');
  assert.strictEqual(ds.DataStore.holdsScriptLock('script_e'), false);
  // 模拟他签持锁后，本签续期/释放均不生效
  foreignLock(ds, 'script_e');
  assert.strictEqual(ds.DataStore.refreshScriptLock('script_e'), false);
  ds.DataStore.releaseScriptLock('script_e');
  const lockRaw = JSON.parse(ds.localStorage.getItem('st_lock_script_e'));
  assert.strictEqual(lockRaw.tabId, 'tab_other', '不得释放他签的锁');
});

test('D2-6 自己持锁时保存不受守卫影响（单标签正常流）', () => {
  const ds = makeDataStore();
  ds.DataStore.acquireScriptLock('script_f');
  for (let i = 1; i <= 3; i++) {
    ds.DataStore.saveProgress({ scriptId: 'script_f', dialogIndex: i });
  }
  assert.strictEqual(ds.DataStore.loadProgress('script_f').dialogIndex, 3);
  assert.strictEqual(ds.DataStore._blockedSaves, undefined);
});
