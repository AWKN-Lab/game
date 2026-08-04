/**
 * 第三方角色 IP 物理清理脚本（一次性，可重复执行幂等）
 * 用户可见层全部原创化；内部 ID（fulina/hutao）保留以兼容存档与音频索引。
 * 用法：node tools/ip-cleanup.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dry = process.argv.includes('--dry');

// 1. 用户可见文本替换（顺序敏感：长词在前）
const textRules = [
  ['芙宁娜', '子衿'],
  ['胡桃', '洛书'],
  ['护摩之杖', '星轨手札'],
  ['往生堂', '星轨书院'],
  ['枫丹', '文明长河'],
  ['Furina', '子衿'],
  ['furina', '子衿'],
  ['Hu Tao', '洛书'],
  ['HuTao', '洛书']
];

// 2. 资源路径替换（目录原创化）
const pathRules = [
  ['images/characters/fulina', 'images/characters/zijin'],
  ['images/characters/hutao', 'images/characters/luoshu']
];

const targets = [
  'american_revolution.html',
  'industrial_revolution.html',
  'wuxu_reform.html',
  'xinhai_revolution.html',
  'game-scene.html',
  'character-intro.html',
  'script-detail.html',
  'script-select.html',
  'editor.html',
  'legacy-index.html',
  'knowledge-base.html',
  'my-learning.html',
  'how-to-play.html',
  'engine.js',
  'voice-manager.js',
  'audio/voice/voice_index.json',
  'data/knowledge_points.json',
  'data/teaching_metadata.json'
];

let changedFiles = 0;
let changedHits = 0;

for (const relative of targets) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) continue;
  const before = fs.readFileSync(target, 'utf8');
  let after = before;

  for (const [from, to] of pathRules) {
    if (after.includes(from)) {
      changedHits += after.split(from).length - 1;
      after = after.split(from).join(to);
    }
  }
  for (const [from, to] of textRules) {
    if (after.includes(from)) {
      changedHits += after.split(from).length - 1;
      after = after.split(from).join(to);
    }
  }

  if (after !== before) {
    changedFiles += 1;
    if (!dry) fs.writeFileSync(target, after, 'utf8');
    console.log(`${dry ? '[dry] ' : ''}已处理 ${relative}`);
  }
}

// 3. engine.js 内部键的 dir 指向新目录
const enginePath = path.join(root, 'engine.js');
if (fs.existsSync(enginePath)) {
  const before = fs.readFileSync(enginePath, 'utf8');
  const after = before
    .replace(/dir:\s*'fulina'/g, "dir: 'zijin'")
    .replace(/dir:\s*'hutao'/g, "dir: 'luoshu'");
  if (after !== before && !dry) fs.writeFileSync(enginePath, after, 'utf8');
}

console.log(`\n清理完成：${changedFiles} 个文件，${changedHits} 处替换${dry ? '（dry-run，未写盘）' : ''}`);
