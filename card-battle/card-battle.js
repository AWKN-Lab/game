// =============================================================================
// CardBattleModule - 卡牌模式核心逻辑
// =============================================================================
// 状态机：IDLE → DEALING → SELECTING → JUDGING → FEEDBACK → (next round or END)
// =============================================================================

window.CardBattleModule = (function() {
  var _battleData = null;   // JSON data for current battle
  var _state = 'IDLE';      // current state machine state
  var _round = 0;           // current round (0-based)
  var _values = {};         // current situation values { freedom, equality, rule, justice }
  var _npcFate = {};        // current NPC fate states
  var _hand = [];           // cards in hand this round
  var _selected = {};       // selected cards { history: cardObj, value: cardObj, action: cardObj }
  var _replayData = [];     // history of all rounds
  var _resolve = null;      // Promise resolve for start()
  var _onStateChange = null; // callback for UI updates

  // Value dimension keys
  var DIMS = ['freedom', 'equality', 'rule', 'justice'];

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function start(battleId, currentValues, currentNpcFate) {
    _values = Object.assign({}, currentValues || { freedom: 50, equality: 50, rule: 50, justice: 50 });
    _npcFate = Object.assign({}, currentNpcFate || {});
    _round = 0;
    _replayData = [];
    _selected = {};
    _hand = [];

    return new Promise(function(resolve) {
      _resolve = resolve;
      _loadBattleData(battleId).then(function(data) {
        if (!data) {
          resolve(null);
          return;
        }
        _battleData = data;
        _state = 'DEALING';
        _notify();
      });
    });
  }

  function getState() { return _state; }
  function getRound() { return _round; }
  function getTotalRounds() { return _battleData ? _battleData.totalRounds : 0; }
  function getRoundInfo() { return _battleData ? _battleData.rounds[_round] : null; }
  function getValues() { return Object.assign({}, _values); }
  function getHand() { return _hand.slice(); }
  function getSelected() { return Object.assign({}, _selected); }
  function getReplayData() { return _replayData.slice(); }

  function onStateChange(cb) { _onStateChange = cb; }

  // ---------------------------------------------------------------------------
  // Card selection
  // ---------------------------------------------------------------------------

  function selectCard(cardId) {
    if (_state !== 'SELECTING') return false;
    var card = _findCard(cardId);
    if (!card) return false;

    // Check action card condition
    if (card.type === 'action' && card.condition) {
      for (var key in card.condition) {
        if (_values[key] <= card.condition[key]) return false; // condition not met
      }
    }

    // If already selected, deselect
    if (_selected[card.type] && _selected[card.type].id === cardId) {
      delete _selected[card.type];
      _notify();
      return true;
    }

    // If slot already taken, replace
    _selected[card.type] = card;
    _notify();
    return true;
  }

  function canSelectCard(cardId) {
    if (_state !== 'SELECTING') return false;
    var card = _findCard(cardId);
    if (!card) return false;
    if (card.type === 'action' && card.condition) {
      for (var key in card.condition) {
        if (_values[key] <= card.condition[key]) return false;
      }
    }
    return true;
  }

  function confirmSelection() {
    if (_state !== 'SELECTING') return;
    if (!_selected.history || !_selected.value || !_selected.action) return;

    _state = 'JUDGING';
    _notify();

    // Calculate effects
    var result = _calculateRound();
    _replayData.push(result);

    // Update values
    DIMS.forEach(function(dim) {
      _values[dim] = Math.max(10, Math.min(90, _values[dim] + result.valueChanges[dim]));
    });

    // Update NPC states
    _updateNpcStates();

    _state = 'FEEDBACK';
    _notify();
  }

  function nextRound() {
    if (_state !== 'FEEDBACK') return;

    _round++;
    _selected = {};
    _hand = [];

    if (_round >= _battleData.totalRounds) {
      // Battle ended
      _state = 'END';
      var ending = _determineEnding();
      _notify();
      if (_resolve) {
        _resolve({
          values: Object.assign({}, _values),
          npcFate: Object.assign({}, _npcFate),
          ending: ending,
          replayData: _replayData.slice()
        });
        _resolve = null;
      }
    } else {
      _state = 'DEALING';
      _notify();
    }
  }

  // ---------------------------------------------------------------------------
  // Internal: Load battle data
  // ---------------------------------------------------------------------------

  function _loadBattleData(battleId) {
    var url = 'game/card-battle/data/' + battleId + '.json';
    return fetch(url).then(function(res) {
      if (!res.ok) throw new Error('Failed to load: ' + url);
      return res.json();
    }).catch(function(err) {
      console.error('[CardBattle] Load error:', err);
      return null;
    });
  }

  // ---------------------------------------------------------------------------
  // Internal: Deal cards for current round
  // ---------------------------------------------------------------------------

  function dealCards() {
    if (_state !== 'DEALING') return;

    var roundInfo = _battleData.rounds[_round];
    var draw = _battleData.drawPerRound;
    _hand = [];
    _selected = {};

    // Draw history cards (from available for this round)
    var availableHistory = roundInfo.availableHistory;
    var historyPool = availableHistory.slice();
    for (var i = 0; i < draw.history && historyPool.length > 0; i++) {
      var idx = Math.floor(Math.random() * historyPool.length);
      _hand.push(_battleData.historyCards[historyPool[idx]]);
      historyPool.splice(idx, 1);
    }

    // Draw value cards (from all)
    var valueKeys = Object.keys(_battleData.valueCards);
    var valuePool = valueKeys.slice();
    for (var j = 0; j < draw.value && valuePool.length > 0; j++) {
      var vi = Math.floor(Math.random() * valuePool.length);
      _hand.push(_battleData.valueCards[valuePool[vi]]);
      valuePool.splice(vi, 1);
    }

    // Draw action cards (from all)
    var actionKeys = Object.keys(_battleData.actionCards);
    var actionPool = actionKeys.slice();
    for (var k = 0; k < draw.action && actionPool.length > 0; k++) {
      var ai = Math.floor(Math.random() * actionPool.length);
      _hand.push(_battleData.actionCards[actionPool[ai]]);
      actionPool.splice(ai, 1);
    }

    _state = 'SELECTING';
    _notify();
  }

  // ---------------------------------------------------------------------------
  // Internal: Calculate round effects
  // ---------------------------------------------------------------------------

  function _calculateRound() {
    var roundInfo = _battleData.rounds[_round];
    var valueChanges = { freedom: 0, equality: 0, rule: 0, justice: 0 };
    var npcChanges = {};
    var knowledgePoint = '';

    // Step 1: Get history card base effects
    var historyEffects = Object.assign({}, _selected.history.effects);

    // Step 2: Apply value card multiplier
    var valueCard = _selected.value;
    var multiplier = valueCard.multiplier || {};

    DIMS.forEach(function(dim) {
      var base = historyEffects[dim] || 0;

      // Check for special multiplier keys
      if (multiplier._all) {
        base = base * multiplier._all;
      } else if (multiplier._negative && base < 0) {
        base = base * multiplier._negative;
        if (multiplier._negativeBonus) base += multiplier._negativeBonus;
      } else if (multiplier[dim]) {
        base = base * multiplier[dim];
      }

      valueChanges[dim] = Math.round(base);
    });

    // Handle V8 (national interest) which has direct effects instead of multiplier
    if (valueCard.effects) {
      DIMS.forEach(function(dim) {
        if (valueCard.effects[dim] !== undefined) {
          valueChanges[dim] += valueCard.effects[dim];
        }
      });
    }

    // Step 3: Add action card effects
    var actionEffects = _selected.action.effects || {};
    DIMS.forEach(function(dim) {
      valueChanges[dim] += (actionEffects[dim] || 0);
    });

    // Knowledge point from history card
    knowledgePoint = _selected.history.knowledge || '';

    return {
      round: _round + 1,
      phase: roundInfo.phase,
      year: roundInfo.year,
      historyCard: _selected.history,
      valueCard: _selected.value,
      actionCard: _selected.action,
      valueChanges: valueChanges,
      npcChanges: npcChanges,
      knowledgePoint: knowledgePoint
    };
  }

  // ---------------------------------------------------------------------------
  // Internal: Update NPC states based on values
  // ---------------------------------------------------------------------------

  function _updateNpcStates() {
    if (!_battleData.npcRules) return;

    _battleData.npcRules.forEach(function(rule) {
      rule.conditions.forEach(function(cond) {
        var met = _checkCondition(cond);
        if (met && (!_npcFate[rule.npcId] || _npcFate[rule.npcId] === 'unknown')) {
          _npcFate[rule.npcId] = cond.state;
        }
      });
    });
  }

  function _checkCondition(cond) {
    var val = _values[cond.check];
    if (cond.op === '>') return val > cond.val;
    if (cond.op === '<') return val < cond.val;
    if (cond.op === '>=') return val >= cond.val;
    if (cond.op === '<=') return val <= cond.val;
    return false;
  }

  // ---------------------------------------------------------------------------
  // Internal: Determine ending
  // ---------------------------------------------------------------------------

  function _determineEnding() {
    if (!_battleData.endings) return 'balanced';

    // Check endings in order (first match wins)
    for (var i = 0; i < _battleData.endings.length; i++) {
      var ending = _battleData.endings[i];
      var conds = ending.conditions;

      if (conds._anyBelow) {
        var anyBelow = DIMS.some(function(dim) { return _values[dim] <= conds._anyBelow; });
        if (anyBelow) return ending;
      }

      if (conds._allBetween) {
        var allBetween = DIMS.every(function(dim) {
          return _values[dim] >= conds._allBetween[0] && _values[dim] <= conds._allBetween[1];
        });
        if (allBetween) return ending;
      }

      // Check dimension conditions
      var dims = ['freedom', 'equality', 'rule', 'justice'];
      var allMet = true;
      var hasCond = false;
      for (var d = 0; d < dims.length; d++) {
        var range = conds[dims[d]];
        if (range) {
          hasCond = true;
          var min = range[0];
          var max = range[1];
          if (min !== null && _values[dims[d]] < min) { allMet = false; break; }
          if (max !== null && _values[dims[d]] > max) { allMet = false; break; }
        }
      }
      if (hasCond && allMet) return ending;
    }

    return _battleData.endings[_battleData.endings.length - 1]; // fallback
  }

  // ---------------------------------------------------------------------------
  // Internal: Helpers
  // ---------------------------------------------------------------------------

  function _findCard(cardId) {
    for (var i = 0; i < _hand.length; i++) {
      if (_hand[i].id === cardId) return _hand[i];
    }
    return null;
  }

  function _notify() {
    if (_onStateChange) {
      _onStateChange({
        state: _state,
        round: _round,
        totalRounds: _battleData ? _battleData.totalRounds : 0,
        roundInfo: getRoundInfo(),
        values: getValues(),
        hand: getHand(),
        selected: getSelected(),
        replayData: getReplayData()
      });
    }
  }

  // Public interface
  return {
    start: start,
    getState: getState,
    getRound: getRound,
    getTotalRounds: getTotalRounds,
    getRoundInfo: getRoundInfo,
    getValues: getValues,
    getHand: getHand,
    getSelected: getSelected,
    getReplayData: getReplayData,
    onStateChange: onStateChange,
    selectCard: selectCard,
    canSelectCard: canSelectCard,
    confirmSelection: confirmSelection,
    nextRound: nextRound,
    dealCards: dealCards
  };
})();
