(function (global) {
  'use strict';

  var PREFIX = 'tt_';
  var memory = {};

  function storage(type) {
    try {
      var target = type === 'session' ? sessionStorage : localStorage;
      var key = '__tt_probe__';
      target.setItem(key, '1');
      target.removeItem(key);
      return target;
    } catch (error) {
      return {
        getItem: function (key) { return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null; },
        setItem: function (key, value) { memory[key] = String(value); },
        removeItem: function (key) { delete memory[key]; }
      };
    }
  }

  var local = storage('local');
  var session = storage('session');

  function uuid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
      var random = Math.random() * 16 | 0;
      var value = char === 'x' ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function getOrCreate(target, key) {
    var value = target.getItem(PREFIX + key);
    if (!value) {
      value = uuid();
      target.setItem(PREFIX + key, value);
    }
    return value;
  }

  function getRole() {
    var explicit = local.getItem(PREFIX + 'role');
    if (explicit === 'teacher' || explicit === 'student') return explicit;
    var path = location.pathname.toLowerCase();
    return path.indexOf('teacher') >= 0 ? 'teacher' : 'student';
  }

  function isTrackingEnabled() {
    var value = local.getItem(PREFIX + 'data_improvement');
    return value === null ? true : value === 'true';
  }

  global.TTIdentity = {
    getAnonymousId: function () { return getOrCreate(local, 'anonymous_id'); },
    getSessionId: function () { return getOrCreate(session, 'session_id'); },
    rotateSession: function () {
      var value = uuid();
      session.setItem(PREFIX + 'session_id', value);
      return value;
    },
    getRole: getRole,
    setRole: function (role) {
      if (role !== 'teacher' && role !== 'student') throw new Error('role 必须为 teacher 或 student');
      local.setItem(PREFIX + 'role', role);
    },
    isTrackingEnabled: isTrackingEnabled,
    setTrackingEnabled: function (enabled) { local.setItem(PREFIX + 'data_improvement', String(!!enabled)); },
    getContext: function () {
      return {
        anonymousId: this.getAnonymousId(),
        sessionId: this.getSessionId(),
        role: getRole(),
        trackingEnabled: isTrackingEnabled()
      };
    },
    clearIdentity: function () {
      local.removeItem(PREFIX + 'anonymous_id');
      session.removeItem(PREFIX + 'session_id');
    }
  };
})(window);
