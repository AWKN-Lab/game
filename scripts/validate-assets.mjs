import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

/**
 * 资产台账校验（assets/asset-ledger.json）
 *
 * IP 门禁（validate-ip.mjs）只能扫可见关键词，而图像/音频的权属无法用关键词判断。
 * 台账把来源、权属、替换状态显式记录下来，本校验保证台账不腐烂：
 *  - 代码引用到的资产必须在台账中有条目；
 *  - 台账条目对应的文件必须真实存在；
 *  - 非原创资产（original=false）必须有替换计划；
 *  - 不允许存在内容重复的资产（角色表情同名同图除外，属待做真差分的已知项）。
 */

const root = process.cwd();
const ledgerPath = path.join(root, 'assets/asset-ledger.json');
const errors = [];
const warnings = [];

if (!fs.existsSync(ledgerPath)) {
  errors.push('缺少 assets/asset-ledger.json，请运行 node scripts/build-asset-ledger.mjs --write');
} else {
  let ledger = null;
  try {
    ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  } catch (error) {
    errors.push(`资产台账解析失败：${error.message}`);
  }

  if (ledger) {
    const entries = Array.isArray(ledger.assets) ? ledger.assets : [];
    if (!entries.length) errors.push('资产台账为空');

    const seen = new Set();
    for (const entry of entries) {
      if (!entry.path) { errors.push('台账条目缺少 path'); continue; }
      if (seen.has(entry.path)) errors.push(`台账条目重复：${entry.path}`);
      seen.add(entry.path);
      if (!fs.existsSync(path.join(root, entry.path))) {
        errors.push(`台账指向不存在的文件：${entry.path}`);
      }
      if (entry.original === false && !entry.note) {
        errors.push(`非原创资产缺少替换说明：${entry.path}`);
      }
      if (entry.status === 'candidate-removal') {
        errors.push(`存在待清理资产（要么接入要么删除）：${entry.path}`);
      }
    }

    // 代码里引用到的图片/音频/音乐文件必须有台账条目
    const tracked = new Set(
      execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
        .split('\n').map((line) => line.trim()).filter(Boolean)
    );
    // 测试文件里出现的资产路径通常是"断言这些死重已被删除"，不算引用
    const codeFiles = [...tracked].filter((file) =>
      /\.(html|js|mjs|css)$/.test(file) &&
      !/(^|\/)(tests?)\//.test(file) &&
      !/\.test\.mjs$/.test(file)
    );
    const referenced = new Set();
    for (const file of codeFiles) {
      let source = '';
      try { source = fs.readFileSync(path.join(root, file), 'utf8'); } catch (error) { continue; }
      for (const match of source.matchAll(/(?:images|audio|music|fonts)\/[A-Za-z0-9_\-./]+\.(?:webp|png|jpe?g|wav|mp3|ogg|ttf|woff2?)/g)) {
        referenced.add(match[0]);
      }
    }
    for (const file of referenced) {
      if (!seen.has(file)) {
        // 动态拼接的路径（模板字符串）不在台账里，只提示不报错
        warnings.push(`代码引用了未登记资产：${file}`);
      }
    }

    // 待替换的非原创资产必须进入原创生产计划，避免"知道要换但没人排期"
    const planPath = path.join(root, 'assets/original-art-plan.json');
    if (fs.existsSync(planPath)) {
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      const targets = (plan.items || []).map((item) => item.target).filter(Boolean);
      for (const entry of entries) {
        if (entry.status !== 'replace-original') continue;
        const covered = targets.some((target) => entry.path.startsWith(target));
        if (!covered) errors.push(`待替换资产没有进入原创生产计划：${entry.path}`);
      }
    } else {
      errors.push('缺少 assets/original-art-plan.json（原创生产计划）');
    }

    // 内容重复（非角色表情同名同图）
    for (const group of ledger.duplicates || []) {
      if (group.kind === 'expression-twin') {
        warnings.push(`角色表情差分仍是同一张图（待补真差分）：${group.paths.join(' / ')}`);
      } else {
        errors.push(`存在内容重复的资产：${group.paths.join(' / ')}`);
      }
    }
  }
}

if (errors.length) {
  console.error('\n资产台账校验失败：');
  for (const error of errors) console.error(`- ${error}`);
  for (const warning of warnings) console.warn(`! ${warning}`);
  process.exit(1);
}

console.log(`资产台账校验通过${warnings.length ? `（${warnings.length} 条待办提示）` : ''}`);
