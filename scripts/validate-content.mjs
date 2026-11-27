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

// 回响锚点与后果登记校验（MOD-ENGINE-04）
// 元数据层：echoAnchors 的幕次引用与 acts 一致；consequences 的 actId 合法；echo 条目的 anchorId 必须存在于 echoAnchors。
const metadataPath = path.join(root, 'data', 'teaching_metadata.json');
if (!fs.existsSync(metadataPath)) {
  errors.push('缺少 data/teaching_metadata.json');
} else {
  try {
    const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const scripts = meta.scripts || {};
    for (const [scriptId, sc] of Object.entries(scripts)) {
      const acts = Array.isArray(sc.acts) ? sc.acts : [];
      const actIds = new Set(acts.map((a) => a.id));
      const actTitleById = new Map(acts.map((a) => [a.id, a.title]));

      for (const anchor of sc.echoAnchors || []) {
        const label = `${scriptId} 回响锚点 ${anchor.id || '(缺 id)'}`;
        if (!anchor.id) errors.push(`${label}：缺少 id`);
        if (!anchor.npcId) errors.push(`${label}：缺少 npcId`);
        if (!actIds.has(anchor.echoActId)) errors.push(`${label}：echoActId ${anchor.echoActId} 不在 acts 中`);
        if (!actIds.has(anchor.refersToActId)) errors.push(`${label}：refersToActId ${anchor.refersToActId} 不在 acts 中`);
        if (actTitleById.has(anchor.refersToActId) && anchor.refersToActTitle !== actTitleById.get(anchor.refersToActId)) {
          errors.push(`${label}：refersToActTitle「${anchor.refersToActTitle}」与 acts 中「${actTitleById.get(anchor.refersToActId)}」不一致`);
        }
        if (anchor.refersToActId === anchor.echoActId) errors.push(`${label}：回响不能与被回读幕次相同`);
      }

      const anchorIds = new Set((sc.echoAnchors || []).map((a) => a.id).filter(Boolean));
      for (const [index, item] of (sc.consequences || []).entries()) {
        if (!actIds.has(item.actId)) errors.push(`${scriptId} consequences[${index}]：actId ${item.actId} 不在 acts 中`);
        if (item.anchorId && !anchorIds.has(item.anchorId)) {
          errors.push(`${scriptId} consequences[${index}]：anchorId ${item.anchorId} 不存在于 echoAnchors`);
        }
      }
    }
  } catch (error) {
    errors.push(`teaching_metadata.json 解析失败：${error.message}`);
  }
}

// 页面层：注册剧本页内 echoAnchors 的 refersToActTitle 须与该页 echoActTitles（优先）或幕次副标题一致。
const registrySource = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';
const pageFiles = [...registrySource.matchAll(/file:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
for (const file of pageFiles) {
  const pagePath = path.join(root, file);
  if (!fs.existsSync(pagePath)) continue;
  const html = fs.readFileSync(pagePath, 'utf8');
  const anchorsBlock = html.match(/echoAnchors:\s*\[([\s\S]*?)\n\s*\]/);
  if (!anchorsBlock) continue;

  // echoActTitles: { act_1: '标题', ... }（单引号或双引号均可）
  const titlesBlock = html.match(/echoActTitles:\s*\{([\s\S]*?)\}/);
  const pageTitleById = new Map();
  if (titlesBlock) {
    for (const m of titlesBlock[1].matchAll(/(act_\d+)\s*:\s*['"]([^'"]+)['"]/g)) {
      pageTitleById.set(m[1], m[2]);
    }
  }
  const subtitles = new Set([...html.matchAll(/(?:actSubtitle|subtitle):\s*["']([^"']+)["']/g)].map((m) => m[1]));

  for (const m of anchorsBlock[1].matchAll(/id:\s*['"]([^'"]+)['"][\s\S]*?refersToActId:\s*['"]([^'"]+)['"][\s\S]*?refersToActTitle:\s*['"]([^'"]+)['"]/g)) {
    const [, anchorId, refersToActId, refersToActTitle] = m;
    const expected = pageTitleById.get(refersToActId);
    if (expected) {
      if (expected !== refersToActTitle) errors.push(`${file}：回响 ${anchorId} refersToActTitle「${refersToActTitle}」与 echoActTitles 中「${expected}」不一致`);
    } else if (!subtitles.has(refersToActTitle)) {
      errors.push(`${file}：回响 ${anchorId} refersToActTitle「${refersToActTitle}」与页面幕次副标题不一致`);
    }
  }
}

if (errors.length) {
  console.error('\n内容校验失败：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('内容校验通过');
