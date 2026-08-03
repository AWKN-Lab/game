(function() {
  'use strict';

  var STORAGE_KEY_PREFIX = 'st_points_system';
  var _currentUser = '';
  function _storageKey() { return _currentUser ? STORAGE_KEY_PREFIX + '_' + _currentUser : STORAGE_KEY_PREFIX; }

  var REWARD_CONFIG = {
    REGISTER: 200,
    DAILY_LOGIN: 10,
    COMPLETE_SCRIPT: 100,
    UNLOCK_ALL_ENDINGS: 150,
    MASTER_ASSESSMENT: 80,
    EXCELLENT_ASSESSMENT: 40,
    SHARE_TO_STUDENT: 50,
    STUDENT_FROM_SHARE: 500,
    STUDENT_COMPLETE_SCRIPT: 20,
    COLLECTIBLE_FOUND: 5,
    QUIZ_PERFECT: 15,
    REFEREE_FIRST_COMPLETE: 30
  };

  var PREMIUM_CONFIG = {
    script_unlock: 300,
    ending_reveal: 50,
    collectible_hint: 20,
    extra_card: 100
  };

  function _getStorage() {
    try {
      var raw = localStorage.getItem(_storageKey());
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function _save(data) {
    try { localStorage.setItem(_storageKey(), JSON.stringify(data)); } catch(e) {}
  }

  function _init() {
    var data = _getStorage();
    if (!data) {
      data = {
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        myReferralCode: _generateCode(),
        referredBy: null,
        referrals: [],
        history: [],
        dailyLoginDate: null,
        unlockedPremium: {}
      };
      _save(data);
    }
    if (!data.myReferralCode) {
      data.myReferralCode = _generateCode();
      _save(data);
    }
    return data;
  }

  function _generateCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  var PointsSystem = {};

  PointsSystem.init = function(username) {
    if (username) _currentUser = username;
    var data = _init();
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref') || params.get('invite');
    if (ref) {
      data.referredBy = ref;
      _save(data);
      var url = new URL(window.location);
      url.searchParams.delete('ref');
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.toString());
    }
    if (ref && !localStorage.getItem('st_share_rewarded')) {
      PointsSystem.earn('STUDENT_FROM_SHARE', '通过分享链接加入');
      localStorage.setItem('st_share_rewarded', '1');
    }
    return data;
  };

  PointsSystem.getBalance = function() {
    var data = _getStorage();
    return data ? data.balance : 0;
  };

  PointsSystem.getTotalEarned = function() {
    var data = _getStorage();
    return data ? data.totalEarned : 0;
  };

  PointsSystem.getReferralCode = function() {
    var data = _getStorage();
    return data ? data.myReferralCode : '';
  };

  PointsSystem.getReferralCount = function() {
    var data = _getStorage();
    return data ? data.referrals.length : 0;
  };

  PointsSystem.getHistory = function(limit) {
    var data = _getStorage();
    var h = data ? data.history : [];
    if (limit) h = h.slice(-limit);
    return h;
  };

  PointsSystem.earn = function(reason, detail) {
    var amount = REWARD_CONFIG[reason] || 0;
    if (amount <= 0) return 0;
    var data = _getStorage();
    if (!data) data = _init();
    data.balance += amount;
    data.totalEarned += amount;
    data.history.push({
      type: 'earn',
      reason: reason,
      detail: detail || reason,
      amount: amount,
      balance: data.balance,
      time: new Date().toISOString()
    });
    if (data.history.length > 200) data.history = data.history.slice(-200);
    _save(data);
    return amount;
  };

  PointsSystem.spend = function(item, detail) {
    var cost = PREMIUM_CONFIG[item] || 0;
    if (cost <= 0) return false;
    var data = _getStorage();
    if (!data || data.balance < cost) return false;
    data.balance -= cost;
    data.totalSpent += cost;
    if (!data.unlockedPremium) data.unlockedPremium = {};
    data.unlockedPremium[item + '_' + Date.now()] = true;
    data.history.push({
      type: 'spend',
      reason: item,
      detail: detail || item,
      amount: -cost,
      balance: data.balance,
      time: new Date().toISOString()
    });
    _save(data);
    return true;
  };

  PointsSystem.canAfford = function(item) {
    var cost = PREMIUM_CONFIG[item] || 0;
    return cost > 0 && PointsSystem.getBalance() >= cost;
  };

  PointsSystem.checkDailyLogin = function() {
    var data = _getStorage();
    if (!data) return 0;
    var today = new Date().toISOString().slice(0, 10);
    if (data.dailyLoginDate === today) return 0;
    data.dailyLoginDate = today;
    var earned = PointsSystem.earn('DAILY_LOGIN', '每日登录');
    _save(data);
    return earned;
  };

  PointsSystem.recordReferral = function(code) {
    var data = _getStorage();
    if (!data) return false;
    if (data.referrals.indexOf(code) >= 0) return false;
    data.referrals.push(code);
    _save(data);
    return true;
  };

  PointsSystem.getShareLink = function(baseUrl) {
    var code = PointsSystem.getReferralCode();
    if (!code) return baseUrl || window.location.href;
    var url = new URL(baseUrl || window.location.href);
    url.searchParams.set('ref', code);
    return url.toString();
  };

  PointsSystem.switchUser = function(username) {
    _currentUser = username || '';
    return _init();
  };

  PointsSystem.getRewardConfig = function() {
    return Object.assign({}, REWARD_CONFIG);
  };

  PointsSystem.getPremiumConfig = function() {
    return Object.assign({}, PREMIUM_CONFIG);
  };

  PointsSystem.getStats = function() {
    var data = _getStorage();
    if (!data) return { balance: 0, totalEarned: 0, totalSpent: 0, referrals: 0, historyCount: 0 };
    return {
      balance: data.balance,
      totalEarned: data.totalEarned,
      totalSpent: data.totalSpent,
      referrals: data.referrals.length,
      historyCount: data.history.length
    };
  };

  window.PointsSystem = PointsSystem;
})();
