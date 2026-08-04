import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = [
  'data/teaching_metadata.json',
  'data/ai_prompts.json',
  'data/rule_templates.json',
  'data/character_aliases.json'
];
const errors = [];

for (const relative of requiredFiles) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    errors.push(`缺少 ${relative}`);
    continue;
  }
  try {
    const value = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (!value || typeof value !== 'object') errors.push(`${relative} 必须为对象或数组`);
  } catch (error) {
    errors.push(`${relative} JSON 解析失败：${error.message}`);
  }
}

const metadataPath = path.join(root, 'data/teaching_metadata.json');
if (fs.existsSync(metadataPath)) {
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const requiredScripts = ['french_revolution', 'american_revolution', 'industrial_revolution', 'wuxu_reform', 'xinhai_revolution'];
  for (const scriptId of requiredScripts) {
    const item = metadata.scripts?.[scriptId];
    if (!item) {
      errors.push(`教学元数据缺少剧本：${scriptId}`);
      continue;
    }
    if (!Array.isArray(item.objectives) || !item.objectives.length) errors.push(`${scriptId} 缺少 objectives`);
    if (!Array.isArray(item.acts) || !item.acts.length) errors.push(`${scriptId} 缺少 acts`);
    if (!Array.isArray(item.boardOutline) || !item.boardOutline.length) errors.push(`${scriptId} 缺少 boardOutline`);
  }
}

if (errors.length) {
  console.error('\n提示词与教学配置校验失败：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('提示词与教学配置校验通过');
