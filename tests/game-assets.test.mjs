import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const SCRIPT_PAGES = [
  'xinhai_revolution.html',
  'wuxu_reform.html',
  'industrial_revolution.html',
  'american_revolution.html',
  'game-scene.html'
];

test('角色立绘目录全部真实存在（防止立绘 404）', () => {
  for (const page of SCRIPT_PAGES) {
    const source = read(page);
    const dirs = [...source.matchAll(/src:\s*'(images\/characters\/[^']+)'/g)].map((m) => m[1]);
    assert.ok(dirs.length > 0, `${page} 未声明任何立绘 src`);
    for (const dir of dirs) {
      assert.ok(fs.existsSync(path.join(root, dir)), `${page} 指向不存在的立绘目录：${dir}`);
    }
  }
});

test('每个角色立绘目录至少有一张可用图片', () => {
  const source = read('engine.js');
  assert.ok(source.includes('charCandidatePaths'), 'engine.js 缺少立绘候选路径回退逻辑');
  for (const page of SCRIPT_PAGES) {
    const pageSource = read(page);
    const dirs = [...pageSource.matchAll(/src:\s*'(images\/characters\/[^']+)'/g)].map((m) => m[1]);
    for (const dir of new Set(dirs)) {
      const files = fs.readdirSync(path.join(root, dir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
      assert.ok(files.length > 0, `立绘目录为空：${dir}`);
    }
  }
});

test('收集品名称全部有美术资源映射，且资源真实存在', () => {
  const engineSource = read('engine.js');
  const mapBlock = engineSource.match(/var COLLECTIBLE_IMAGE_MAP = \{([\s\S]*?)\n\};/);
  assert.ok(mapBlock, 'engine.js 缺少 COLLECTIBLE_IMAGE_MAP');

  const mapping = new Map();
  for (const match of mapBlock[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    mapping.set(match[1], match[2]);
  }
  assert.ok(mapping.size > 0, '收集品映射为空');

  for (const [name, file] of mapping) {
    assert.ok(
      fs.existsSync(path.join(root, 'images/collectibles', file)),
      `收集品「${name}」映射到不存在的资源：${file}`
    );
  }

  // 剧本中出现的收集品名称必须有映射，否则玩家只会看到一个空卡片
  const used = new Set();
  for (const page of SCRIPT_PAGES) {
    const pageSource = read(page);
    for (const match of pageSource.matchAll(/type:\s*['"]collectible(?:_conditional)?['"][\s\S]{0,400}?name:\s*['"]([^'"]+)['"]/g)) {
      used.add(match[1]);
    }
  }
  assert.ok(used.size > 0, '未从剧本中解析出任何收集品');
  for (const name of used) {
    assert.ok(mapping.has(name), `收集品「${name}」缺少美术资源映射`);
  }
});

test('积分段位体系可用且递增', () => {
  const source = read('points-system.js');
  assert.ok(source.includes('PointsSystem.getLevelInfo'), 'points-system.js 缺少 getLevelInfo');
  assert.ok(source.includes('LEVEL_CONFIG'), 'points-system.js 缺少 LEVEL_CONFIG');

  const block = source.match(/var LEVEL_CONFIG = \[([\s\S]*?)\n  \];/);
  assert.ok(block, '无法解析 LEVEL_CONFIG');
  const mins = [...block[1].matchAll(/min:\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(mins.length >= 3, '段位数量不足');
  for (let i = 1; i < mins.length; i++) {
    assert.ok(mins[i] > mins[i - 1], '段位门槛必须严格递增');
  }
  assert.equal(mins[0], 0, '第一个段位门槛应为 0');
});

test('音频控制条与偏好持久化已接入', () => {
  const source = read('engine.js');
  assert.ok(source.includes('renderControlBar'), 'engine.js 缺少控制条渲染');
  assert.ok(source.includes('st_audio_prefs'), 'engine.js 未持久化音频偏好');
  assert.ok(source.includes('grantPoints'), 'engine.js 未接入积分发放');

  const voiceSource = read('voice-manager.js');
  assert.ok(voiceSource.includes('st_voice_enabled'), 'voice-manager.js 未持久化语音开关');
});

test('未被引用的媒体资产已清理（死重回归防护）', () => {
  const deadFiles = [
    'music/reform_movement/03_sacrifice.mp3',
    'fonts/SourceHanSansLite.ttf',
    'audio/voice/zh_CN-huayan-medium.onnx',
    'audio/sfx/swish_4.wav'
  ];
  for (const file of deadFiles) {
    assert.ok(!fs.existsSync(path.join(root, file)), `死重资产仍存在：${file}`);
  }
});
