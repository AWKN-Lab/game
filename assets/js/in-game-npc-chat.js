/*!
 * in-game-npc-chat.js — 游戏内 NPC 对话浮层
 *
 * 依赖：assets/js/npc-chat-client.js（TTNPChat）、api-client.js、identity-client.js。
 * 通过 window.gameHooks 与 engine.js 通信：信任值、情绪、后果落到游戏状态。
 *
 * 剧本页通过 GAME_CONFIG.chatNpcs 声明可对话角色：
 *   [{ key, npcId, name, trustEvents: { stance: 'trust_event_name' } }]
 */
(function (global) {
  'use strict';

  var state = {
    npc: null,
    messages: [],
    busy: false,
    trust: 0,
    tier: 'low',
    emotion: null
  };

  var STANCE_CHIPS = [
    { stance: 'connect', text: '我把这两件事放一起看', label: '串联因果' },
    { stance: 'dilemma', text: '我承认这里有代价，我得自己选', label: '承认两难' },
    { stance: 'demand', text: '别绕了，直接告诉我答案', label: '要答案' }
  ];

  var EMOTION_LABELS = {
    calm: '平静', serious: '认真', excited: '激动', thinking: '思索', sad: '低落', hopeful: '期待'
  };

  function config() {
    return global.GAME_CONFIG || {};
  }

  function npcs() {
    return (config().chatNpcs || []).filter(function (n) { return n && n.npcId; });
  }

  function currentNpc() {
    return state.npc;
  }

  function tierLabel(tier) {
    return { low: '戒备', normal: '友善', high: '交心' }[tier] || '戒备';
  }

  function el(id) {
    return document.getElementById(id);
  }

  function ensurePanel() {
    var panel = el('inGameChatPanel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'inGameChatPanel';
    panel.style.cssText = 'position:fixed;right:16px;bottom:16px;width:380px;max-width:calc(100vw - 32px);z-index:2200;'
      + 'background:rgba(10,18,44,0.94);border:1px solid rgba(239,189,138,0.45);border-radius:16px;'
      + 'box-shadow:0 18px 50px rgba(0,0,0,0.55);backdrop-filter:blur(14px);color:#dbe1ff;'
      + 'font-family:"Plus Jakarta Sans",system-ui,sans-serif;display:none;flex-direction:column;overflow:hidden';
    panel.innerHTML = [
      '<div id="inGameChatHead" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(239,189,138,0.25)">',
      '  <span id="inGameChatTitle" style="font-family:"Noto Serif",serif;font-size:15px;color:#efbd8a;font-weight:bold">对话</span>',
      '  <span id="inGameChatTrust" style="font-size:11px;color:#8f909d"></span>',
      '  <span id="inGameChatEmotion" style="font-size:11px;color:#b6c4ff"></span>',
      '  <button id="inGameChatClose" style="margin-left:auto;background:transparent;border:1px solid rgba(239,189,138,0.4);color:#efbd8a;border-radius:8px;width:24px;height:22px;cursor:pointer">×</button>',
      '</div>',
      '<div id="inGameChatTabs" style="display:flex;gap:6px;padding:8px 12px;flex-wrap:wrap;border-bottom:1px solid rgba(255,255,255,0.07)"></div>',
      '<div id="inGameChatLog" style="height:230px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px"></div>',
      '<div id="inGameChatChips" style="display:flex;gap:6px;padding:0 12px 8px;flex-wrap:wrap"></div>',
      '<div style="display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(255,255,255,0.07)">',
      '  <input id="inGameChatInput" placeholder="想对他说点什么…" maxlength="200" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(239,189,138,0.3);border-radius:10px;padding:8px 10px;color:#fff;font-size:13px">',
      '  <button id="inGameChatSend" style="background:linear-gradient(135deg,#efbd8a,#5a3912);border:none;color:#472a03;border-radius:10px;padding:8px 14px;font-weight:bold;cursor:pointer;font-size:13px">发送</button>',
      '</div>'
    ].join('');
    document.body.appendChild(panel);

    el('inGameChatClose').addEventListener('click', function () { close(); });
    el('inGameChatSend').addEventListener('click', function () { send(); });
    el('inGameChatInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });
    return panel;
  }

  function renderTabs() {
    var box = el('inGameChatTabs');
    if (!box) return;
    box.innerHTML = '';
    npcs().forEach(function (npc) {
      var b = document.createElement('button');
      var active = currentNpc() && currentNpc().npcId === npc.npcId;
      b.textContent = npc.name;
      b.style.cssText = 'background:' + (active ? 'rgba(239,189,138,0.22)' : 'transparent')
        + ';border:1px solid ' + (active ? '#efbd8a' : 'rgba(239,189,138,0.3)')
        + ';color:' + (active ? '#efbd8a' : '#9aa3c4') + ';border-radius:16px;padding:3px 10px;font-size:12px;cursor:pointer';
      b.addEventListener('click', function () { selectNpc(npc); });
      box.appendChild(b);
    });
  }

  function renderChips() {
    var box = el('inGameChatChips');
    if (!box) return;
    box.innerHTML = '';
    var npc = currentNpc();
    if (!npc) return;
    STANCE_CHIPS.forEach(function (chip) {
      var event = (npc.trustEvents || {})[chip.stance];
      if (!event) return;
      var b = document.createElement('button');
      b.textContent = chip.label;
      b.title = chip.text;
      b.style.cssText = 'background:rgba(182,196,255,0.12);border:1px solid rgba(182,196,255,0.35);color:#b6c4ff;border-radius:14px;padding:3px 10px;font-size:11px;cursor:pointer';
      b.addEventListener('click', function () { send(chip.text, event); });
      box.appendChild(b);
    });
  }

  function pushMessage(who, text, extra) {
    var log = el('inGameChatLog');
    if (!log) return;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'max-width:86%;padding:8px 10px;border-radius:12px;font-size:13px;line-height:1.65;'
      + (who === 'me'
        ? 'align-self:flex-end;background:linear-gradient(135deg,rgba(239,189,138,0.22),rgba(90,57,18,0.3));border:1px solid rgba(239,189,138,0.35);color:#f4e9d8'
        : 'align-self:flex-start;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#e6e9f7');
    wrap.textContent = text;
    log.appendChild(wrap);
    if (extra) {
      var tag = document.createElement('div');
      tag.style.cssText = 'align-self:flex-end;font-size:11px;color:#8f909d;margin-top:-4px';
      tag.textContent = extra;
      log.appendChild(tag);
    }
    log.scrollTop = log.scrollHeight;
  }

  function renderStatus() {
    var t = el('inGameChatTitle');
    var tr = el('inGameChatTrust');
    var em = el('inGameChatEmotion');
    var npc = currentNpc();
    if (t) t.textContent = npc ? npc.name : '对话';
    if (tr) tr.textContent = '信任 ' + state.trust + '（' + tierLabel(state.tier) + '）';
    if (em) em.textContent = state.emotion ? ('情绪：' + (EMOTION_LABELS[state.emotion] || state.emotion)) : '';
  }

  function selectNpc(npc) {
    state.npc = npc;
    state.messages = [];
    state.trust = 0;
    state.tier = 'low';
    state.emotion = null;
    var log = el('inGameChatLog');
    if (log) log.innerHTML = '';
    pushMessage('npc', '（' + npc.name + '看着你，等你先开口。）');
    renderTabs();
    renderChips();
    renderStatus();
  }

  function applyResponse(response) {
    state.trust = typeof response.trust === 'number' ? response.trust : state.trust;
    state.tier = response.tier || state.tier;
    state.emotion = response.emotion || state.emotion;
    renderStatus();

    var hooks = global.gameHooks;
    var npc = currentNpc();
    if (hooks && npc) {
      if (typeof hooks.applyNpcTrust === 'function') {
        hooks.applyNpcTrust(npc.npcId, state.trust, state.tier, npc);
      }
      if (typeof hooks.applyNpcEmotion === 'function') {
        hooks.applyNpcEmotion(npc.npcId, state.emotion, npc);
      }
      if (typeof hooks.applyNpcConsequence === 'function' && response.consequence) {
        hooks.applyNpcConsequence(npc.npcId, response.consequence, npc);
      }
    }

    var extras = [];
    if (response.mode === 'rule') extras.push('（规则版回复）');
    if (response.consequence && Object.keys(response.consequence).length) {
      var parts = [];
      for (var key in response.consequence) {
        var delta = response.consequence[key];
        parts.push((global.TTConsequenceLabels && global.TTConsequenceLabels[key]) || key);
        parts.push(' ' + (delta > 0 ? '+' : '') + delta);
      }
      extras.push('状态变化：' + parts.join(' / '));
    }
    pushMessage('npc', response.reply || '……', extras.join(' · '));
  }

  function send(presetText, trustEvent) {
    if (state.busy) return;
    var input = el('inGameChatInput');
    var text = (presetText || (input ? input.value : '') || '').trim();
    if (!text) return;
    if (!global.TTNPChat || typeof global.TTNPChat.talk !== 'function') {
      pushMessage('npc', '（对话服务还没接上，稍后再试。）');
      return;
    }
    state.busy = true;
    pushMessage('me', text);
    if (input) input.value = '';
    var npc = currentNpc();
    var cfg = config();
    global.TTNPChat.talk({
      scriptId: cfg.scriptId || npc.scriptId || 'global',
      npcId: npc.npcId,
      message: text,
      trustEvent: trustEvent || null
    }).then(function (response) {
      applyResponse(response || {});
    }).catch(function (error) {
      pushMessage('npc', '（' + ((error && error.message) || '对话失败') + '）');
    }).then(function () {
      state.busy = false;
    });
  }

  function open(npcId) {
    var panel = ensurePanel();
    panel.style.display = 'flex';
    var list = npcs();
    if (!list.length) return;
    var target = list[0];
    if (npcId) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].npcId === npcId || list[i].key === npcId) { target = list[i]; break; }
      }
    }
    selectNpc(target);
    var input = el('inGameChatInput');
    if (input) input.focus();
  }

  function close() {
    var panel = el('inGameChatPanel');
    if (panel) panel.style.display = 'none';
  }

  function isOpen() {
    var panel = el('inGameChatPanel');
    return !!panel && panel.style.display !== 'none';
  }

  function toggle() {
    if (isOpen()) close(); else open();
  }

  global.TTInGameChat = { open: open, close: close, toggle: toggle, isOpen: isOpen };
})(window);
