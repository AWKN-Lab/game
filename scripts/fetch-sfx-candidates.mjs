#!/usr/bin/env node
/**
 * fetch-sfx-candidates.mjs — 按 manifest 下载音效候选素材到本地缓存（不进仓库）
 *
 * 用法：
 *   node scripts/fetch-sfx-candidates.mjs                 # 下载到 .cache/sfx-audition/audio
 *   node scripts/fetch-sfx-candidates.mjs --copy-existing  # 同时把仓库现有素材复制进来做对照
 *
 * 候选清单：docs/audition/sfx/manifest.json
 * 试听页：  docs/audition/sfx/index.html（用本地静态服务器打开）
 *
 * 说明：素材来自 OpenGameArt 与 Kenney（CC0）镜像仓库；本脚本只做下载与缓存，
 * 是否替换仓库内 audio/sfx 需人工试听后决定。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const manifestPath = path.join(root, 'docs/audition/sfx/manifest.json');
const outDir = path.join(root, 'docs/audition/sfx/audio');
const KENNEY_REPO = 'zuujis-cc0/opengameart-kenney-sound-effect';
const KENNEY_ZIP = 'https://codeload.github.com/' + KENNEY_REPO + '/zip/refs/heads/main';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

if (!fs.existsSync(manifestPath)) {
  console.error('缺少 docs/audition/sfx/manifest.json');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function curl(url, dest) {
  try {
    execFileSync('curl', ['-sSL', '-A', UA, '--max-time', '180', '-o', dest, url], { stdio: 'ignore' });
    return fs.existsSync(dest) && fs.statSync(dest).size > 1000;
  } catch (error) {
    return false;
  }
}

// Kenney 候选来自镜像仓库压缩包：只解压需要的文件
let kenneyZipPath = null;
function ensureKenneyZip() {
  if (kenneyZipPath) return kenneyZipPath;
  const zipPath = path.join(root, '.cache/sfx-audition/kenney.zip');
  if (!fs.existsSync(zipPath)) {
    console.log('下载 Kenney 镜像包…');
    if (!curl(KENNEY_ZIP, zipPath)) return null;
  }
  kenneyZipPath = zipPath;
  return zipPath;
}

function extractFromZip(zipPath, entryPath, dest) {
  const prefix = `${KENNEY_REPO.split('/')[1]}-main/`;
  const full = prefix + entryPath;
  try {
    execFileSync('unzip', ['-p', zipPath, full], { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (error) { /* unzip -p 失败时走备选路径 */ }
  try {
    execFileSync('bash', ['-c', `unzip -p "${zipPath}" "${full}" > "${dest}"`], { stdio: 'ignore' });
    return fs.existsSync(dest) && fs.statSync(dest).size > 1000;
  } catch (error) {
    return false;
  }
}

let ok = 0;
let fail = 0;
for (const item of manifest) {
  const dest = path.join(outDir, item.file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) { ok++; continue; }
  if (item.source === 'Kenney CC0' && item.zipPath) {
    const zipPath = ensureKenneyZip();
    if (zipPath && extractFromZip(zipPath, item.zipPath, dest)) { ok++; continue; }
  } else if (item.url) {
    const url = String(item.url).trim();
    if (curl(url, dest)) { ok++; continue; }
  } else if (item.source === '仓库现状') {
    const src = path.join(root, 'audio/sfx', item.file.replace(/^现有_/, ''));
    if (fs.existsSync(src)) { fs.copyFileSync(src, dest); ok++; continue; }
  }
  fail++;
  console.warn('  跳过：', item.file);
}
console.log(`下载完成：成功 ${ok}，失败 ${fail}，目录 ${path.relative(root, outDir)}`);
console.log('试听：在 docs/audition/sfx 目录下起一个静态服务器后打开 index.html（音频已放在同目录 audio/ 下）');
