import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const target = path.join(process.cwd(), 'data', 'event_catalog.json');
const errors = [];

if (!fs.existsSync(target)) {
  errors.push('缺少 data/event_catalog.json');
} else {
  try {
    const catalog = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (!Array.isArray(catalog.events)) errors.push('event_catalog.events 必须为数组');
    const names = (catalog.events || []).map((item) => item.name);
    if (new Set(names).size !== names.length) errors.push('事件名称重复');
    const forbidden = new Set(['password', 'email', 'phone', 'realName', 'localStorage', 'screenRecording', 'keystrokes']);
    for (const event of catalog.events || []) {
      if (!event.name || !/^[a-z0-9_.-]+$/.test(event.name)) errors.push(`非法事件名：${event.name}`);
      if (!Array.isArray(event.allowedPayloadKeys)) errors.push(`${event.name} 缺少 allowedPayloadKeys`);
      for (const key of event.allowedPayloadKeys || []) {
        if (forbidden.has(key)) errors.push(`${event.name} 包含禁止采集字段：${key}`);
      }
    }
  } catch (error) {
    errors.push(`event_catalog.json 解析失败：${error.message}`);
  }
}

// --- 引擎正式钩子覆盖度：DOM 猜测不得作为关键互动的唯一数据源 ---
const REQUIRED_ENGINE_HOOKS = [
  'script.act_enter',
  'script.choice',
  'script.evidence_open',
  'script.knowledge_open',
  'script.card',
  'quiz.answer',
  'quiz.complete',
  'script.ending'
];

const enginePath = path.join(process.cwd(), 'engine.js');
if (!fs.existsSync(enginePath)) {
  errors.push('缺少 engine.js，无法校验正式事件钩子');
} else {
  const engineSource = fs.readFileSync(enginePath, 'utf8');
  const emitted = new Set([
    ...[...engineSource.matchAll(/ttHook\('([a-z0-9_.]+)'/g)].map((match) => match[1]),
    ...(/ttEmitActEnter\s*\(/.test(engineSource) ? ['script.act_enter'] : [])
  ]);
  for (const name of REQUIRED_ENGINE_HOOKS) {
    if (!emitted.has(name)) errors.push(`engine.js 未发射正式事件钩子：${name}`);
  }
  const catalogNames = new Set(
    JSON.parse(fs.readFileSync(target, 'utf8')).events.map((item) => item.name)
  );
  for (const name of emitted) {
    if (!catalogNames.has(name)) errors.push(`engine.js 发射了目录外事件：${name}`);
  }
}

// --- 剧本页必须加载 game-hooks.js，否则钩子无法上报 ---
const SCRIPT_PAGES = [
  'american_revolution.html',
  'game-scene.html',
  'industrial_revolution.html',
  'wuxu_reform.html',
  'xinhai_revolution.html'
];
for (const page of SCRIPT_PAGES) {
  const pagePath = path.join(process.cwd(), page);
  if (!fs.existsSync(pagePath)) continue;
  const html = fs.readFileSync(pagePath, 'utf8');
  if (!html.includes('game-hooks.js')) errors.push(`${page} 未引入 assets/js/game-hooks.js`);
}

if (errors.length) {
  console.error('\n事件目录校验失败：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`事件目录校验通过（engine.js 正式钩子 ${REQUIRED_ENGINE_HOOKS.length} 项齐全）`);
