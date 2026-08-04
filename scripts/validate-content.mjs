import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const errors = [];
const registryPath = path.join(root, 'script-registry.js');

if (!fs.existsSync(registryPath)) {
  errors.push('缺少 script-registry.js');
} else {
  const source = fs.readFileSync(registryPath, 'utf8');
  const ids = [...source.matchAll(/^\s{2}([a-z0-9_]+):\s*\{/gm)].map((match) => match[1]);
  const files = [...source.matchAll(/file:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);

  if (ids.length < 5) errors.push(`剧本注册数量异常：${ids.length}`);
  if (new Set(ids).size !== ids.length) errors.push('剧本 ID 重复');
  if (files.length !== ids.length) errors.push('剧本 file 字段数量与剧本数量不一致');

  for (const file of files) {
    if (!fs.existsSync(path.join(root, file))) errors.push(`注册剧本页面不存在：${file}`);
  }
}

const knowledgePath = path.join(root, 'data', 'knowledge_points.json');
if (!fs.existsSync(knowledgePath)) {
  errors.push('缺少 data/knowledge_points.json');
} else {
  try {
    const value = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
    const rows = Array.isArray(value) ? value : Object.values(value).flatMap((item) => Array.isArray(item) ? item : [item]);
    const ids = rows.map((item) => item && (item.id || item.knowledgeId)).filter(Boolean);
    if (ids.length && new Set(ids).size !== ids.length) errors.push('知识点 ID 重复');
  } catch (error) {
    errors.push(`knowledge_points.json 解析失败：${error.message}`);
  }
}

for (const relative of ['.env.example', 'data/ai_prompts.json']) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) continue;
  const source = fs.readFileSync(target, 'utf8');
  if (/sk-[A-Za-z0-9_-]{16,}/.test(source)) errors.push(`${relative} 疑似包含 OpenAI 风格真实密钥`);

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^DASHSCOPE_API_KEY\s*=\s*(.*)$/);
    if (!match) continue;
    const value = match[1].trim().replace(/^['"]|['"]$/g, '');
    if (value) errors.push(`${relative} 疑似包含真实 DASHSCOPE_API_KEY`);
  }
}

if (errors.length) {
  console.error('\n内容校验失败：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('内容校验通过');
