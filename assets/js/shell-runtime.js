(function (global) {
  'use strict';

  // 用户可见内容已在源码层原创化（子衿 / 洛书）。
  // textReplacements 默认为空；如需为旧缓存页面临时兜底，可在部署机放置
  // data/legacy-text-compat.json（已 gitignore），运行时会合并进来。
  var aliases = { textReplacements: {} };

  fetch('data/character_aliases.json').then(function (response) { return response.json(); }).then(function (value) {
    if (value) aliases = value;
    if (!aliases.textReplacements) aliases.textReplacements = {};
  }).catch(function () {});

  fetch('data/legacy-text-compat.json').then(function (response) {
    return response.ok ? response.json() : null;
  }).then(function (value) {
    if (!value || !value.textReplacements) return;
    Object.keys(value.textReplacements).forEach(function (key) {
      aliases.textReplacements[key] = value.textReplacements[key];
    });
  }).catch(function () {});

  function replaceText(value) {
    var output = String(value || '');
    Object.keys(aliases.textReplacements || {}).forEach(function (from) {
      output = output.split(from).join(aliases.textReplacements[from]);
    });
    return output;
  }

  function avatarData(glyph, label) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1e5278"/><stop offset="1" stop-color="#17233b"/></linearGradient></defs><rect width="512" height="512" rx="88" fill="url(#g)"/><circle cx="256" cy="220" r="132" fill="none" stroke="#e9c46a" stroke-width="7" opacity=".7"/><text x="256" y="275" text-anchor="middle" font-size="160" font-family="serif" fill="#f5e5ae">' + glyph + '</text><text x="256" y="430" text-anchor="middle" font-size="40" font-family="sans-serif" fill="#dce9f7">' + label + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var avatars = {
    zijin: avatarData('子', '子衿 · 历史因果'),
    luoshu: avatarData('洛', '洛书 · 道法追问')
  };

  // 已下线的内部角色目录 ID（源码已全部改指 zijin / luoshu，此处仅为旧缓存资源兜底）
  var LEGACY_ZIJIN_ID = /fulina/;
  var LEGACY_LUOSHU_ID = /hutao/;

  function patchElement(element) {
    if (!element || element.nodeType !== 1) return;
    if (element.tagName === 'IMG') {
      var signal = [element.getAttribute('src'), element.alt, element.title, element.className].join(' ').toLowerCase();
      // 旧内部 ID 兜底：缓存页面若仍指向已下线的角色目录，替换为原创占位立绘
      if (LEGACY_ZIJIN_ID.test(signal)) {
        if (element.src !== avatars.zijin) element.src = avatars.zijin;
        element.alt = '子衿';
      } else if (LEGACY_LUOSHU_ID.test(signal)) {
        if (element.src !== avatars.luoshu) element.src = avatars.luoshu;
        element.alt = '洛书';
      }
    }
    ['title', 'aria-label', 'placeholder', 'alt'].forEach(function (name) {
      if (element.hasAttribute && element.hasAttribute(name)) {
        var next = replaceText(element.getAttribute(name));
        if (next !== element.getAttribute(name)) element.setAttribute(name, next);
      }
    });
  }

  function patchRoot(root, doc) {
    if (!root || !doc) return;
    if (root.nodeType === 1) patchElement(root);
    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && /SCRIPT|STYLE|TEXTAREA/.test(node.parentElement.tagName)) continue;
      var next = replaceText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    if (root.querySelectorAll) Array.prototype.forEach.call(root.querySelectorAll('img,[title],[aria-label],[placeholder],[alt]'), patchElement);
  }

  function patchDocument(doc) {
    if (!doc || !doc.body) return;
    patchRoot(doc.body, doc);
  }

  function knownCorrectness(element) {
    var value = element.dataset.correct;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
  }

  function classifyClick(target, scriptId) {
    var element = target.closest && target.closest('button,a,[role="button"],[data-choice],[data-evidence],[data-knowledge],[data-card],.choice,.choice-option,.answer-option,.evidence,.knowledge-card,.card');
    if (!element) return null;
    var text = replaceText((element.innerText || element.textContent || '').trim()).replace(/\s+/g, ' ').slice(0, 220);
    var signal = [element.id, element.className, element.getAttribute('data-type'), element.getAttribute('data-action')].join(' ').toLowerCase();
    var index = Array.prototype.indexOf.call(element.parentElement ? element.parentElement.children : [], element);

    if (/choice|option|选择|抉择/.test(signal + ' ' + text)) {
      return { name: 'script.choice', payload: { scriptId: scriptId, nodeId: element.dataset.nodeId || element.dataset.choice || element.id || '', choiceIndex: index, choiceText: text, actId: '', timed: /pressure|timer|限时/.test(signal) } };
    }
    if (/evidence|证据|线索|调查/.test(signal + ' ' + text)) {
      return { name: 'script.evidence_open', payload: { scriptId: scriptId, nodeId: element.dataset.nodeId || '', evidenceId: element.dataset.evidence || element.id || '', evidenceTitle: text } };
    }
    if (/knowledge|知识|考点/.test(signal + ' ' + text)) {
      return { name: 'script.knowledge_open', payload: { scriptId: scriptId, knowledgeId: element.dataset.knowledge || element.id || '', title: text } };
    }
    if (/card|卡牌/.test(signal + ' ' + text)) {
      return { name: 'script.card', payload: { scriptId: scriptId, cardId: element.dataset.card || element.id || '', action: text } };
    }
    if (/answer|quiz|答题|提交答案/.test(signal + ' ' + text)) {
      return { name: 'quiz.answer', payload: { scriptId: scriptId, questionId: element.dataset.question || '', choiceIndex: index, correct: knownCorrectness(element), knowledgeId: element.dataset.knowledge || '' } };
    }
    return null;
  }

  // ---- 引擎正式钩子（权威数据源）----------------------------------------
  var HOOK_BRIDGE = 'tt-game-hooks-v1';
  // 一旦收到引擎正式钩子，这些事件不再接受 DOM 猜测上报
  var HOOK_COVERED = {
    'script.act_enter': true,
    'script.choice': true,
    'script.evidence_open': true,
    'script.knowledge_open': true,
    'script.card': true,
    'quiz.answer': true,
    'script.ending': true,
    'quiz.complete': true
  };
  var hooksActive = false;
  var activeScriptId = null;

  global.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source !== HOOK_BRIDGE || !data.name) return;
    hooksActive = true;
    var payload = data.payload || {};
    if (!payload.scriptId && activeScriptId) payload.scriptId = activeScriptId;
    if (typeof payload.choiceText === 'string') payload.choiceText = replaceText(payload.choiceText);
    if (typeof payload.actTitle === 'string') payload.actTitle = replaceText(payload.actTitle);
    if (typeof payload.actId === 'string') payload.actId = replaceText(payload.actId);
    if (typeof payload.title === 'string') payload.title = replaceText(payload.title);
    if (typeof payload.evidenceTitle === 'string') payload.evidenceTitle = replaceText(payload.evidenceTitle);
    global.TTEvents?.track(data.name, payload);
  });

  function hooksSuppress(name) {
    return hooksActive && HOOK_COVERED[name] === true;
  }

  function attach(frame, options) {
    options = options || {};
    if (frame.dataset.ttShellAttached === '1') return;
    frame.dataset.ttShellAttached = '1';

    function onLoad() {
      try {
        var doc = frame.contentDocument;
        if (!doc || !doc.body || doc.location.href === 'about:blank') return;
        var actualScript = frame.dataset.scriptId || options.scriptId || null;
        activeScriptId = actualScript;
        patchDocument(doc);

        var observer = new MutationObserver(function (records) {
          records.forEach(function (record) {
            if (record.type === 'attributes') {
              patchElement(record.target);
              return;
            }
            Array.prototype.forEach.call(record.addedNodes || [], function (node) {
              if (node.nodeType === 3) {
                var next = replaceText(node.nodeValue);
                if (next !== node.nodeValue) node.nodeValue = next;
              } else if (node.nodeType === 1) {
                patchRoot(node, doc);
              }
            });
          });
        });
        observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'alt', 'title'] });
        doc.addEventListener('click', function (event) {
          var classified = classifyClick(event.target, actualScript);
          if (!classified) return;
          // 引擎正式钩子已接管的事件类型不再由 DOM 猜测上报（兜底降级）
          if (hooksSuppress(classified.name)) return;
          global.TTEvents?.track(classified.name, classified.payload);
        }, true);
        global.TTEvents?.track('script.start', { scriptId: actualScript, mode: 'mvp_shell' });
      } catch (error) {
        console.warn('[MVP Shell] 无法注入兼容层：', error.message);
      }
    }

    frame.addEventListener('load', onLoad);
    if (frame.contentDocument?.readyState === 'complete') onLoad();
  }

  global.TTShell = {
    attach: attach,
    patchDocument: patchDocument,
    replaceText: replaceText,
    isHooksActive: function () { return hooksActive; },
    hookCoverage: function () { return Object.keys(HOOK_COVERED); }
  };
})(window);
