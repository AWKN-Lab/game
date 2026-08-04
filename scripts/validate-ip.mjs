/**
 * 第三方角色 IP 门禁
 * 保证仓库内（git 跟踪范围）不出现任何第三方角色可见文本或资源目录。
 * 内部 ID（fulina / hutao）允许在兜底逻辑中出现，但不得作为用户可见内容。
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const errors = [];

// 用户可见的第三方 IP 关键词（一经出现即失败）
const FORBIDDEN_TEXT = [
  '\u8299\u5b81\u5a1c', // 芙宁娜
  '\u80e1\u6843',       // 胡桃
  '\u67ab\u4e39',       // 枫丹
  '\u5f80\u751f\u5802', // 往生堂
  '\u539f\u795e',       // 原神
  '\u63d0\u74e6\u7279', // 提瓦特
  '\u7483\u6708',       // 璃月
  '\u8499\u5fb7',       // 蒙德
  '\u6d3e\u8499',       // 派蒙
  'Furina',
  'Hu Tao'
];

// 不得被 git 跟踪的历史遗留资源目录
const FORBIDDEN_PATHS = [
  'th/',
  'th_hutao/',
  'yy/',
  'images/characters/fulina/',
  'images/characters/hutao/',
  'images/characters/klee/',
  '.rpy'
];

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.ttf', '.woff', '.woff2',
  '.mp3', '.wav', '.onnx', '.mp4', '.zip', '.pdf'
]);

let tracked = [];
try {
  tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
} catch (error) {
  console.warn('IP 门禁：无法读取 git 索引，跳过检查（%s）', error.message);
  process.exit(0);
}

for (const file of tracked) {
  for (const badPath of FORBIDDEN_PATHS) {
    if (file.includes(badPath)) errors.push(`第三方 IP 遗留资源被 git 跟踪：${file}`);
  }
  const ext = path.extname(file).toLowerCase();
  if (BINARY_EXT.has(ext)) continue;
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  let content = '';
  try { content = fs.readFileSync(full, 'utf8'); } catch { continue; }
  // 门禁脚本自身保存的是转义码，不参与匹配
  if (file === 'scripts/validate-ip.mjs') continue;
  for (const word of FORBIDDEN_TEXT) {
    if (content.includes(word)) errors.push(`${file} 含第三方 IP 关键词：${word}`);
  }
}

if (errors.length) {
  console.error('\n第三方角色 IP 门禁失败：');
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  console.error('\n处理方式：改为原创角色（子衿 / 洛书），或将遗留资源移出 git 索引并写入 .gitignore。');
  process.exit(1);
}

console.log(`第三方 IP 门禁通过（扫描 ${tracked.length} 个受跟踪文件）`);
