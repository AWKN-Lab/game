/*!
 * npc-chat-client.js — NPC 对话客户端
 * 依赖 api-client.js（TTApi）与 identity-client.js（TTIdentity）。
 * 服务端持有信任与记忆状态（SQLite 持久化），客户端只负责发消息与展示。
 */
(function (global) {
  'use strict';

  async function talk(input) {
    var identity = global.TTIdentity ? global.TTIdentity.getContext() : {};
    var response = await global.TTApi.post('/npc-chat', {
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
    return response;
  }

  global.TTNPChat = { talk: talk };
})(window);
