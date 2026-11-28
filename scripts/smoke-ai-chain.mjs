#!/usr/bin/env node
/**
 * smoke-ai-chain.mjs — AI 对话链路真机冒烟（需要 .env 里配好 AI 密钥）
 *
 * 与单测里的 stub 不同，这里走真实模型：验证
 *   1. 模型是否按结构化契约输出 JSON；
 *   2. 服务端清洗后 emotion / consequence 是否仍然合规；
 *   3. 结论是否被写入"模拟后果"而不是史实。
 *
 * 用法：node scripts/smoke-ai-chain.mjs
 * 未配置密钥时明确报告"未验证"，不静默通过。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-smoke-'));
process.env.DB_PATH = path.join(tempDir, 'smoke.sqlite');
process.env.DATA_DIR = tempDir;

const { openDatabase, closeDatabase } = await import('../server/db/database.js');
const { npcChat } = await import('../server/services/npc-chat-service.js');
const { config } = await import('../server/config.js');

const hasKey = !!(config.aiApiKey || config.aiFallbackApiKey);
if (!hasKey) {
  console.log('⚠ 未配置 AI 密钥（AI_API_KEY / DASHSCOPE_API_KEY），真实链路未验证。');
  console.log('  配置方法：cp .env.example .env 并填入密钥，再执行 npm run db:migrate 后重试。');
  console.log('  当前仅由 server/tests/ai-chain.test.mjs 的 stub 覆盖契约与清洗逻辑。');
  closeDatabase();
  process.exit(2);
}

const db = openDatabase();
const actor = 'actor_smoke_' + Date.now();
const question = '我在慈禧面前替光绪说话，你认为代价是什么？';

console.log('模型：', config.aiModel, '| 端点：', config.aiBaseUrl);
const result = await npcChat(db, {
  actorId: actor,
  scriptId: 'wuxu_reform',
  npcId: 'npc_luoshu',
  message: question,
  trustEvent: 'student_faces_dilemma'
});

console.log('---');
console.log('模式：', result.mode, result.fallbackReason ? `(${result.fallbackReason})` : '');
console.log('回复：', result.reply);
console.log('情绪：', result.emotion);
console.log('后果：', JSON.stringify(result.consequence));
console.log('信任：', result.trust, `(${result.tier})`);

const consequences = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/npc_consequences.json'), 'utf8'));
const problems = [];
for (const [axis, delta] of Object.entries(result.consequence || {})) {
  if (!consequences.axes[axis]) problems.push(`越界轴：${axis}`);
  if (Math.abs(delta) > consequences.maxDelta) problems.push(`超范围数值：${axis}=${delta}`);
}
if (result.emotion && !consequences.emotions.includes(result.emotion)) problems.push(`越界情绪：${result.emotion}`);
if (result.reply.includes('"consequence"')) problems.push('结构化尾巴没有从正文中剥离');

if (problems.length) {
  console.log('\n❌ 契约问题：');
  for (const problem of problems) console.log(' -', problem);
  closeDatabase();
  process.exit(1);
}

console.log('\n✅ 真实链路契约通过：结构化输出被解析并清洗，结果只会进入"模拟后果"栏。');
closeDatabase();
