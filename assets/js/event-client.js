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
    'script.choice': ['scriptId', 'nodeId', 'choiceIndex', 'choiceText', 'actId', 'timed'],
    'script.evidence_open': ['scriptId', 'nodeId', 'evidenceId', 'evidenceTitle'],
    'script.knowledge_open': ['scriptId', 'knowledgeId', 'title'],
    'script.card': ['scriptId', 'cardId', 'action'],
    'quiz.answer': ['scriptId', 'questionId', 'choiceIndex', 'correct', 'knowledgeId'],
    'script.ending': ['scriptId', 'endingType', 'learningTier'],
    'lesson_plan.request': ['scriptId', 'duration', 'studentLevel', 'usageMode'],
    'lesson_plan.generated': ['scriptId', 'mode', 'durationMs', 'success'],
    'learning_review.request': ['scriptId', 'quizPct', 'completed'],
    'learning_review.generated': ['scriptId', 'mode', 'durationMs', 'success'],
    'feedback.submitted': ['category', 'contextType', 'scriptId'],
    'wish.submitted': ['wishType', 'scriptId', 'grade'],
    'wish.voted': ['wishId', 'active']
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
    if (global.TTIdentity && !global.TTIdentity.isTrackingEnabled()) return;
    var queue = readQueue();
    if (!queue.length) return;
    flushing = true;
    var batch = queue.slice(0, MAX_BATCH);
    var body = JSON.stringify({ events: batch });

    try {
      if (options.beacon && navigator.sendBeacon) {
        var sent = navigator.sendBeacon('/api/v1/events/batch', new Blob([body], { type: 'application/json' }));
        if (sent) {
          writeQueue(queue.slice(batch.length));
          retryDelay = 5000;
        }
        return;
      }
      if (!global.TTApi) throw new Error('API client unavailable');
      await global.TTApi.post('/events/batch', { events: batch }, { timeoutMs: 5000 });
      writeQueue(queue.slice(batch.length));
      retryDelay = 5000;
      if (readQueue().length) setTimeout(function () { flush(); }, 50);
    } catch (error) {
      retryDelay = Math.min(retryDelay * 2, 300000);
      setTimeout(function () { flush(); }, retryDelay);
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
