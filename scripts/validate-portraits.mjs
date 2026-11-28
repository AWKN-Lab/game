// W02 立绘引用核验：扫描各剧本页 charConfig，校验 dir/表情/ext 对应文件真实存在。
import fs from 'node:fs';

const pages = ['american_revolution.html', 'industrial_revolution.html', 'wuxu_reform.html', 'xinhai_revolution.html'];
let ok = 0;
const missing = [];

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const start = html.indexOf('charConfig:');
  if (start === -1) { missing.push(`${page}: charConfig 未找到`); continue; }
  // 取 charConfig 起到 speakerNameToKey（或下一顶级键）之间的片段，逐行解析角色条目
  const seg = html.slice(start, html.indexOf('speakerNameToKey:', start) > 0 ? html.indexOf('speakerNameToKey:', start) : start + 4000);
  for (const line of seg.split('\n')) {
    const m = line.match(/^\s*(\w+):\s*\{\s*name:[^}]*\}/);
    if (!m) continue;
    const dir = (line.match(/dir:\s*'([^']+)'/) || [])[1];
    const expr = (line.match(/defaultExpr:\s*'([^']+)'/) || [])[1];
    const ext = (line.match(/ext:\s*'([^']+)'/) || [])[1] || '.png';
    if (!dir || !expr) continue;
    const file = `images/characters/${dir}/${expr}${ext}`;
    if (fs.existsSync(file)) ok++;
    else missing.push(`${page}: ${file}`);
  }
}

if (missing.length) {
  console.error('立绘引用核验失败：');
  for (const m of missing) console.error(`- ${m}`);
  process.exit(1);
}
console.log(`立绘引用核验通过（${ok} 项全部存在）`);
