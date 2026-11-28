(function (global) {
  'use strict';

  var STORAGE_KEY = 'tt_event_queue_v1';
  var MAX_QUEUE = 200;
  var MAX_BATCH = 20;
  var FLUSH_INTERVAL = 5000;
  var retryDelay = 5000;
  var flushTimer = null;
  var flushing = false;

  var catalog = {
    'page.view': ['page', 'referrerPath', 'scriptId', 'role'],
    'script.open': ['scriptId', 'source'],
    'script.start': ['scriptId', 'mode'],
    'script.act_enter': ['scriptId', 'actId', 'actTitle'],
    'script.choice': ['scriptId', 'nodeId', 'choiceIndex', 'choiceText', 'actId', 'timed', 'initiator'],
    'script.evidence_open': ['scriptId', 'nodeId', 'evidenceId', 'evidenceTitle', 'initiator'],
    'script.knowledge_open': ['scriptId', 'knowledgeId', 'title', 'initiator'],
    'script.card': ['scriptId', 'cardId', 'action', 'initiator'],
    'quiz.answer': ['scriptId', 'questionId', 'choiceIndex', 'correct', 'knowledgeId', 'initiator'],
    'quiz.complete': ['scriptId', 'score', 'total', 'pct', 'learningTier', 'initiator'],
    'script.ending': ['scriptId', 'endingType', 'learningTier', 'initiator'],
    'lesson_plan.request': ['scriptId', 'duration', 'studentLevel', 'usageMode'],
    'lesson_plan.generated': ['scriptId', 'mode', 'durationMs', 'success'],
    'learning_review.request': ['scriptId', 'quizPct', 'completed'],
    'learning_review.generated': ['scriptId', 'mode', 'durationMs', 'success'],
    'feedback.submitted': ['category', 'contextType', 'scriptId'],
    'wish.submitted': ['wishType', 'scriptId', 'grade'],
    'wish.voted': ['wishId', 'active'],
    'npc.dialogue_started': ['scriptId', 'npcId'],
    'npc.message_sent': ['scriptId', 'npcId', 'initiator'],
    'npc.reply_generated': ['scriptId', 'npcId', 'mode', 'durationMs', 'retried'],
    'npc.reply_rule_fallback': ['scriptId', 'npcId', 'fallbackReason'],
    'npc.free_input_submitted': ['scriptId', 'npcId', 'initiator'],
    'npc.fact_check_flagged': ['scriptId', 'npcId'],
    'npc.echo_referenced': ['scriptId', 'npcId', 'initiator'],
    'npc.trust_level_changed': ['scriptId', 'npcId', 'trust', 'tier', 'initiator']
  };

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
  }

  function readQueue() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function writeQueue(queue) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))); } catch (error) {}
  }

  // W04 §5.3：按最新队列按 eventId 结算本批——有服务端结果即结算（送达/重复确认/永久拒绝均不再重试），无结果保留，避免旧快照覆盖请求期间新增记录
  function settleQueue(batchIds, resultMap) {
    var fresh = readQueue();
    var idSet = {};
    batchIds.forEach(function (id) { idSet[id] = true; });
    var kept = fresh.filter(function (item) {
      if (!item || !idSet[item.eventId]) return true;
      return !resultMap[item.eventId];
    });
    if (kept.length !== fresh.length) writeQueue(kept);
    return fresh.length - kept.length;
  }

  function sanitize(name, payload) {
    var keys = catalog[name];
    if (!keys) return null;
    var clean = {};
    payload = payload || {};
    keys.forEach(function (key) {
      var value = payload[key];
      if (value === undefined || value === null) return;
      if (typeof value === 'string') clean[key] = value.slice(0, 240);
      else if (typeof value === 'number' || typeof value === 'boolean') clean[key] = value;
    });
    return clean;
  }

  function createEvent(name, payload) {
    var identity = global.TTIdentity && global.TTIdentity.getContext ? global.TTIdentity.getContext() : {};
    return {
      eventId: uuid(),
      name: name,
      occurredAt: new Date().toISOString(),
      anonymousId: identity.anonymousId || null,
      sessionId: identity.sessionId || null,
      role: identity.role || 'student',
      page: location.pathname,
      payload: sanitize(name, payload)
    };
  }

  async function flush(options) {
    options = options || {};
    if (flushing) return;
    // W04 §5.3：撤回授权即清除待发记录，不追传关闭期间事件
    if (global.TTIdentity && !global.TTIdentity.isTrackingEnabled()) {
      if (readQueue().length) writeQueue([]);
      return;
    }
    var queue = readQueue();
    if (!queue.length) return;
    flushing = true;
    var batch = queue.slice(0, MAX_BATCH);
    var batchIds = batch.map(function (item) { return item.eventId; });
    var body = JSON.stringify({ events: batch });

    try {
      if (options.beacon && navigator.sendBeacon) {
        // W04 §5.3：sendBeacon true 仅代表浏览器已排队，不代表送达——保留原 ID 不删，下次 flush 验证上传，服务端按 eventId 幂等去重
        navigator.sendBeacon('/api/v1/events/batch', new Blob([body], { type: 'application/json' }));
        return;
      }
      if (!global.TTApi) throw new Error('API client unavailable');
      var response = await global.TTApi.post('/events/batch', { events: batch }, { timeoutMs: 5000 });
      var resultMap = {};
      if (response && Array.isArray(response.results)) {
        response.results.forEach(function (item) { if (item && item.eventId) resultMap[item.eventId] = item; });
      }
      settleQueue(batchIds, resultMap);
      retryDelay = 5000;
      if (readQueue().length) setTimeout(function () { flush(); }, 50);
    } catch (error) {
      // W04 §5.3：区分可重试与永久拒绝——4xx（429 除外）重试无意义，整批丢弃防坏事件卡住队列；网络/5xx/429 退避重试
      var status = error && error.status || 0;
      if (status >= 400 && status < 500 && status !== 429) {
        var rejectedMap = {};
        batchIds.forEach(function (id) { rejectedMap[id] = { accepted: false }; });
        settleQueue(batchIds, rejectedMap);
      } else {
        retryDelay = Math.min(retryDelay * 2, 300000);
        setTimeout(function () { flush(); }, retryDelay);
      }
    } finally {
      flushing = false;
    }
  }

  function schedule() {
    if (flushTimer) return;
    flushTimer = setInterval(function () { flush(); }, FLUSH_INTERVAL);
  }

  function track(name, payload) {
    if (!catalog[name]) return false;
    if (global.TTIdentity && !global.TTIdentity.isTrackingEnabled()) return false;
    // ENG-16 缺口 B：探索类事件补默认 initiator（player=自主发起 / script=剧情强制），调用方显式传值优先
    if (global.TTEventInitiator && typeof global.TTEventInitiator.applyInitiator === 'function') {
      payload = global.TTEventInitiator.applyInitiator(name, payload);
    }
    var event = createEvent(name, payload);
    if (!event.payload) return false;
    var queue = readQueue();
    queue.push(event);
    writeQueue(queue);
    if (queue.length >= MAX_BATCH) flush();
    schedule();
    return true;
  }

  function inferScriptId() {
    try {
      var params = new URLSearchParams(location.search);
      if (params.get('script')) return params.get('script');
      if (params.get('id')) return params.get('id');
      if (global.GAME_CONFIG && global.GAME_CONFIG.scriptId) return global.GAME_CONFIG.scriptId;
      var file = location.pathname.split('/').pop();
      var map = {
        'game-scene.html': 'french_revolution',
        'american_revolution.html': 'american_revolution',
        'industrial_revolution.html': 'industrial_revolution',
        'wuxu_reform.html': 'wuxu_reform',
        'xinhai_revolution.html': 'xinhai_revolution'
      };
      return map[file] || null;
    } catch (error) { return null; }
  }

  function trackPageView() {
    track('page.view', {
      page: location.pathname,
      referrerPath: document.referrer ? new URL(document.referrer).pathname : '',
      scriptId: inferScriptId(),
      role: global.TTIdentity && global.TTIdentity.getRole ? global.TTIdentity.getRole() : 'student'
    });
  }

  global.TTEvents = {
    track: track,
    flush: flush,
    inferScriptId: inferScriptId,
    getQueueSize: function () { return readQueue().length; },
    clearQueue: function () { writeQueue([]); },
    getCatalog: function () { return Object.keys(catalog); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', trackPageView);
  else trackPageView();
  global.addEventListener('pagehide', function () { flush({ beacon: true }); });
  schedule();
})(window);
