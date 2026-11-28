#!/usr/bin/env node
/**
 * validate-counterfactual.mjs — T15 反事实静态检查（ENG-16 缺口 A，长期门禁）
 *
 * 铁律：好玩的前提是学习到了历史。判据：屏蔽/移除全部 evidence 与 knowledge
 * 节点内容后，若玩家仍可无障碍通关并拿满关键收集品 + 结业测验，则该剧本 FAIL。
 *
 * 静态近似（五剧本逐一）：
 *   C1 证据承重    evidence 节点 ≥ 2，且每个 evidence 节点带判分选项（correctIndex/correctOptionId）
 *   C2 知识承重    knowledge 节点 ≥ 5
 *   C3 收集品门    afterlifeMinItems > 0，且无条件收集品数 < afterlifeMinItems
 *                  ——屏蔽证据后拿不满收集品，最佳结局不可达（历史承重）
 *   C4 条件可达    collectible_conditional 引用的 choseAtNode('id') 在剧本中存在节点定义
 *                  ——防条件永假导致隐藏结局永久不可达
 *   C5 测验承重    QUIZ_DATA 题数 ≥ 3（结业测验存在且非摆设）
 *
 * 与 W07「反事实三变体」（教学内容设计）无关，勿混用。
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);

// 从 script-registry.js 读取五剧本文件映射（唯一事实源）
const registrySrc = fs.readFileSync(path.join(root, 'script-registry.js'), 'utf8');
const scripts = [];
for (const m of registrySrc.matchAll(/id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*file:\s*'([^']+)'/g)) {
  scripts.push({ id: m[1], name: m[2], file: m[3] });
}
if (scripts.length === 0) {
  console.error('[T15] 未能从 script-registry.js 解析出任何剧本');
  process.exit(1);
}

function inlineScript(html) {
  // 拼接全部内联 <script> 正文（剧本数据均在页面内联脚本中）
  const out = [];
  for (const m of html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)) out.push(m[1]);
  return out.join('\n');
}

function count(re, src) {
  return (src.match(re) || []).length;
}

/** 从 inline JS 中括号配对提取 QUIZ_DATA 数组并统计条目数（兼容 q:/question: 两种格式） */
function countQuizQuestions(js) {
  const anchor = js.indexOf('QUIZ_DATA');
  if (anchor === -1) return 0;
  const open = js.indexOf('[', anchor);
  if (open === -1) return 0;
  let depth = 0, end = -1;
  for (let i = open; i < js.length; i++) {
    const c = js[i];
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < js.length && js[i] !== quote) {
        if (js[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return 0;
  const body = js.slice(open, end + 1);
  const items = (body.match(/\bq:\s*["'{]/g) || []).length
    + (body.match(/\bquestion:\s*["'{]/g) || []).length;
  return items;
}

function validateScript(s) {
  const file = path.join(root, s.file);
  const problems = [];
  const notes = [];
  if (!fs.existsSync(file)) {
    return { problems: [`剧本文件不存在: ${s.file}`], notes, stats: {} };
  }
  const js = inlineScript(fs.readFileSync(file, 'utf8'));

  const evidenceCount = count(/type:\s*["']evidence["']/g, js);
  const knowledgeCount = count(/type:\s*["']knowledge["']/g, js);
  const plainCollectibles = count(/type:\s*["']collectible["']/g, js);
  const conditionalCollectibles = count(/type:\s*["']collectible_conditional["']/g, js);
  const afterlifeMinItems = parseInt((js.match(/afterlifeMinItems:\s*(\d+)/) || [])[1] || '0', 10);
  const stats = { evidenceCount, knowledgeCount, plainCollectibles, conditionalCollectibles, afterlifeMinItems };

  // C1 证据节点存在且带判分（逐节点：从 type:"evidence" 到下一个节点 type: 之间须含判分字段）
  if (evidenceCount < 2) problems.push(`C1 证据节点仅 ${evidenceCount} 个（<2），历史材料不承重`);
  const nodeStarts = [...js.matchAll(/type:\s*["'](\w+)["']/g)];
  let graded = 0;
  for (let i = 0; i < nodeStarts.length; i++) {
    if (nodeStarts[i][1] !== 'evidence') continue;
    const end = nodeStarts.slice(i + 1).find(m => m.index > nodeStarts[i].index);
    const block = js.slice(nodeStarts[i].index, end ? end.index : js.length);
    if (/correctIndex|correctOptionId/.test(block)) graded++;
  }
  if (evidenceCount > 0 && graded < evidenceCount) {
    problems.push(`C1 ${evidenceCount - graded} 个证据节点缺判分选项（correctIndex/correctOptionId），证据交互走过场`);
  }

  // C2 知识节点存在
  if (knowledgeCount < 5) problems.push(`C2 知识节点仅 ${knowledgeCount} 个（<5），知识点覆盖不足`);

  // C3 收集品门承重：无条件收集品必须 < 最佳结局门槛
  if (!(afterlifeMinItems > 0)) {
    problems.push('C3 未定义 afterlifeMinItems>0，收集品不构成结局门槛，屏蔽证据可无障碍通关');
  } else if (plainCollectibles >= afterlifeMinItems) {
    problems.push(`C3 无条件收集品 ${plainCollectibles} ≥ 门槛 ${afterlifeMinItems}，屏蔽证据仍可集齐，反事实 FAIL`);
  } else {
    notes.push(`收集品门承重：无条件 ${plainCollectibles} < 门槛 ${afterlifeMinItems}，需 ≥${afterlifeMinItems - plainCollectibles} 个条件收集品`);
  }

  // C4 条件收集品引用的节点必须存在
  const definedIds = new Set();
  for (const m of js.matchAll(/\bid:\s*["']([a-zA-Z0-9_\-]+)["']/g)) definedIds.add(m[1]);
  const condRefs = [...js.matchAll(/choseAtNode\(\s*["']([^"']+)["']\s*\)/g)].map(m => m[1]);
  for (const ref of new Set(condRefs)) {
    if (!definedIds.has(ref)) problems.push(`C4 条件收集品引用的节点 id "${ref}" 在剧本中不存在，条件永假`);
  }
  if (conditionalCollectibles === 0 && afterlifeMinItems > plainCollectibles) {
    problems.push(`C4 无条件收集品 ${plainCollectibles} < 门槛 ${afterlifeMinItems} 但无条件收集品节点，隐藏结局不可达`);
  }

  // C5 结业测验存在（括号配对提取 QUIZ_DATA 数组，兼容 q:/question: 两种条目格式）
  const quizTotal = countQuizQuestions(js);
  if (quizTotal < 3) problems.push(`C5 结业测验仅 ${quizTotal} 题（<3），学习认证不承重`);
  stats.quizTotal = quizTotal;
  stats.gradedEvidence = graded;

  return { problems, notes, stats };
}

let failed = 0;
console.log('[T15] 反事实静态检查（判据：屏蔽证据/知识后仍可无障碍通关=不合格）\n');
for (const s of scripts) {
  const { problems, notes, stats } = validateScript(s);
  const ok = problems.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${s.name}（${s.id}，${s.file}）`);
  console.log(`   evidence=${stats.evidenceCount} knowledge=${stats.knowledgeCount} 无条件收集品=${stats.plainCollectibles} 条件收集品=${stats.conditionalCollectibles} 门槛=${stats.afterlifeMinItems} 测验题=${stats.quizTotal}`);
  for (const n of notes) console.log(`   · ${n}`);
  for (const p of problems) console.log(`   ✗ ${p}`);
}
console.log(`\n[T15] ${scripts.length - failed}/${scripts.length} 剧本通过`);
process.exit(failed > 0 ? 1 : 0);
