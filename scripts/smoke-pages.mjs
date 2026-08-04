import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pages = [
  'index.html',
  'script-select.html',
  'script-detail.html',
  'my-learning.html',
  'game-scene.html',
  'american_revolution.html',
  'industrial_revolution.html',
  'wuxu_reform.html',
  'xinhai_revolution.html',
  'ai-mvp.html',
  'teacher-guide.html',
  'learning-review.html',
  'wish-pool.html',
  'privacy.html',
  'admin/login.html',
  'admin/index.html'
];
const errors = [];

for (const relative of pages) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    errors.push(`缺少页面：${relative}`);
    continue;
  }
  const source = fs.readFileSync(target, 'utf8');
  if (!/<html/i.test(source) || !/<body/i.test(source)) errors.push(`${relative} HTML 结构不完整`);
}

for (const relative of ['engine.js', 'data-store.js', 'script-registry.js', 'assets/js/api-client.js', 'server/start.js']) {
  if (!fs.existsSync(path.join(root, relative))) errors.push(`缺少运行文件：${relative}`);
}

if (errors.length) {
  console.error('\n页面冒烟检查失败：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`页面冒烟检查通过：${pages.length} 个页面`);
