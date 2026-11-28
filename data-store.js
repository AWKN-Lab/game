/**
 * 时空剧场 - localStorage 持久化存储模块
 *
 * 提供游戏进度、结局、收集品、错题本、知识点掌握度、游戏时长等数据的持久化存储。
 * 所有 localStorage 键均使用 "st_" 命名空间前缀。
 * 当 localStorage 不可用时，自动回退到内存存储并输出控制台警告。
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 内部：检测 localStorage 可用性，不可用时回退到内存存储
  // ---------------------------------------------------------------------------
  var _storage;
  try {
    var _testKey = '__st_test__';
    localStorage.setItem(_testKey, '1');
    localStorage.removeItem(_testKey);
    _storage = localStorage;
  } catch (e) {
    console.warn('[DataStore] localStorage 不可用，将使用内存存储。页面刷新后数据会丢失。');
    _storage = (function () {
      var _mem = {};
      return {
        getItem: function (k) { return _mem.hasOwnProperty(k) ? _mem[k] : null; },
        setItem: function (k, v) { _mem[k] = String(v); },
        removeItem: function (k) { delete _mem[k]; },
        clear: function () { _mem = {}; }
      };
    })();
  }

  // ---------------------------------------------------------------------------
  // 内部工具函数
  // ---------------------------------------------------------------------------

  /** 命名空间前缀 */
  var PREFIX = 'st_';

  /**
   * 生成带命名空间的键名
   * @param {string} key - 原始键名
   * @returns {string} 带前缀的键名
   */
  function _key(key) {
    return PREFIX + key;
  }

  // ---------------------------------------------------------------------------
  // D2 存档互斥：同剧本跨标签页写锁（ENG-15 D2 建议口径——禁止静默覆盖）
  // 锁结构 {tabId, ts} 存于 st_lock_<scriptId>；新鲜度 TTL 内视为他签活跃
  // ---------------------------------------------------------------------------
  var LOCK_TTL_MS = 8000;
  var _tabId = (function () {
    var id = 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    try {
      var saved = sessionStorage.getItem('st_tab_id');
      if (saved) return saved;
      sessionStorage.setItem('st_tab_id', id);
    } catch (e) { /* sessionStorage 不可用时每次刷新换新 id，互斥退化为单页内生效 */ }
    return id;
  })();

  function _readLock(scriptId) {
    return _get('lock_' + scriptId, null);
  }

  function _writeLock(scriptId) {
    _set('lock_' + scriptId, { tabId: _tabId, ts: Date.now() });
  }

  function _lockIsFresh(lock) {
    return !!(lock && lock.tabId && (Date.now() - lock.ts) < LOCK_TTL_MS);
  }

  /**
   * 安全地将 JSON 字符串解析为对象
   * @param {string} str - JSON 字符串
   * @param {*} fallback - 解析失败时的默认返回值
   * @returns {*} 解析结果或默认值
   */
  function _parse(str, fallback) {
    if (str === null || str === undefined) return fallback;
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  }

  /**
   * 将值序列化为 JSON 字符串并存入 storage
   * @param {string} key - 原始键名
   * @param {*} value - 要存储的值
   */
  function _set(key, value) {
    _storage.setItem(_key(key), JSON.stringify(value));
  }

  /**
   * 从 storage 中读取并反序列化
   * @param {string} key - 原始键名
   * @param {*} fallback - 键不存在时的默认返回值
   * @returns {*} 反序列化后的值或默认值
   */
  function _get(key, fallback) {
    return _parse(_storage.getItem(_key(key)), fallback);
  }

  // ---------------------------------------------------------------------------
  // 公开 API
  // ---------------------------------------------------------------------------
  var DataStore = {};

  /**
   * 保存游戏进度
   *
   * @param {Object} data - 游戏进度数据
   * @param {string} data.scriptId - 剧本 ID
   * @param {number} data.dialogIndex - 当前对话索引
   * @param {Object} [data.gameValues] - 游戏变量键值对
   * @param {string[]} [data.collectedItems] - 已收集物品 ID 列表
   * @param {string} [data.currentAct] - 当前幕
   */
  DataStore.saveProgress = function (data) {
    if (!data || !data.scriptId) return;
    // D2 存档互斥守卫：其他标签页持有新鲜写锁时拒绝写入，禁止静默覆盖（ENG-15 D2）
    var lock = _get('lock_' + data.scriptId, null);
    if (lock && lock.tabId && lock.tabId !== _tabId && (Date.now() - lock.ts) < LOCK_TTL_MS) {
      DataStore._blockedSaves = (DataStore._blockedSaves || 0) + 1;
      if (typeof DataStore.onSaveBlocked === 'function') {
        try { DataStore.onSaveBlocked(data.scriptId, lock.tabId); } catch (e) { /* 提示层异常不阻断存档流程 */ }
      }
      return;
    }
    // 增量合并：未传字段沿用上次存档，避免部分保存丢失 npcFate / choicesByAct / npcTrust
    var prev = _get('progress_' + data.scriptId, null) || {};
    _set('progress_' + data.scriptId, {
      scriptId: data.scriptId,
      dialogIndex: data.dialogIndex || 0,
      gameValues: data.gameValues || {},
      collectedItems: data.collectedItems || [],
      currentAct: data.currentAct || '',
      npcFate: data.npcFate !== undefined ? data.npcFate : (prev.npcFate || null),
      choicesByAct: data.choicesByAct !== undefined ? data.choicesByAct : (prev.choicesByAct || {}),
      npcTrust: data.npcTrust !== undefined ? data.npcTrust : (prev.npcTrust || {}),
      savedAt: Date.now()
    });
  };

  /**
   * 加载指定剧本的游戏进度
   *
   * @param {string} scriptId - 剧本 ID
   * @returns {Object|null} 游戏进度对象，不存在时返回 null
   */
  DataStore.loadProgress = function (scriptId) {
    return _get('progress_' + scriptId, null);
  };

  // ---------------------------------------------------------------------------
  // D2 存档互斥公开 API：获取/续期/释放/查询剧本写锁
  // ---------------------------------------------------------------------------

  /**
   * 尝试获取剧本写锁（同剧本跨标签互斥）
   * @param {string} scriptId - 剧本 ID
   * @param {Object} [opts]
   * @param {boolean} [opts.force] - 显式接管：无视他签新鲜锁直接夺锁（ENG-15 D2「显式接管」）
   * @returns {{acquired: boolean, holderTabId: string|null, takeover: boolean}}
   *          takeover=true 表示从失效/过期锁手中接管
   */
  DataStore.acquireScriptLock = function (scriptId, opts) {
    var lock = _readLock(scriptId);
    var isMine = !!(lock && lock.tabId === _tabId);
    if (isMine || !_lockIsFresh(lock) || (opts && opts.force)) {
      _writeLock(scriptId);
      return {
        acquired: true,
        holderTabId: lock ? lock.tabId : null,
        takeover: !!(lock && lock.tabId !== _tabId)
      };
    }
    return { acquired: false, holderTabId: lock.tabId, takeover: false };
  };

  /** 续期自己持有的写锁（心跳调用）；非持锁方调用不生效并返回 false */
  DataStore.refreshScriptLock = function (scriptId) {
    var lock = _readLock(scriptId);
    if (lock && lock.tabId === _tabId) {
      _writeLock(scriptId);
      return true;
    }
    return false;
  };

  /** 释放自己持有的写锁（页面卸载时调用）；非持锁方调用不释放他签锁 */
  DataStore.releaseScriptLock = function (scriptId) {
    var lock = _readLock(scriptId);
    if (lock && lock.tabId === _tabId) {
      _storage.removeItem(_key('lock_' + scriptId));
    }
  };

  /** 当前标签页是否持有该剧本写锁 */
  DataStore.holdsScriptLock = function (scriptId) {
    var lock = _readLock(scriptId);
    return !!(lock && lock.tabId === _tabId);
  };

  /**
   * 保存已解锁的结局
   *
   * @param {string} scriptId - 剧本 ID
   * @param {string} endingType - 结局类型：'historical' | 'dramatic' | 'afterlife'
   */
  DataStore.saveEnding = function (scriptId, endingType) {
    var endings = DataStore.getUnlockedEndings(scriptId);
    if (endings.indexOf(endingType) === -1) {
      endings.push(endingType);
      _set('endings_' + scriptId, endings);
    }
  };

  /**
   * 获取指定剧本已解锁的结局列表
   *
   * @param {string} scriptId - 剧本 ID
   * @returns {string[]} 已解锁结局类型数组
   */
  DataStore.getUnlockedEndings = function (scriptId) {
    return _get('endings_' + scriptId, []);
  };

  /**
   * 保存收集品列表
   *
   * @param {string} scriptId - 剧本 ID
   * @param {string[]} items - 收集品 ID 数组
   */
  DataStore.saveCollectibles = function (scriptId, items) {
    _set('collectibles_' + scriptId, items || []);
  };

  /**
   * 获取指定剧本的收集品列表
   *
   * @param {string} scriptId - 剧本 ID
   * @returns {string[]} 收集品 ID 数组
   */
  DataStore.getCollectibles = function (scriptId) {
    return _get('collectibles_' + scriptId, []);
  };

  /**
   * 保存一道错题记录
   *
   * @param {Object} question - 错题信息
   * @param {string} question.question - 题目内容
   * @param {string} question.userAnswer - 用户的错误答案
   * @param {string} question.correctAnswer - 正确答案
   * @param {string} question.explanation - 解析说明
   * @param {string} question.subject - 学科/主题
   * @param {number} [question.timestamp] - 记录时间戳（不传则自动生成）
   */
  DataStore.saveWrongAnswer = function (question) {
    if (!question) return;
    var answers = DataStore.getWrongAnswers();
    answers.push({
      question: question.question || '',
      userAnswer: question.userAnswer || '',
      correctAnswer: question.correctAnswer || '',
      explanation: question.explanation || '',
      subject: question.subject || '',
      timestamp: question.timestamp || Date.now()
    });
    _set('wrong_answers', answers);
  };

  /**
   * 获取所有错题记录
   *
   * @returns {Object[]} 错题记录数组
   */
  DataStore.getWrongAnswers = function () {
    return _get('wrong_answers', []);
  };

  /**
   * 清空所有错题记录
   */
  DataStore.clearWrongAnswers = function () {
    _set('wrong_answers', []);
  };

  /**
   * 保存知识点掌握状态
   *
   * @param {string} knowledgeId - 知识点 ID
   * @param {boolean} mastered - 是否已掌握
   */
  DataStore.saveKnowledgeStatus = function (knowledgeId, mastered) {
    var statuses = DataStore.getKnowledgeStatuses();
    statuses[knowledgeId] = !!mastered;
    _set('knowledge_statuses', statuses);
  };

  /**
   * 获取所有知识点掌握状态
   *
   * @returns {Object} 以知识点 ID 为键、布尔值为值的对象
   */
  DataStore.getKnowledgeStatuses = function () {
    return _get('knowledge_statuses', {});
  };

  /**
   * 累加游戏时长
   *
   * @param {number} seconds - 要增加的秒数
   */
  DataStore.addPlayTime = function (seconds) {
    var total = DataStore.getPlayTime();
    _set('play_time', total + (seconds || 0));
  };

  /**
   * 获取累计游戏时长（秒）
   *
   * @returns {number} 总游戏时长（秒）
   */
  DataStore.getPlayTime = function () {
    return _get('play_time', 0);
  };

  /**
   * 获取指定剧本的完成概览
   *
   * @param {string} scriptId - 剧本 ID
   * @returns {Object} 完成状态对象
   * @returns {boolean} return.completed - 是否已完成（至少解锁一个结局）
   * @returns {string[]} return.endings - 已解锁结局列表
   * @returns {string[]} return.collectibles - 已收集物品列表
   * @returns {number} return.playTime - 游戏时长（秒）
   */
  DataStore.getScriptCompletion = function (scriptId) {
    var endings = DataStore.getUnlockedEndings(scriptId);
    var collectibles = DataStore.getCollectibles(scriptId);
    return {
      completed: endings.length > 0,
      endings: endings,
      collectibles: collectibles,
      playTime: DataStore.getPlayTime()
    };
  };

  /**
   * 检查指定剧本是否已完成（至少解锁了一个结局）
   *
   * @param {string} scriptId - 剧本 ID
   * @returns {boolean} 是否已完成
   */
  DataStore.isScriptCompleted = function (scriptId) {
    return DataStore.getUnlockedEndings(scriptId).length > 0;
  };

  // ---------------------------------------------------------------------------
  // 学习评级存储（双通关系统）
  // ---------------------------------------------------------------------------
  DataStore.saveScriptAssessment = function (scriptId, payload) {
    if (!scriptId || !payload) return;

    var prev = DataStore.getScriptAssessment(scriptId);
    var attemptCount = (prev ? prev.attemptCount : 0) + 1;
    var bestLearningPct = payload.learningPct || 0;
    var bestTier = payload.tier || 'completed';

    if (prev && typeof prev.bestLearningPct === 'number' && prev.bestLearningPct > bestLearningPct) {
      bestLearningPct = prev.bestLearningPct;
      bestTier = prev.bestTier || bestTier;
    }

    _set('assessment_' + scriptId, {
      endingType: payload.endingType || '',
      quizCorrect: payload.quizCorrect || 0,
      quizTotal: payload.quizTotal || 0,
      quizPct: payload.quizPct || 0,
      essayCorrectSlots: payload.essayCorrectSlots || 0,
      essayTotalSlots: payload.essayTotalSlots || 0,
      essayPct: payload.essayPct || 0,
      learningPct: payload.learningPct || 0,
      tier: payload.tier || 'completed',
      attemptCount: attemptCount,
      bestLearningPct: bestLearningPct,
      bestTier: bestTier,
      updatedAt: Date.now()
    });
  };

  DataStore.getScriptAssessment = function (scriptId) {
    return _get('assessment_' + scriptId, null);
  };

  DataStore.getBestScriptAssessment = function (scriptId) {
    return _get('assessment_' + scriptId, null);
  };

  DataStore.getStoryCompletedScripts = function () {
    var result = [];
    if (typeof SCRIPT_REGISTRY !== 'undefined') {
      for (var id in SCRIPT_REGISTRY) {
        if (SCRIPT_REGISTRY.hasOwnProperty(id) && DataStore.isScriptCompleted(id)) {
          result.push(id);
        }
      }
    }
    return result;
  };

  DataStore.getLearningTierCounts = function () {
    var counts = { completed: 0, excellent: 0, master: 0 };
    if (typeof SCRIPT_REGISTRY !== 'undefined') {
      for (var id in SCRIPT_REGISTRY) {
        if (!SCRIPT_REGISTRY.hasOwnProperty(id)) continue;
        var best = DataStore.getBestScriptAssessment(id);
        if (!best) continue;
        if (best.bestTier === 'master') counts.master++;
        else if (best.bestTier === 'excellent') counts.excellent++;
        else counts.completed++;
      }
    }
    return counts;
  };

  DataStore.getCompletedScripts = function () {
    return DataStore.getStoryCompletedScripts();
  };

  DataStore.exportStudentData = function() {
    var email = _storage.getItem('st_username') || '';
    var data = { v: 1, email: email, exportedAt: Date.now() };
    if (typeof SCRIPT_REGISTRY !== 'undefined') {
      data.scripts = {};
      for (var id in SCRIPT_REGISTRY) {
        if (!SCRIPT_REGISTRY.hasOwnProperty(id)) continue;
        var endings = DataStore.getUnlockedEndings(id);
        var collectibles = DataStore.getCollectibles(id);
        var assessment = DataStore.getBestScriptAssessment(id);
        var knowledge = DataStore.getKnowledgeStatuses();
        var scriptKnowledge = {};
        for (var k in knowledge) {
          if (knowledge.hasOwnProperty(k) && k.indexOf(id) === 0) {
            scriptKnowledge[k] = knowledge[k];
          }
        }
        data.scripts[id] = {
          endings: endings,
          collectibles: collectibles,
          assessment: assessment,
          knowledge: scriptKnowledge,
          playTime: DataStore.getPlayTime()
        };
      }
    }
    data.wrongAnswers = DataStore.getWrongAnswers();
    var json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
  };

  DataStore.importStudentData = function(encoded) {
    try {
      var json = decodeURIComponent(escape(atob(encoded.trim())));
      return JSON.parse(json);
    } catch(e) {
      return null;
    }
  };

  // ---------------------------------------------------------------------------
  // 挂载到全局
  // ---------------------------------------------------------------------------
  window.DataStore = DataStore;
})();
