/*!
 * npc-chat-client.js — NPC 对话客户端
 * 依赖 api-client.js（TTApi）、identity-client.js（TTIdentity）、event-client.js（TTEvents）。
 * 服务端持有信任与记忆状态（SQLite 持久化），客户端只负责发消息、展示与埋点。
 */
(function (global) {
  'use strict';

  function track(name, payload) {
    try {
      if (global.TTEvents && typeof global.TTEvents.track === 'function') global.TTEvents.track(name, payload);
    } catch (error) { /* 埋点失败不阻断对话 */ }
  }

  async function talk(input) {
    var identity = global.TTIdentity ? global.TTIdentity.getContext() : {};
    track('npc.message_sent', { scriptId: input.scriptId, npcId: input.npcId });
    track('npc.free_input_submitted', { scriptId: input.scriptId, npcId: input.npcId });
    var started = Date.now();
    var response = await global.TTApi.post('/npc/dialogue', {
      scriptId: input.scriptId,
      npcId: input.npcId,
      message: input.message,
      trustEvent: input.trustEvent || null,
      anonymousId: identity.anonymousId || null,
      sessionId: identity.sessionId || null
    }, { timeoutMs: 30000 });
    if (!response || response.success === false) {
      throw new Error((response && response.message) || '对话失败');
    }
    track('npc.reply_generated', {
      scriptId: input.scriptId,
      npcId: input.npcId,
      mode: response.mode,
      durationMs: Date.now() - started,
      retried: !!response.retried
    });
    if (response.mode === 'rule') {
      track('npc.reply_rule_fallback', { scriptId: input.scriptId, npcId: input.npcId, fallbackReason: response.fallbackReason || 'AI_FAILED' });
    }
    if (response.trustChanged) {
      track('npc.trust_level_changed', { scriptId: input.scriptId, npcId: input.npcId, trust: response.trust, tier: response.tier });
    }
    return response;
  }

  global.TTNPChat = { talk: talk };
})(window);
