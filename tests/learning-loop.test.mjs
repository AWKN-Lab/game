import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));

function loadBrowserScript(relative, extraGlobals = {}) {
  const source = read(relative);
  const store = new Map();
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

const SCRIPT_PAGES = [
  'xinhai_revolution.html',
  'wuxu_reform.html',
  'industrial_revolution.html',
  'american_revolution.html',
  'game-scene.html'
];

test('知识测试题目 schema 兼容：两套写法都能渲染', () => {
  const engine = read('engine.js');
  assert.ok(engine.includes('function normalizeQuizQuestion'), '缺少题目归一化函数');
  assert.ok(engine.includes('item.opts || item.options'), '未兼容 options 字段');
  assert.ok(engine.includes('item.ans !== undefined ? item.ans : item.answer'), '未兼容 answer 字段');

  // 三个历史剧本用的是 {question, options, answer, explanation}
  for (const page of ['xinhai_revolution.html', 'wuxu_reform.html', 'american_revolution.html']) {
    const source = read(page);
    const quiz = source.slice(source.indexOf('QUIZ_DATA: ['), source.indexOf('QUIZ_DATA: [') + 4000);
    assert.ok(/question\s*:/.test(quiz), `${page} 应使用 question 字段`);
    assert.ok(/options\s*:/.test(quiz), `${page} 应使用 options 字段`);
    assert.ok(/answer\s*:/.test(quiz), `${page} 应使用 answer 字段`);
  }
});

test('知识点映射表指向真实存在的账本 id，且覆盖五个剧本', () => {
  const link = readJson('data/knowledge_link.json');
  const knowledge = readJson('data/knowledge_points.json');
  for (const [scriptId, section] of Object.entries(link.scripts)) {
    assert.ok(knowledge[scriptId], `${scriptId} 在账本里不存在`);
    const ledgerIds = new Set([
      ...(knowledge[scriptId].history || []).map((x) => x.id),
      ...(knowledge[scriptId].daofa || []).map((x) => x.id)
    ]);
    assert.ok(section.nodes.length > 0, `${scriptId} 没有节点映射`);
    for (const node of section.nodes) {
      assert.ok(ledgerIds.has(node.ledgerId), `${scriptId} 的 ${node.nodeId} → ${node.ledgerId} 不在账本中`);
      assert.ok(node.title, `${scriptId} 的 ${node.nodeId} 缺少标题`);
    }
    assert.ok(section.quiz.length > 0, `${scriptId} 没有测试题映射`);
    for (const item of section.quiz) {
      assert.ok(ledgerIds.has(item.ledgerId), `${scriptId} 第 ${item.index} 题映射到不存在的 ${item.ledgerId}`);
    }
  }
  assert.equal(Object.keys(link.scripts).length, 5, '应覆盖五个剧本');
});

test('剧本页引入了知识点映射脚本', () => {
  for (const page of SCRIPT_PAGES) {
    assert.ok(read(page).includes('knowledge-link.js'), `${page} 未引入 knowledge-link.js`);
  }
  assert.ok(read('learning-review.html').includes('knowledge-link.js'), '学习复盘页未引入 knowledge-link.js');
});

test('知识点掌握度：写入后成为可用的结构化记录', () => {
  const { sandbox } = loadBrowserScript('data-store.js');
  const DataStore = sandbox.window.DataStore;

  DataStore.recordKnowledgeAnswer('k_wuchang', true, '武昌起义');
  DataStore.recordKnowledgeAnswer('k_wuchang', false, '武昌起义');
  DataStore.markKnowledgeTouched('k_linshi_yuefa', '《中华民国临时约法》');

  const statuses = DataStore.getKnowledgeStatuses();
  assert.equal(statuses.k_wuchang.mastered, true, '答对后应记为已掌握');
  assert.equal(statuses.k_wuchang.correct, 1);
  assert.equal(statuses.k_wuchang.wrong, 1);
  assert.equal(statuses.k_linshi_yuefa.touched, true, '接触过的知识点应被标记');
  assert.equal(statuses.k_linshi_yuefa.mastered, false);

  // 旧写法仍可用（布尔）
  DataStore.saveKnowledgeStatus('legacy_id', true);
  assert.equal(DataStore.getKnowledgeStatuses().legacy_id, true, '旧的布尔写法必须兼容');
});

test('复盘页按剧本过滤知识点，并区分史实与模拟后果', () => {
  const adapter = read('assets/js/learning-data-adapter.js');
  assert.ok(adapter.includes('scriptLedgerIds'), '适配器未按映射表过滤知识点');
  assert.ok(adapter.includes('simulatedConsequences'), '适配器未暴露模拟后果');

  const review = read('learning-review.html');
  assert.ok(review.includes('masteryBoard'), '复盘页缺少知识点掌握区块');
  assert.ok(review.includes('simulatedBoard'), '复盘页缺少模拟后果区块');
  assert.ok(review.includes('不构成历史事实'), '模拟后果区块缺少史实边界声明');
});

test('引擎提供学习旅程进度与字号设置', () => {
  const engine = read('engine.js');
  assert.ok(engine.includes('function toggleJourneyPanel'), '缺少学习旅程面板');
  assert.ok(engine.includes('function masterySnapshot'), '缺少掌握度统计');
  assert.ok(engine.includes('function cycleFontScale'), '缺少字号切换');
  assert.ok(engine.includes("localStorage.setItem(FONT_KEY"), '字号未持久化');
  assert.ok(engine.includes('journeyPanel'), '未渲染旅程面板容器');
});

test('数据一致性：账本与剧本节点命名冲突已被记录在映射表里', () => {
  const link = readJson('data/knowledge_link.json');
  const french = link.scripts.french_revolution;
  // 法国剧本节点是 k_* 前缀，账本是 fr_h*/fr_d*，映射必须显式给出
  assert.ok(french.nodes.some((n) => n.nodeId.startsWith('k_') && n.ledgerId.startsWith('fr_')),
    '法国剧本的 k_* 节点必须映射到 fr_* 账本 id');
  const industrial = link.scripts.industrial_revolution;
  assert.ok(industrial.nodes.some((n) => n.ledgerId.startsWith('ir_')),
    '工业剧本节点必须映射到 ir_* 账本 id');
});
