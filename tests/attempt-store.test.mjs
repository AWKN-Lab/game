// W04 切片2 存档层回归：attempt 字段增量合并、显式重置、D2 锁守卫、旧档兼容
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

function foreignLock(ds, scriptId) {
  ds.localStorage.setItem('st_lock_' + scriptId, JSON.stringify({ tabId: 'tab_other', ts: Date.now() }));
}

test('W04-S1 传入 attempt 字段正常落盘', () => {
  const ds = makeDataStore();
  ds.DataStore.saveProgress({
    scriptId: 's1', dialogIndex: 5,
    attemptId: 'att-abc', attemptState: 'ACTIVE', contentVersion: '2',
    answeredQuestions: ['q1', 'q2'], quizState: { score: 1 }, emittedStages: ['script.start'],
  });
  const p = ds.DataStore.loadProgress('s1');
  assert.strictEqual(p.attemptId, 'att-abc');
  assert.strictEqual(p.attemptState, 'ACTIVE');
  assert.strictEqual(p.contentVersion, '2');
  assert.deepStrictEqual(p.answeredQuestions, ['q1', 'q2']);
  assert.deepStrictEqual(p.quizState, { score: 1 });
  assert.deepStrictEqual(p.emittedStages, ['script.start']);
});

test('W04-S2 部分更新（updateValue 型）不丢 attempt 字段', () => {
  const ds = makeDataStore();
  ds.DataStore.saveProgress({
    scriptId: 's2', dialogIndex: 3,
    attemptId: 'att-keep', attemptState: 'STORY_COMPLETE', contentVersion: '1',
    answeredQuestions: ['q1'], quizState: { idx: 0 }, emittedStages: ['script.start', 'script.storyComplete'],
  });
  // 模拟 updateValue：只传 dialogIndex/gameValues/collectedItems/currentAct
  ds.DataStore.saveProgress({ scriptId: 's2', dialogIndex: 4, gameValues: { 证据: 10 }, collectedItems: ['e1'], currentAct: '' });
  const p = ds.DataStore.loadProgress('s2');
  assert.strictEqual(p.dialogIndex, 4);
  assert.strictEqual(p.attemptId, 'att-keep', '未传 attemptId 须沿用旧值');
  assert.strictEqual(p.attemptState, 'STORY_COMPLETE');
  assert.strictEqual(p.contentVersion, '1');
  assert.deepStrictEqual(p.answeredQuestions, ['q1']);
  assert.deepStrictEqual(p.emittedStages, ['script.start', 'script.storyComplete']);
});

test('W04-S3 旧存档（无 attempt 字段）部分更新后字段为安全默认值', () => {
  const ds = makeDataStore();
  ds.DataStore.saveProgress({ scriptId: 's3', dialogIndex: 9, gameValues: { x: 1 }, collectedItems: [], currentAct: '' });
  ds.DataStore.saveProgress({ scriptId: 's3', dialogIndex: 10, gameValues: { x: 2 }, collectedItems: [], currentAct: '' });
  const p = ds.DataStore.loadProgress('s3');
  assert.strictEqual(p.attemptId, null);
  assert.strictEqual(p.attemptState, null);
  assert.deepStrictEqual(p.answeredQuestions, []);
  assert.deepStrictEqual(p.emittedStages, []);
});

test('W04-S4 显式传 null 视为清除该字段', () => {
  const ds = makeDataStore();
  ds.DataStore.saveProgress({ scriptId: 's4', dialogIndex: 1, attemptId: 'att-x', attemptState: 'ACTIVE' });
  ds.DataStore.saveProgress({ scriptId: 's4', dialogIndex: 2, attemptState: null });
  const p = ds.DataStore.loadProgress('s4');
  assert.strictEqual(p.attemptState, null, '显式 null 须生效，不得被旧值顶回');
  assert.strictEqual(p.attemptId, 'att-x', '未传字段仍沿用');
});

test('W04-S5 resetAttempt 清空 attempt 字段、保留游戏进度本体', () => {
  const ds = makeDataStore();
  ds.DataStore.saveProgress({
    scriptId: 's5', dialogIndex: 12, gameValues: { 信任: 30 }, collectedItems: ['c1'],
    npcFate: { npc_a: 'alive' },
    attemptId: 'att-old', attemptState: 'QUIZ_COMPLETE', contentVersion: '3',
    answeredQuestions: ['q1', 'q2', 'q3'], quizState: { score: 3 }, emittedStages: ['script.start', 'script.storyComplete', 'script.quizComplete'],
  });
  const ok = ds.DataStore.resetAttempt('s5');
  assert.strictEqual(ok, true);
  const p = ds.DataStore.loadProgress('s5');
  assert.strictEqual(p.attemptId, null);
  assert.strictEqual(p.attemptState, null);
  assert.strictEqual(p.contentVersion, null);
  assert.deepStrictEqual(p.answeredQuestions, []);
  assert.strictEqual(p.quizState, null);
  assert.deepStrictEqual(p.emittedStages, []);
  // 进度本体不触碰
  assert.strictEqual(p.dialogIndex, 12);
  assert.deepStrictEqual(p.gameValues, { 信任: 30 });
  assert.deepStrictEqual(p.collectedItems, ['c1']);
  assert.deepStrictEqual(p.npcFate, { npc_a: 'alive' });
});

test('W04-S6 resetAttempt 受 D2 写锁守卫：他签新鲜锁时拒绝且不清字段', () => {
  const ds = makeDataStore();
  ds.DataStore.saveProgress({ scriptId: 's6', dialogIndex: 7, attemptId: 'att-live', attemptState: 'ACTIVE' });
  foreignLock(ds, 's6');
  let blocked = 0;
  ds.DataStore.onSaveBlocked = () => { blocked++; };
  const ok = ds.DataStore.resetAttempt('s6');
  assert.strictEqual(ok, false);
  assert.strictEqual(blocked, 1);
  assert.strictEqual(ds.DataStore.loadProgress('s6').attemptId, 'att-live', '他签持锁期间不得静默重置');
});

test('W04-S7 resetAttempt 对无存档剧本安全（首次重开）', () => {
  const ds = makeDataStore();
  const ok = ds.DataStore.resetAttempt('s7');
  assert.strictEqual(ok, true);
  const p = ds.DataStore.loadProgress('s7');
  assert.strictEqual(p.scriptId, 's7');
  assert.strictEqual(p.attemptId, null);
  assert.deepStrictEqual(p.answeredQuestions, []);
});
