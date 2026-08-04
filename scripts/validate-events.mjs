import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const target = path.join(process.cwd(), 'data', 'event_catalog.json');
const errors = [];

if (!fs.existsSync(target)) {
  errors.push('缺少 data/event_catalog.json');
} else {
  try {
    const catalog = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (!Array.isArray(catalog.events)) errors.push('event_catalog.events 必须为数组');
    const names = (catalog.events || []).map((item) => item.name);
    if (new Set(names).size !== names.length) errors.push('事件名称重复');
    const forbidden = new Set(['password', 'email', 'phone', 'realName', 'localStorage', 'screenRecording', 'keystrokes']);
    for (const event of catalog.events || []) {
      if (!event.name || !/^[a-z0-9_.-]+$/.test(event.name)) errors.push(`非法事件名：${event.name}`);
      if (!Array.isArray(event.allowedPayloadKeys)) errors.push(`${event.name} 缺少 allowedPayloadKeys`);
      for (const key of event.allowedPayloadKeys || []) {
        if (forbidden.has(key)) errors.push(`${event.name} 包含禁止采集字段：${key}`);
      }
    }
  } catch (error) {
    errors.push(`event_catalog.json 解析失败：${error.message}`);
  }
}

if (errors.length) {
  console.error('\n事件目录校验失败：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('事件目录校验通过');
