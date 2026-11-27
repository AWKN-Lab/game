import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

function loadClient(relPath, { windowOverrides = {}, locationPath = '/wish-pool.html' } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  };
  const sandbox = {
    localStorage,
    TTEvents: { events: [], track(name, payload) { this.events.push({ name, payload }); } },
    TTIdentity: { getContext: () => ({ anonymousId: 'anon_test', sessionId: 'sess_test', role: 'student' }) },
    ...windowOverrides
  };
  const source = fs.readFileSync(path.join(root, relPath), 'utf8');
  new Function('window', 'location', 'localStorage', source)(sandbox, { pathname: locationPath }, localStorage);
  return { sandbox, localStorage };
}

test('wish client：提交失败保留草稿，成功后清除', async () => {
  let fail = true;
  const { sandbox, localStorage } = loadClient('assets/js/wish-pool-client.js', {
    windowOverrides: {
      TTApi: {
        post: async () => { if (fail) throw new Error('网络不可用'); return { id: 'wish_1', publicId: 'W-1' }; }
      }
    }
  });

  await assert.rejects(() => sandbox.TTWishes.submit({ title: '希望支持打印' }), /网络不可用/);
  const draft = JSON.parse(localStorage.getItem('st_wish_draft_v1'));
  assert.equal(draft.payload.title, '希望支持打印');
  assert.ok(draft.savedAt);
  const restored = sandbox.TTWishes.peekDraft();
  assert.equal(restored.payload.title, '希望支持打印');

  fail = false;
  const response = await sandbox.TTWishes.submit({ title: '希望支持打印' });
  assert.equal(response.id, 'wish_1');
  assert.equal(localStorage.getItem('st_wish_draft_v1'), null);
  assert.equal(sandbox.TTWishes.peekDraft(), null);
});

test('wish client：校验失败不写草稿', async () => {
  const { sandbox, localStorage } = loadClient('assets/js/wish-pool-client.js', {
    windowOverrides: { TTApi: { post: async () => ({ id: 'x' }) } }
  });
  await assert.rejects(() => sandbox.TTWishes.submit({ title: '短' }), /至少需要两个字/);
  assert.equal(localStorage.getItem('st_wish_draft_v1'), null);
});

test('feedback client：提交失败保留草稿，成功后清除', async () => {
  let fail = true;
  const { sandbox, localStorage } = loadClient('assets/js/feedback-client.js', {
    windowOverrides: {
      TTApi: {
        post: async () => { if (fail) throw new Error('网络不可用'); return { id: 'fb_1' }; }
      }
    }
  }, { locationPath: '/index.html' });

  await assert.rejects(() => sandbox.TTFeedback.submit({ message: '页面很好用' }), /网络不可用/);
  const draft = JSON.parse(localStorage.getItem('st_feedback_draft_v1'));
  assert.equal(draft.payload.message, '页面很好用');
  assert.equal(sandbox.TTFeedback.peekDraft().payload.message, '页面很好用');

  fail = false;
  await sandbox.TTFeedback.submit({ message: '页面很好用' });
  assert.equal(localStorage.getItem('st_feedback_draft_v1'), null);
});
