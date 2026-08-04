(function (global) {
  'use strict';

  var aliases = {
    textReplacements: { '芙宁娜': '子衿', '胡桃': '洛书', '枫丹': '文明长河', '往生堂': '星轨书院', '护摩之杖': '星轨手札' }
  };

  fetch('data/character_aliases.json').then(function (response) { return response.json(); }).then(function (value) {
    aliases = value || aliases;
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

  function patchElement(element) {
    if (!element || element.nodeType !== 1) return;
    if (element.tagName === 'IMG') {
      var signal = [element.getAttribute('src'), element.alt, element.title, element.className].join(' ').toLowerCase();
      if (/fulina|furina|芙宁娜/.test(signal)) {
        element.src = avatars.zijin;
        element.alt = '子衿';
      } else if (/hutao|hu-tao|胡桃/.test(signal)) {
        element.src = avatars.luoshu;
        element.alt = '洛书';
      }
    }
    ['title', 'aria-label', 'placeholder', 'alt'].forEach(function (name) {
      if (element.hasAttribute && element.hasAttribute(name)) element.setAttribute(name, replaceText(element.getAttribute(name)));
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
      return { name: 'quiz.answer', payload: { scriptId: scriptId, questionId: element.dataset.question || '', choiceIndex: index, correct: false, knowledgeId: element.dataset.knowledge || '' } };
    }
    return null;
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
        patchDocument(doc);

        var observer = new MutationObserver(function (records) {
          records.forEach(function (record) {
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
          if (classified) global.TTEvents?.track(classified.name, classified.payload);
        }, true);
        global.TTEvents?.track('script.start', { scriptId: actualScript, mode: 'mvp_shell' });
      } catch (error) {
        console.warn('[MVP Shell] 无法注入兼容层：', error.message);
      }
    }

    frame.addEventListener('load', onLoad);
    if (frame.contentDocument?.readyState === 'complete') onLoad();
  }

  global.TTShell = { attach: attach, patchDocument: patchDocument, replaceText: replaceText };
})(window);
