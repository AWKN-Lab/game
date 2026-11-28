import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

test('外部独立测题存在且与游戏内题目不同源', () => {
  const parallel = readJson('data/assessment/parallel_items.json');
  assert.ok(parallel.scripts, '缺少脚本维度');
  assert.equal(parallel.status, 'draft-pending-fact-review', '未审校题目的状态标记不正确');

  const knowledge = readJson('data/knowledge_points.json');
  const inGameIds = new Set();
  for (const script of Object.values(knowledge)) {
    for (const item of script.history || []) if (item.id) inGameIds.add(item.id);
    for (const item of script.daofa || []) if (item.id) inGameIds.add(item.id);
  }

  for (const [scriptId, bundle] of Object.entries(parallel.scripts)) {
    assert.ok(bundle.items.length > 0, `${scriptId} 没有题目`);
    for (const item of bundle.items) {
      assert.ok(item.id, '题目缺少 id');
      assert.ok(item.stem, `${item.id} 缺少题干`);
      assert.ok(item.reviewStatus === 'pending', `${item.id} 未经审校却不是 pending 状态`);
      if (item.type === 'single_choice') {
        assert.ok(Array.isArray(item.options) && item.options.length >= 3, `${item.id} 选项不足`);
        assert.ok(item.answerIndex >= 0 && item.answerIndex < item.options.length, `${item.id} 答案下标越界`);
        assert.ok(item.explanation && item.explanation.length > 5, `${item.id} 缺少解析`);
      }
      if (item.type === 'short_answer') {
        assert.ok(Array.isArray(item.scoringPoints) && item.scoringPoints.length >= 2, `${item.id} 缺少评分点`);
        assert.ok(item.rubricRef, `${item.id} 未绑定量表`);
      }
      for (const knowledgeId of item.knowledgeIds || []) {
        assert.ok(inGameIds.has(knowledgeId), `${item.id} 引用了不存在的知识点 ${knowledgeId}`);
      }
    }
  }
});

test('盲评量表包含盲评规则与评分者一致性要求', () => {
  const rubric = readJson('data/assessment/blind_rubric.json');
  assert.ok(rubric.scales.quality && rubric.scales.quality.levels.length >= 3, '质量量表层级不足');
  assert.ok(rubric.scales.evidence, '缺少证据维度量表');
  assert.ok(Array.isArray(rubric.blindRules) && rubric.blindRules.length >= 3, '盲评规则不足');
  assert.ok(rubric.interRater.minRaters >= 2, '至少需要两名评分者');
  assert.ok(rubric.interRater.agreementThreshold >= 0.6, '一致性阈值过低');
});

test('延迟测安排包含前测、即时测与 7 日延迟测', () => {
  const plan = readJson('data/assessment/delayed_retest.json');
  assert.equal(plan.schedule.t0.offsetDays, 0, '前测必须在进入剧本前');
  assert.ok(plan.schedule.t1.offsetDays >= 1, '缺即时测');
  assert.ok(plan.schedule.t2.offsetDays >= 7, '缺延迟测');
  assert.ok(plan.gainDefinition.retentionRatio, '缺保持率定义');
  assert.ok(Array.isArray(plan.guards) && plan.guards.length >= 3, '防护条件不足');
});

test('原创生产计划覆盖台账里全部待替换资产', () => {
  const ledger = readJson('assets/asset-ledger.json');
  const plan = readJson('assets/original-art-plan.json');
  const targets = plan.items.map((item) => item.target);
  for (const entry of ledger.assets) {
    if (entry.status !== 'replace-original') continue;
    assert.ok(
      targets.some((target) => entry.path.startsWith(target)),
      `待替换资产未进入生产计划：${entry.path}`
    );
  }
  assert.ok(plan.anchors.length >= 4, '锚点数量不足（风格/角色/卡牌/场景层）');
  for (const item of plan.items) {
    assert.ok(item.prompt && item.prompt.length > 30, `${item.id} 缺少可用的出图提示词`);
    assert.ok(item.anchor, `${item.id} 未绑定锚点`);
  }
});

test('音效常量指向的素材全部存在，且不保留效果不达标的合成音效', () => {
  const source = fs.readFileSync(path.join(root, 'audio-manager.js'), 'utf8');
  const sfxBlock = source.slice(source.indexOf('SFX: {'), source.indexOf('}', source.indexOf('SFX_WIND_GHOSTLY')));
  const pairs = [...sfxBlock.matchAll(/(\w+):\s*'audio\/sfx\/([^']+)'/g)];
  assert.ok(pairs.length >= 15, 'SFX 常量数量异常');
  for (const [, , file] of pairs) {
    assert.ok(fs.existsSync(path.join(root, 'audio/sfx', file)), `音效文件缺失：${file}`);
  }
  // 上一轮程序合成的音效效果不达标，已整体撤回，不得残留在仓库
  assert.ok(!fs.existsSync(path.join(root, 'scripts/generate-sfx.py')), '合成音效脚本仍在仓库');
  for (const name of ['gunfire.wav', 'cheering.wav', 'bell_toll.wav', 'ocean_waves.wav']) {
    assert.ok(!fs.existsSync(path.join(root, 'audio/sfx', name)), `合成音效残留：${name}`);
  }
});
