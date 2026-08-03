// =============================================================================
// CardBattleUI - 卡牌模式 UI 渲染
// =============================================================================

window.CardBattleUI = (function() {
  var _overlay = null;
  var _feedbackEl = null;
  var _replayEl = null;
  var _lastFeedbackResult = null;

  // Value dimension display config
  var DIM_CONFIG = {
    freedom:  { label: '自由', color: '#4169e1' },
    equality: { label: '平等', color: '#32cd32' },
    rule:     { label: '规则', color: '#4682b4' },
    justice:  { label: '正义', color: '#dc143c' }
  };

  // ---------------------------------------------------------------------------
  // Init: create DOM elements once
  // ---------------------------------------------------------------------------
  function init() {
    if (_overlay) return; // already created

    _overlay = document.createElement('div');
    _overlay.className = 'cb-overlay';
    _overlay.innerHTML = _buildOverlayHTML();
    document.body.appendChild(_overlay);

    _feedbackEl = _overlay.querySelector('.cb-feedback');
    _replayEl = _overlay.querySelector('.cb-replay');
  }

  function _buildOverlayHTML() {
    return [
      '<div class="cb-top-bar">',
      '  <div class="cb-round-info" id="cbRoundInfo"></div>',
      '  <div class="cb-phase" id="cbPhase"></div>',
      '</div>',
      '<div class="cb-value-hud" id="cbValueHud"></div>',
      '<div class="cb-event-desc" id="cbEventDesc"></div>',
      '<div class="cb-card-area" id="cbCardArea"></div>',
      '<div class="cb-selected-bar" id="cbSelectedBar">',
      '  <div class="cb-selected-cards" id="cbSelectedCards"></div>',
      '  <button class="cb-confirm-btn" id="cbConfirmBtn" disabled>确认出牌</button>',
      '</div>',
      '<div class="cb-feedback" id="cbFeedback"></div>',
      '<div class="cb-replay" id="cbReplay"></div>'
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Show/Hide
  // ---------------------------------------------------------------------------
  function show() {
    init();
    _overlay.classList.add('active');
  }

  function hide() {
    if (_overlay) {
      _overlay.classList.remove('active');
      _feedbackEl.classList.remove('active');
      _replayEl.classList.remove('active');
    }
  }

  // ---------------------------------------------------------------------------
  // Render based on state
  // ---------------------------------------------------------------------------
  function render(ctx) {
    if (!ctx) return;

    switch (ctx.state) {
      case 'DEALING':
        _renderTopBar(ctx);
        _renderValueHud(ctx.values, {});
        _renderEventDesc(ctx.roundInfo);
        _renderCardArea([]);
        _renderSelectedBar(ctx.selected);
        CardBattleModule.dealCards(); // trigger deal
        break;

      case 'SELECTING':
        _renderTopBar(ctx);
        _renderValueHud(ctx.values, {});
        _renderEventDesc(ctx.roundInfo);
        _renderCardArea(ctx.hand);
        _renderSelectedBar(ctx.selected);
        break;

      case 'JUDGING':
        // Brief pause, then show feedback
        setTimeout(function() {
          _renderFeedback(ctx);
        }, 300);
        break;

      case 'FEEDBACK':
        _renderFeedback(ctx);
        break;

      case 'END':
        _renderReplay(ctx);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  function _renderTopBar(ctx) {
    var roundInfo = ctx.roundInfo;
    document.getElementById('cbRoundInfo').innerHTML =
      '回合 ' + (ctx.round + 1) + ' / ' + ctx.totalRounds +
      '<span> · ' + (roundInfo ? roundInfo.year : '') + '</span>';
    document.getElementById('cbPhase').textContent =
      roundInfo ? roundInfo.phase : '';
  }

  function _renderValueHud(values, changes) {
    var html = '';
    var dims = ['freedom', 'equality', 'rule', 'justice'];
    for (var i = 0; i < dims.length; i++) {
      var dim = dims[i];
      var cfg = DIM_CONFIG[dim];
      var val = values[dim] || 0;
      var pct = Math.max(0, Math.min(100, val));
      var change = changes[dim] || 0;
      var changeClass = change > 0 ? 'up' : (change < 0 ? 'down' : '');
      var fillClass = change > 0 ? 'positive' : (change < 0 ? 'negative' : 'neutral');

      html += '<div class="cb-value-item">' +
        '<div class="cb-value-label">' + cfg.label + '</div>' +
        '<div class="cb-value-bar"><div class="cb-value-fill ' + fillClass + '" style="width:' + pct + '%;background:' + cfg.color + '"></div></div>' +
        '<div class="cb-value-num" style="color:' + cfg.color + '">' + val + '</div>' +
        (change !== 0 ? '<div class="cb-value-change show ' + changeClass + '">' + (change > 0 ? '+' : '') + change + '</div>' : '') +
        '</div>';
    }
    document.getElementById('cbValueHud').innerHTML = html;
  }

  function _renderEventDesc(roundInfo) {
    document.getElementById('cbEventDesc').textContent =
      roundInfo ? roundInfo.description : '';
  }

  function _renderCardArea(hand) {
    var area = document.getElementById('cbCardArea');
    if (!hand || hand.length === 0) {
      area.innerHTML = '<div style="text-align:center;color:#8f909d;padding:20px;">发牌中...</div>';
      return;
    }

    // Group by type
    var history = [], value = [], action = [];
    for (var i = 0; i < hand.length; i++) {
      if (hand[i].type === 'history') history.push(hand[i]);
      else if (hand[i].type === 'value') value.push(hand[i]);
      else if (hand[i].type === 'action') action.push(hand[i]);
    }

    var html = '';
    if (history.length > 0) {
      html += '<div class="cb-card-label">📜 历史牌</div>';
      html += '<div class="cb-card-grid">';
      for (var h = 0; h < history.length; h++) html += _renderCard(history[h]);
      html += '</div>';
    }
    if (value.length > 0) {
      html += '<div class="cb-card-label">💎 道法牌</div>';
      html += '<div class="cb-card-grid">';
      for (var v = 0; v < value.length; v++) html += _renderCard(value[v]);
      html += '</div>';
    }
    if (action.length > 0) {
      html += '<div class="cb-card-label">⚔️ 行动牌</div>';
      html += '<div class="cb-card-grid">';
      for (var a = 0; a < action.length; a++) html += _renderCard(action[a]);
      html += '</div>';
    }

    area.innerHTML = html;

    // Bind click events
    var cards = area.querySelectorAll('.cb-card');
    for (var c = 0; c < cards.length; c++) {
      (function(cardEl) {
        cardEl.addEventListener('click', function() {
          var cardId = cardEl.getAttribute('data-card-id');
          CardBattleModule.selectCard(cardId);
        });
      })(cards[c]);
    }
  }

  function _renderCard(card) {
    var selected = CardBattleModule.getSelected();
    var isSelected = selected[card.type] && selected[card.type].id === card.id;
    var canSelect = CardBattleModule.canSelectCard(card.id);
    var disabled = !canSelect && !isSelected;

    var cls = 'cb-card ' + card.type;
    if (isSelected) cls += ' selected';
    if (disabled) cls += ' disabled';

    var effectsHtml = '';
    if (card.effects) {
      var dims = ['freedom', 'equality', 'rule', 'justice'];
      for (var i = 0; i < dims.length; i++) {
        var val = card.effects[dims[i]];
        if (val) {
          var label = DIM_CONFIG[dims[i]].label;
          effectsHtml += '<div class="' + (val > 0 ? 'up' : 'down') + '">' +
            label + (val > 0 ? '+' : '') + val + '</div>';
        }
      }
    }

    var desc = card.description || card.tip || '';

    return '<div class="' + cls + '" data-card-id="' + card.id + '">' +
      '<div class="cb-card-name">' + card.name + '</div>' +
      (desc ? '<div class="cb-card-desc">' + desc + '</div>' : '') +
      (effectsHtml ? '<div class="cb-card-effects">' + effectsHtml + '</div>' : '') +
      '</div>';
  }

  function _renderSelectedBar(selected) {
    var cardsEl = document.getElementById('cbSelectedCards');
    var confirmBtn = document.getElementById('cbConfirmBtn');
    var tags = [];

    if (selected.history) tags.push('<span class="cb-selected-tag history">📜 ' + selected.history.name + '</span>');
    if (selected.value) tags.push('<span class="cb-selected-tag value">💎 ' + selected.value.name + '</span>');
    if (selected.action) tags.push('<span class="cb-selected-tag action">⚔️ ' + selected.action.name + '</span>');

    cardsEl.innerHTML = tags.length > 0 ? '已选：' + tags.join(' ') : '<span style="color:#8f909d;font-size:11px;">请选择 1张历史牌 + 1张道法牌 + 1张行动牌</span>';

    var allSelected = selected.history && selected.value && selected.action;
    confirmBtn.disabled = !allSelected;

    // Rebind confirm
    confirmBtn.onclick = function() {
      if (allSelected) CardBattleModule.confirmSelection();
    };
  }

  // ---------------------------------------------------------------------------
  // Feedback panel (after confirming cards)
  // ---------------------------------------------------------------------------
  function _renderFeedback(ctx) {
    var replay = ctx.replayData;
    var result = replay[replay.length - 1];
    if (!result) return;

    var dims = ['freedom', 'equality', 'rule', 'justice'];
    var valuesHtml = '';
    for (var i = 0; i < dims.length; i++) {
      var dim = dims[i];
      var change = result.valueChanges[dim] || 0;
      var cls = change > 0 ? 'up' : (change < 0 ? 'down' : '');
      valuesHtml += '<div class="cb-fb-value">' +
        '<div class="change ' + cls + '">' + (change > 0 ? '+' : '') + change + '</div>' +
        '<div class="label">' + DIM_CONFIG[dim].label + '</div>' +
        '</div>';
    }

    var knowledgeHtml = result.knowledgePoint ?
      '<div class="cb-knowledge-tip">📚 ' + result.knowledgePoint + '</div>' : '';

    // NPC changes
    var npcHtml = '';
    if (result.npcChanges) {
      // We'll show NPC state from the module
      var npcFate = CardBattleModule.getNpcFate ? CardBattleModule.getNpcFate() : {};
      // For now just show a simple summary
    }

    var isLastRound = ctx.round + 1 >= ctx.totalRounds;
    var btnText = isLastRound ? '查看复盘' : '下一回合';

    _feedbackEl.innerHTML =
      '<div class="cb-feedback-title">第 ' + result.round + ' 回合结果</div>' +
      '<div class="cb-feedback-values">' + valuesHtml + '</div>' +
      knowledgeHtml +
      '<button class="cb-next-btn" id="cbNextBtn">' + btnText + '</button>';

    _feedbackEl.classList.add('active');

    document.getElementById('cbNextBtn').onclick = function() {
      _feedbackEl.classList.remove('active');
      CardBattleModule.nextRound();
    };
  }

  // ---------------------------------------------------------------------------
  // Replay panel (shown at end)
  // ---------------------------------------------------------------------------
  function _renderReplay(ctx) {
    var replay = ctx.replayData;
    var values = ctx.values;
    var dims = ['freedom', 'equality', 'rule', 'justice'];

    // Determine ending
    var endingTitle = '未知结局';
    var endingDesc = '';
    // We'll get ending info from the last state change
    // For now, compute it simply
    var allBetween = dims.every(function(d) { return values[d] >= 40 && values[d] <= 60; });
    var anyBelow = dims.some(function(d) { return values[d] <= 10; });
    if (anyBelow) { endingTitle = '破碎的巴黎'; endingDesc = '革命失败，社会解体'; }
    else if (allBetween) { endingTitle = '理性的声音'; endingDesc = '温和改革，渐进式进步'; }
    else if (values.freedom >= 70 && values.equality >= 60 && values.justice >= 60) { endingTitle = '自由之光'; endingDesc = '走向共和，自由平等博爱'; }
    else if (values.freedom >= 60 && values.rule <= 30) { endingTitle = '失控的革命'; endingDesc = '恐怖统治蔓延，社会动荡'; }
    else if (values.rule >= 70 && values.freedom <= 30) { endingTitle = '旧梦重温'; endingDesc = '王权复辟，革命成果丧失'; }
    else if (values.rule >= 60 && values.equality <= 30) { endingTitle = '帝国的黄昏'; endingDesc = '拿破仑称帝，民主倒退'; }
    else { endingTitle = '理性的声音'; endingDesc = '温和改革，渐进式进步'; }

    // Build replay rounds
    var roundsHtml = '';
    for (var r = 0; r < replay.length; r++) {
      var rd = replay[r];
      var changesHtml = '';
      for (var d = 0; d < dims.length; d++) {
        var ch = rd.valueChanges[dims[d]] || 0;
        if (ch !== 0) {
          changesHtml += '<span class="' + (ch > 0 ? 'up' : 'down') + '">' +
            DIM_CONFIG[dims[d]].label + (ch > 0 ? '+' : '') + ch + '</span>  ';
        }
      }

      roundsHtml += '<div class="cb-replay-round">' +
        '<div class="cb-replay-round-header">回合 ' + rd.round + ' · ' + rd.phase + ' · ' + rd.year + '</div>' +
        '<div class="cb-replay-round-cards">📜 ' + rd.historyCard.name + ' + 💎 ' + rd.valueCard.name + ' + ⚔️ ' + rd.actionCard.name + '</div>' +
        '<div class="cb-replay-round-values">' + changesHtml + '</div>' +
        '</div>';
    }

    // Knowledge points summary
    var knowledgeHtml = '';
    for (var k = 0; k < replay.length; k++) {
      if (replay[k].knowledgePoint) {
        knowledgeHtml += '<div style="font-size:11px;color:#93c5fd;padding:2px 0;">· ' + replay[k].knowledgePoint + '</div>';
      }
    }

    // Final values
    var finalValuesHtml = '';
    for (var f = 0; f < dims.length; f++) {
      finalValuesHtml += '<span style="color:' + DIM_CONFIG[dims[f]].color + ';font-weight:600;">' +
        DIM_CONFIG[dims[f]].label + ' ' + values[dims[f]] + '</span>  ';
    }

    _replayEl.innerHTML =
      '<div class="cb-replay-title">革命复盘</div>' +
      roundsHtml +
      '<div class="cb-ending-result">' +
      '<div class="cb-ending-title">' + endingTitle + '</div>' +
      '<div class="cb-ending-desc">' + endingDesc + '</div>' +
      '<div style="margin-top:8px;font-size:12px;">' + finalValuesHtml + '</div>' +
      '</div>' +
      (knowledgeHtml ? '<div style="margin:12px 0;padding:12px;background:rgba(59,130,246,0.1);border-radius:10px;"><div style="font-size:12px;color:#8f909d;margin-bottom:6px;">📚 知识点回顾</div>' + knowledgeHtml + '</div>' : '') +
      '<div class="cb-replay-actions">' +
      '<button class="cb-replay-btn secondary" id="cbRetryBtn">重新挑战</button>' +
      '<button class="cb-replay-btn primary" id="cbContinueBtn">继续剧情</button>' +
      '</div>';

    _replayEl.classList.add('active');

    // Bind buttons
    document.getElementById('cbRetryBtn').onclick = function() {
      _replayEl.classList.remove('active');
      // Restart card battle
      var battleId = 'french_revolution';
      var currentValues = { freedom: 50, equality: 50, rule: 50, justice: 50 };
      CardBattleModule.start(battleId, currentValues, {}).then(function(result) {
        if (result) {
          _onBattleEnd(result);
        }
        hide();
      });
    };

    document.getElementById('cbContinueBtn').onclick = function() {
      _replayEl.classList.remove('active');
      hide();
      // The Promise resolve in CardBattleModule.start() will be called
      // with the result, which engine.js will handle
    };
  }

  // ---------------------------------------------------------------------------
  // Start entry point
  // ---------------------------------------------------------------------------
  function startBattle(battleId, currentValues, currentNpcFate) {
    show();

    return CardBattleModule.start(battleId, currentValues, currentNpcFate).then(function(result) {
      hide();
      return result;
    });
  }

  // Callback when battle ends
  var _onBattleEnd = function(result) {};

  function onBattleEnd(cb) {
    _onBattleEnd = cb;
  }

  // Auto-bind state change listener
  CardBattleModule.onStateChange(function(ctx) {
    render(ctx);
  });

  return {
    startBattle: startBattle,
    show: show,
    hide: hide,
    onBattleEnd: onBattleEnd
  };
})();
