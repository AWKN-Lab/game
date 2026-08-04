/*!
 * game-hooks.js — 剧本引擎正式事件钩子（权威数据源）
 * 在 iframe 内运行时通过 postMessage 上报给外壳（外壳持有身份与 TTEvents）；
 * 直开页面时若本页已加载 event-client.js 则直接上报。
 * DOM 点击猜测（shell-runtime.classifyClick）仅作为兜底，收到本桥事件后即被抑制。
 */
(function (global) {
  'use strict';

  var BRIDGE = 'tt-game-hooks-v1';
  var MAX_LOG = 200;
  var log = [];

  function inFrame() {
    try { return !!(global.parent && global.parent !== global); } catch (error) { return false; }
  }

  function emit(name, payload) {
    if (!name) return false;
    payload = payload || {};
    var record = { name: name, payload: payload, at: Date.now() };
    log.push(record);
    if (log.length > MAX_LOG) log.shift();

    var delivered = false;
    try {
      if (inFrame()) {
        global.parent.postMessage({ source: BRIDGE, name: name, payload: payload }, '*');
        delivered = true;
      } else if (global.TTEvents && typeof global.TTEvents.track === 'function') {
        delivered = global.TTEvents.track(name, payload) !== false;
      }
    } catch (error) {
      delivered = false;
    }

    try {
      global.dispatchEvent(new CustomEvent('tt:game-hook', { detail: record }));
    } catch (error) {}

    return delivered;
  }

  global.GameHooks = {
    SOURCE: BRIDGE,
    emit: emit,
    isBridged: inFrame,
    getLog: function () { return log.slice(); },
    clearLog: function () { log.length = 0; }
  };
})(window);
