/*!
 * event-initiator.js — 埋点 initiator 默认分类（ENG-16 缺口 B）
 * 区分「玩家自主发起」（initiator='player'）与「剧情强制触发」（initiator='script'），
 * 供北极星指标「自主有效探索率」使用，避免剧情必经节点把自主率虚高。
 * 分类边界：
 * - player：script.card（主动用卡）、npc.message_sent / npc.free_input_submitted（主动提问）；
 * - script：script.choice（必经选择）、script.evidence_open、script.knowledge_open、quiz.*、
 *   script.ending、npc.echo_referenced、npc.trust_level_changed 等剧情驱动事件；
 * - 未知事件一律按 'script' 计（保守口径，不虚高自主率）；
 * - payload 显式传 initiator='player'|'script' 时以调用方为准，其余非法值覆盖为默认。
 * ESM 导出供 node --test 与 server/app.js 使用；同时挂 window.TTEventInitiator 供经典脚本 event-client.js 使用。
 */

const PLAYER_EVENTS = {
  'script.card': true,
  'npc.message_sent': true,
  'npc.free_input_submitted': true
};

/**
 * 按事件名取默认 initiator 分类。
 * @param {string} name 事件名
 * @returns {'player'|'script'} 默认发起方
 */
export function defaultInitiator(name) {
  return PLAYER_EVENTS[name] ? 'player' : 'script';
}

/**
 * 为事件负载补默认 initiator；调用方显式传合法值时不覆盖。
 * @param {string} name 事件名
 * @param {object} payload 事件负载（原样返回；非对象时按空对象处理）
 * @returns {object} 注入 initiator 后的负载
 */
export function applyInitiator(name, payload) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  if (safePayload.initiator !== 'player' && safePayload.initiator !== 'script') {
    safePayload.initiator = defaultInitiator(name);
  }
  return safePayload;
}

// 浏览器侧：挂到 window 供经典脚本 event-client.js 使用
if (typeof window !== 'undefined') {
  window.TTEventInitiator = { defaultInitiator, applyInitiator };
}
