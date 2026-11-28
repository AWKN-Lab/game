/*!
 * knowledge-link.js — 知识点映射与掌握度记录
 *
 * 把「剧本里的知识节点 / 测试题」映射到 data/knowledge_points.json 的账本 id，
 * 并把作答结果写回本机掌握度（此前 DataStore.saveKnowledgeStatus 全仓无调用，
 * 学习复盘里的「我已经会了 / 我容易混淆」永远是空的）。
 */
(function (global) {
  'use strict';

  var link = null;
  var loadFailed = false;
  // 映射表是异步加载的：先到的作答事件先入队，加载完成后补写，避免漏记
  var pending = [];

  function getLink() {
    if (link || loadFailed) return link;
    try {
      // 注意：不能用 global.TTKnowledgeLink 作为映射表来源——那正是本模块自己导出的对象，
      // 会造成"读到自己的 API"的自引用（scripts 恒为空）。
      if (global.TTKnowledgeLink && global.TTKnowledgeLink.scripts) {
        link = global.TTKnowledgeLink;
        return link;
      }
      // 映射表很小（约 10KB），先同步加载一次，保证引擎首题就能拿到映射；
      // 同步请求失败时再退回异步 + 队列补写。
      try {
        var sync = new XMLHttpRequest();
        sync.open('GET', 'data/knowledge_link.json', false);
        sync.send();
        if (sync.status === 200) {
          link = JSON.parse(sync.responseText);
          return link;
        }
      } catch (error) { /* 退回异步加载 */ }
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'data/knowledge_link.json', true);
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            link = JSON.parse(xhr.responseText);
            flushPending();
          } catch (error) { loadFailed = true; }
        } else { loadFailed = true; }
      };
      xhr.onerror = function () { loadFailed = true; };
      xhr.send();
    } catch (error) {
      loadFailed = true;
    }
    return null;
  }

  function flushPending() {
    if (!link || !pending.length) return;
    var queue = pending.slice();
    pending.length = 0;
    queue.forEach(function (item) {
      if (item.kind === 'outcome') recordOutcome(item.scriptId, item.nodeId, item.correct, item.title);
      else markTouched(item.scriptId, item.nodeId, item.title);
    });
  }

  function scriptSection(scriptId) {
    var data = getLink();
    if (!data || !data.scripts) return null;
    return data.scripts[scriptId] || null;
  }

  /** 剧本知识节点 id（或节点名）→ 账本 id */
  function toLedgerId(scriptId, nodeId) {
    if (!nodeId) return '';
    var section = scriptSection(scriptId);
    if (!section || !section.nodes) return nodeId;
    for (var i = 0; i < section.nodes.length; i++) {
      if (section.nodes[i].nodeId === nodeId) return section.nodes[i].ledgerId;
    }
    return nodeId;
  }

  /** 测试题序号 → 账本 id */
  function quizLedgerId(scriptId, index) {
    var section = scriptSection(scriptId);
    if (!section || !section.quiz) return '';
    for (var i = 0; i < section.quiz.length; i++) {
      if (section.quiz[i].index === index) return section.quiz[i].ledgerId;
    }
    return '';
  }

  /** 知识点标题（优先取映射表，其次取账本） */
  function titleFor(scriptId, nodeId) {
    var section = scriptSection(scriptId);
    if (section && section.nodes) {
      for (var i = 0; i < section.nodes.length; i++) {
        if (section.nodes[i].nodeId === nodeId) return section.nodes[i].title || nodeId;
      }
    }
    return nodeId;
  }

  /** 记录一次作答：映射到账本 id 后写入掌握度 */
  function recordOutcome(scriptId, nodeId, correct, title) {
    if (!global.DataStore || !nodeId) return '';
    if (!getLink()) { pending.push({ kind: 'outcome', scriptId: scriptId, nodeId: nodeId, correct: correct, title: title }); return ''; }
    var ledgerId = toLedgerId(scriptId, nodeId);
    if (!ledgerId) return '';
    // 标题优先用账本里的知识点名称，其次才是题干
    global.DataStore.recordKnowledgeAnswer(ledgerId, !!correct, titleFor(scriptId, nodeId) || title);
    return ledgerId;
  }

  /** 标记"已接触" */
  function markTouched(scriptId, nodeId, title) {
    if (!global.DataStore || !nodeId) return '';
    if (!getLink()) { pending.push({ kind: 'touch', scriptId: scriptId, nodeId: nodeId, title: title }); return ''; }
    var ledgerId = toLedgerId(scriptId, nodeId);
    if (!ledgerId) return '';
    global.DataStore.markKnowledgeTouched(ledgerId, title || titleFor(scriptId, nodeId));
    return ledgerId;
  }

  global.TTKnowledgeLink = {
    toLedgerId: toLedgerId,
    quizLedgerId: quizLedgerId,
    titleFor: titleFor,
    recordOutcome: recordOutcome,
    markTouched: markTouched,
    getLink: getLink
  };
})(window);
