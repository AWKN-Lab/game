#!/usr/bin/env node
/**
 * build-asset-ledger.mjs — 生成资产台账 assets/asset-ledger.json
 *
 * 台账解决什么问题：IP 门禁（scripts/validate-ip.mjs）只能扫可见关键词，
 * 而图像/音频的内容权属无法用关键词判断。台账把每个资产文件的来源、
 * 权属、替换状态显式记录下来，让 CI 可以做完整性检查。
 *
 * 用法：node scripts/build-asset-ledger.mjs [--write]
 *   默认打印统计；--write 写入 assets/asset-ledger.json
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const root = process.cwd();
const LEDGER_PATH = path.join(root, 'assets/asset-ledger.json');
const ASSET_DIRS = ['images', 'audio', 'music', 'fonts', 'assets/css'];

/** 已知来源存疑的资产：文件名带外部 IP 角色名，或来自外部游戏立绘目录。 */
const THIRD_PARTY_RULES = [
  { match: /^images\/characters\/(zijin|luoshu)\//, reason: '外部游戏立绘衍生，需替换为原创角色' },
  { match: /^audio\/voice\/(fulina|hutao)_/, reason: '文件名沿用外部 IP 角色名，需确认权属' },
  { match: /^images\/characters\/(ghost|npc)\//, reason: '来源不明，需补充授权说明' }
];

const CODE_EXT = new Set(['.html', '.js', '.mjs', '.json', '.css', '.md']);

/**
 * 有意保留但当前未被代码引用的资产（预留美术：结局场景、Q 版、备用收集品等）。
 * 台账会把它们标记为 reserved，避免被当成死重删除，也避免被当成"漏接线"。
 */
const RESERVED = [
  { match: /^images\/characters\/(zijin|luoshu)\/variants\//, reason: '预留角色衍生图（Q 版 / 立绘 / 装饰框）' },
  { match: /^images\/bg\/(afterlife_river|american_memorial|ghost_world|qing_court|tansitong_prison|versailles_garden|wuxu_memorial|xinhai_memorial)\.webp$/, reason: '预留结局场景（命运档案 / 纪念结局待接入）' },
  { match: /^images\/cards\/(card_justice|card_rule_of_law)\.webp$/, reason: '预留卡牌（剧本卡池扩充）' },
  { match: /^images\/collectibles\/fragment_innocent_soul_2\.webp$/, reason: '预留收集品（法国剧本第二枚亡魂碎片）' }
];

/** 目录级引用：这些目录下的文件按"运行时动态选择"整体视为被引用（仅直接子文件）。 */
const DYNAMIC_DIRS = [
  'images/characters/zijin',
  'images/characters/luoshu',
  'images/characters/npc',
  'images/characters/ghost'
];

/** 允许内容重复的白名单：角色表情目录下的同名同图（待做真差分，不算违规）。 */
function isExpressionTwin(paths) {
  return paths.length > 1 && paths.every((p) => p.startsWith('images/characters/'));
}

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    return fs.readdirSync(root, { recursive: true })
      .filter((p) => typeof p === 'string' && !p.startsWith('.git'))
      .map((p) => p.replace(/\\/g, '/'));
  }
}

function collectCodeText(files) {
  const parts = [];
  for (const file of files) {
    if (!CODE_EXT.has(path.extname(file))) continue;
    if (file.startsWith('assets/asset-ledger.json')) continue;
    try {
      parts.push(fs.readFileSync(path.join(root, file), 'utf8'));
    } catch (error) { /* ignore */ }
  }
  return parts.join('\n');
}

function md5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(path.join(root, file))).digest('hex');
}

function classify(rel) {
  if (rel.startsWith('images/')) return 'image';
  if (rel.startsWith('audio/')) return rel.includes('/voice/') ? 'voice' : 'sfx';
  if (rel.startsWith('music/')) return 'bgm';
  if (rel.startsWith('fonts/')) return 'font';
  return 'asset';
}

const files = trackedFiles();
const codeText = collectCodeText(files);

const assets = [];
for (const rel of files) {
  if (!ASSET_DIRS.some((dir) => rel.startsWith(dir))) continue;
  const full = path.join(root, rel);
  let stat;
  try { stat = fs.statSync(full); } catch (error) { continue; }
  if (!stat.isFile()) continue;

  const base = path.basename(rel);
  const inDynamicDir = DYNAMIC_DIRS.some((dir) => rel.startsWith(dir + '/') && !rel.slice(dir.length + 1).includes('/'));
  const referenced = inDynamicDir || codeText.includes(base) || codeText.includes(rel);
  const rule = THIRD_PARTY_RULES.find((item) => item.match.test(rel));
  const reserved = RESERVED.find((item) => item.match.test(rel));

  assets.push({
    path: rel,
    kind: classify(rel),
    bytes: stat.size,
    md5: md5(rel),
    referenced,
    source: rule ? 'unknown' : 'self-produced',
    original: rule ? false : true,
    status: rule
      ? 'replace-original'
      : (referenced ? 'active' : (reserved ? 'reserved' : 'candidate-removal')),
    note: rule ? rule.reason : (reserved ? reserved.reason : '')
  });
}

assets.sort((a, b) => a.path.localeCompare(b.path));

// 相同内容的多份文件（重复资源）
const byHash = new Map();
for (const asset of assets) {
  if (!byHash.has(asset.md5)) byHash.set(asset.md5, []);
  byHash.get(asset.md5).push(asset.path);
}
const duplicates = [];
for (const [hash, paths] of byHash) {
  if (paths.length <= 1) continue;
  duplicates.push({ md5: hash, paths, kind: isExpressionTwin(paths) ? 'expression-twin' : 'duplicate' });
}
const duplicatePaths = new Set(duplicates.filter((d) => d.kind === 'duplicate').flatMap((d) => d.paths.slice(1)));
for (const asset of assets) {
  if (duplicatePaths.has(asset.path)) asset.status = 'duplicate-removed';
}

const ledger = {
  version: 1,
  updatedAt: new Date().toISOString().slice(0, 10),
  note: '资产台账：来源、权属与替换状态。CI 用 scripts/validate-assets.mjs 校验完整性。',
  policy: {
    originalFalseRequiresPlan: true,
    referencedMustBeTracked: true,
    duplicateContentAllowed: false
  },
  summary: {
    total: assets.length,
    totalBytes: assets.reduce((sum, a) => sum + a.bytes, 0),
    referenced: assets.filter((a) => a.referenced).length,
    unreferenced: assets.filter((a) => !a.referenced).length,
    unreferencedBytes: assets.filter((a) => !a.referenced).reduce((sum, a) => sum + a.bytes, 0),
    nonOriginal: assets.filter((a) => !a.original).length,
    reserved: assets.filter((a) => a.status === 'reserved').length,
    candidateRemoval: assets.filter((a) => a.status === 'candidate-removal').length,
    duplicateGroups: duplicates.length
  },
  duplicates,
  assets
};
ledger.summary.duplicateFiles = duplicatePaths.size;

if (process.argv.includes('--write')) {
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n');
  console.log('已写入', path.relative(root, LEDGER_PATH));
} else {
  console.log(JSON.stringify(ledger.summary, null, 2));
  console.log('重复内容组：');
  for (const group of duplicates.slice(0, 20)) {
    console.log(' -', group.paths.join('  ==  '));
  }
  console.log('\n未引用资产（前 40 个）：');
  for (const asset of assets.filter((a) => !a.referenced).slice(0, 40)) {
    console.log(` ${(asset.bytes / 1024).toFixed(0).padStart(7)}KB  ${asset.path}`);
  }
}
