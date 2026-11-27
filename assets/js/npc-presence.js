/*!
 * npc-presence.js — 引擎侧 NPC 在场感纯逻辑（MOD-ENGINE-04/05 消费层）
 * 回响锚点匹配与规则版模板、信任档位与叙事文案。
 * 设计边界：不引用外部史实；文案不出现数值；模板占位缺失不产出占位文案。
 * ESM 导出供 node --test 使用；同时挂 window.NpcPresence 供经典脚本 engine.js 使用。
 */

const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/**
 * 从场景标签或幕次过渡标题解析幕次编号（act_N）。
 * 支持「第三幕 · 国民议会」「第二程」等格式。
 * @param {string} sceneLabel
 * @returns {string} act_N 或空串
 */
export function actIdFromScene(sceneLabel) {
  const m = String(sceneLabel || '').match(/第([一二三四五六七八九十]+)[幕程]/);
  if (!m) return '';
  const n = CN_NUM[m[1]];
  return n ? 'act_' + n : '';
}

/**
 * 规则版回响模板：代入幕次标题与玩家选择原文。
 * 选择原文截断到 120 字；模板缺少占位时原样返回，不产出「{xxx}」占位文案。
 * @param {string} template
 * @param {string} actTitle
 * @param {string} choiceText
 * @returns {string}
 */
export function buildRuleEcho(template, actTitle, choiceText) {
  let out = String(template || '');
  if (!out) return '';
  if (out.includes('{actTitle}')) out = out.replaceAll('{actTitle}', String(actTitle || ''));
  if (out.includes('{choiceText}')) {
    out = out.replaceAll('{choiceText}', String(choiceText || '').slice(0, 120));
  }
  return out;
}

/**
 * 找出在指定幕次应触发的回响锚点。
 * @param {Array} anchors 回响锚点数组（teaching_metadata echoAnchors）
 * @param {string} actId 当前幕次编号
 * @returns {Array}
 */
export function findEchoAnchors(anchors, actId) {
  if (!Array.isArray(anchors) || !actId) return [];
  return anchors.filter((a) => a && a.echoActId === actId && a.id && a.npcId);
}

/**
 * 信任档位。口径与 npc-engine.js trustTier 一致：>=5 high，>=2 normal，否则 low。
 * @param {number} trust
 * @returns {'low'|'normal'|'high'}
 */
export function trustTierOf(trust) {
  const t = Number(trust) || 0;
  if (t >= 5) return 'high';
  if (t >= 2) return 'normal';
  return 'low';
}

/**
 * 应用信任变化，钳制到 [-5, 10]（与 npc-engine.js applyTrust 口径一致）。
 * @param {number} current
 * @param {number} delta
 * @returns {number}
 */
export function applyTrustDelta(current, delta) {
  const next = (Number(current) || 0) + (Number(delta) || 0);
  return Math.max(-5, Math.min(10, next));
}

/**
 * 信任变化的叙事文案：只说态度，不出现数值。
 * @param {string} npcName
 * @param {'low'|'normal'|'high'} tier 变化后的档位
 * @param {'up'|'down'|'flat'} direction 变化方向
 * @returns {string}
 */
export function trustNarrative(npcName, tier, direction) {
  const name = String(npcName || '对方');
  if (direction === 'up') {
    if (tier === 'high') return `${name}看你的眼神不一样了——有什么心里话，他愿意跟你说了。`;
    return `${name}的话里多了几分暖意。他开始把你当自己人。`;
  }
  if (direction === 'down') {
    if (tier === 'low') return `${name}对你多了几分提防。该说的他咽了回去，不该说的你更别想听到。`;
    return `${name}沉默了一会儿。你们之间像隔了一层东西。`;
  }
  return `${name}的神色没有变化，像在掂量什么。`;
}

/**
 * 信任门槛判定：信任不足时 NPC 以角色身份拒绝或提出条件（不置灰选项）。
 * @param {number} trust 当前信任
 * @param {{value:number}} gate 门槛配置
 * @returns {boolean} true 表示信任不足、应触发拒绝
 */
export function trustGateBlocked(trust, gate) {
  if (!gate || typeof gate.value !== 'number') return false;
  return (Number(trust) || 0) < gate.value;
}

// 浏览器侧：挂到 window 供经典脚本 engine.js 使用
if (typeof window !== 'undefined') {
  window.NpcPresence = {
    actIdFromScene,
    buildRuleEcho,
    findEchoAnchors,
    trustTierOf,
    applyTrustDelta,
    trustNarrative,
    trustGateBlocked
  };
}
