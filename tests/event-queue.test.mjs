// W04 §5.3 队列风险回归：旧快照不覆盖新增记录、坏事件不卡批、sendBeacon 保留原 ID、
// 撤回授权清空待发、4xx 永久拒绝整批丢弃、网络/5xx 退避重试
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert';

const root = new URL('..', import.meta.url).pathname;

function makeSandbox(overrides = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const state = { beaconCalls: [], postedBodies: [] };
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    localStorage,
    Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Promise,
    URLSearchParams,
    crypto: { randomUUID: () => 'id-' + Math.random().toString(16).slice(2) },
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    Blob: class { constructor(parts) { this.parts = parts; } },
    navigator: {
      sendBeacon: (url, blob) => { state.beaconCalls.push({ url, body: blob.parts[0] }); return true; },
    },
    document: { readyState: 'complete', addEventListener() {}, referrer: '' },
    location: { pathname: '/american_revolution.html', search: '' },
    addEventListener() {},
    removeEventListener() {},
    TTIdentity: {
      isTrackingEnabled: () => true,
      getContext: () => ({ anonymousId: 'anon_t', sessionId: 'sess_t', role: 'student' }),
    },
    ...overrides,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = fs.readFileSync(root + 'assets/js/event-client.js', 'utf8');
  vm.runInContext(src, sandbox, { filename: 'event-client.js' });
  sandbox.TTEvents.clearQueue();
  state.sandbox = sandbox;
  state.queue = () => JSON.parse(localStorage.getItem('tt_event_queue_v1') || '[]');
  return state;
}

function makeTTApi(state, impl) {
  return { post: async (path, body) => { state.postedBodies.push(body); return impl(body); } };
}

test('§5.3-1 上报期间新增事件不被旧快照覆盖', async () => {
  const state = makeSandbox();
  state.sandbox.TTEvents.track('script.open', { scriptId: 's1', source: 'test' }); // A
  let resolveFlush;
  state.sandbox.TTApi = makeTTApi(state, () => new Promise((res) => { resolveFlush = res; }));
  const flushPromise = state.sandbox.TTEvents.flush();
  await Promise.resolve();
  state.sandbox.TTEvents.track('script.open', { scriptId: 's2', source: 'test' }); // C 请求期间入队
  const batchA = state.postedBodies[0].events;
  resolveFlush({ success: true, results: batchA.map((e) => ({ eventId: e.eventId, accepted: true })) });
  await flushPromise;
  const queue = state.queue();
  assert.strictEqual(queue.length, 1, '请求期间新增的 C 必须保留');
  assert.strictEqual(queue[0].payload.scriptId, 's2');
});

test('§5.3-2 坏事件不卡批：accepted 与永久拒绝均结算，重复确认也结算', async () => {
  const state = makeSandbox();
  state.sandbox.TTEvents.track('script.open', { scriptId: 'good', source: 'test' });
  state.sandbox.TTEvents.track('script.open', { scriptId: 'bad', source: 'test' });
  state.sandbox.TTEvents.track('script.open', { scriptId: 'dup', source: 'test' });
  state.sandbox.TTApi = makeTTApi(state, (body) => {
    const events = body.events;
    return {
      success: true,
      results: [
        { eventId: events[0].eventId, accepted: true },
        { eventId: events[1].eventId, accepted: false, code: 'EVENT_NOT_ALLOWED' }, // 永久拒绝
        { eventId: events[2].eventId, accepted: false, duplicate: true }, // 重复确认
      ],
    };
  });
  await state.sandbox.TTEvents.flush();
  assert.strictEqual(state.queue().length, 0, '三种结果都已结算，队列清空且不无限重试');
});

test('§5.3-3 sendBeacon 仅排队：保留原 ID 待下次验证上传', async () => {
  const state = makeSandbox();
  state.sandbox.TTEvents.track('script.open', { scriptId: 's1', source: 'test' });
  await state.sandbox.TTEvents.flush({ beacon: true });
  assert.strictEqual(state.beaconCalls.length, 1);
  assert.strictEqual(state.queue().length, 1, 'beacon 不代表送达，原 ID 必须保留');
  // 下一次正常 flush 验证上传后按 eventId 幂等结算
  state.sandbox.TTApi = makeTTApi(state, (body) => ({
    success: true,
    results: body.events.map((e) => ({ eventId: e.eventId, accepted: false, duplicate: true })),
  }));
  await state.sandbox.TTEvents.flush();
  assert.strictEqual(state.queue().length, 0, '服务端按 eventId 去重确认后清除');
});

test('§5.3-4 撤回授权：flush 清空待发记录，不追传', async () => {
  const state = makeSandbox({
    TTIdentity: {
      isTrackingEnabled: () => false,
      getContext: () => ({}),
    },
  });
  // 授权关闭期间 track 拒绝入队
  assert.strictEqual(state.sandbox.TTEvents.track('script.open', { scriptId: 's1' }), false);
  // 模拟撤回前遗留的待发记录
  state.sandbox.localStorage.setItem('tt_event_queue_v1', JSON.stringify([
    { eventId: 'legacy-1', name: 'script.open', payload: {} },
  ]));
  await state.sandbox.TTEvents.flush();
  assert.strictEqual(state.queue().length, 0, '撤回授权后待发记录清除');
});

test('§5.3-5 4xx 永久拒绝整批丢弃；网络错误退避重试保留', async () => {
  const state = makeSandbox();
  state.sandbox.TTEvents.track('script.open', { scriptId: 's1', source: 'test' });
  state.sandbox.TTApi = { post: async () => { const e = new Error('bad request'); e.status = 400; throw e; } };
  await state.sandbox.TTEvents.flush();
  assert.strictEqual(state.queue().length, 0, '400 重试无意义，整批丢弃');

  state.sandbox.TTEvents.track('script.open', { scriptId: 's2', source: 'test' });
  state.sandbox.TTApi = { post: async () => { const e = new Error('network'); e.status = 0; throw e; } };
  await state.sandbox.TTEvents.flush();
  assert.strictEqual(state.queue().length, 1, '网络错误保留待重试');

  state.sandbox.TTEvents.track('script.open', { scriptId: 's3', source: 'test' });
  state.sandbox.TTApi = { post: async () => { const e = new Error('slow down'); e.status = 429; throw e; } };
  await state.sandbox.TTEvents.flush();
  assert.strictEqual(state.queue().length, 2, '429 可重试，保留');
});
