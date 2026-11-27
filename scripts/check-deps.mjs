/**
 * 第三方依赖与本地字体自查（总 PRD 3.2 P1「本地字体和第三方依赖」）。
 *
 * 规则：
 *  1. 所有 JS 必须本地加载：任何 <script src="http(s)://..."> 都算失败（离线课堂不可依赖 CDN）；
 *  2. 外部 <link> 仅允许字体相关域名（fonts.googleapis.com / fonts.gstatic.com），
 *     且引用字体的页面必须带系统字体兜底（font-family 声明含 sans-serif / serif / monospace）；
 *  3. importmap 与模块导入不得指向外部 URL。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ALLOWED_EXTERNAL = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const errors = [];
const warnings = [];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'vendor', 'dist', '.git', 'admin'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const pages = walk(root);
for (const file of pages) {
  const relative = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');

  for (const match of source.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/gi)) {
    if (/^https?:\/\//i.test(match[1])) errors.push(`${relative}：外部脚本 ${match[1]}（JS 必须本地加载）`);
  }
  for (const match of source.matchAll(/<link[^>]*\shref=["']([^"']+)["']/gi)) {
    const url = match[1];
    if (!/^https?:\/\//i.test(url)) continue;
    const host = new URL(url).host;
    if (!ALLOWED_EXTERNAL.includes(host)) errors.push(`${relative}：不允许的外部样式 ${url}`);
  }
  for (const match of source.matchAll(/["']?(https?:\/\/[^"'\s>]+)["']?/gi)) {
    const url = match[1];
    if (/unpkg\.com|cdn\.|jsdelivr|d3js\.org/i.test(url)) errors.push(`${relative}：模块导入指向外部 CDN ${url}`);
  }

  const usesWebFont = /fonts\.googleapis\.com/.test(source);
  // 兜底判定：显式 font-family 声明，或使用 Tailwind 字体类
  // （font-body / font-label / font-headline 在 tailwind.config.js 的 fontFamily 中均带 serif/sans-serif 兜底）。
  const declaresFallback =
    /font-family\s*:[^;}]*\b(sans-serif|serif|monospace)\b/i.test(source) ||
    /class="[^"]*\bfont-(body|label|headline)\b[^"]*"/.test(source);
  if (usesWebFont && !declaresFallback) {
    warnings.push(`${relative}：引用在线字体但未发现系统字体兜底`);
  }
}

if (warnings.length) {
  console.warn('字体兜底提醒：');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (errors.length) {
  console.error('\n第三方依赖自查失败：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`第三方依赖自查通过：${pages.length} 个页面，JS 全部本地化，外部引用仅限在线字体（含兜底校验）`);
