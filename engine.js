// ========== GAME_CONFIG (剧本配置，各剧本HTML覆盖) ==========
window.GAME_CONFIG = window.GAME_CONFIG || {
  scriptId: 'french_revolution',
  title: '时空剧场 - 法国大革命',
  values: { freedom: 50, equality: 50, rule: 50, justice: 50 },
  valueLabels: { freedom: '自由', equality: '平等', rule: '规则', justice: '正义' },
  valueColors: { freedom: '#4169e1', equality: '#32cd32', rule: '#4682b4', justice: '#dc143c' },
  charConfig: {
    fulina: { name: '子衿', color: '#ff69b4', dir: 'zijin', defaultExpr: 'normal' },
    hutao: { name: '洛书', color: '#ff4500', dir: 'luoshu', defaultExpr: 'normal' },
    louis: { name: '路易十六', color: '#4169e1', dir: 'npc', defaultExpr: 'louis_king', file: 'louis_king' },
    robespierre: { name: '罗伯斯庇尔', color: '#2f4f4f', dir: 'npc', defaultExpr: 'robespierre', file: 'robespierre' },
    napoleon: { name: '拿破仑', color: '#8b0000', dir: 'npc', defaultExpr: 'napoleon', file: 'napoleon' },
    marie: { name: '玛丽·安托瓦内特', color: '#9932cc', dir: 'npc', defaultExpr: 'marie', file: 'marie' }
  },
  speakerNameToKey: null,  // null means use speaker directly as key
  sceneBGM: {},
  CARDS: {
    human_rights: {
      name: "人权宣言卡", knowledge: "尊重和保障人权",
      description: "触发'人权保护'状态，所有角色获得生命权、自由权、财产权保护",
      effect: {"justice": 20}, color: "#ffd700"
    },
    freedom: {
      name: "自由卡", knowledge: "自由与法治的关系",
      description: "触发'自由行动'状态，可在法律范围内自由移动和决策",
      effect: {"freedom": 15}, color: "#4169e1"
    },
    equality: {
      name: "平等卡", knowledge: "法律面前人人平等",
      description: "触发'人人平等'状态，消除所有身份特权和歧视",
      effect: {"equality": 15}, color: "#32cd32"
    },
    fairness: {
      name: "公平卡", knowledge: "公平的内涵与价值",
      description: "触发'公平分配'状态，所有资源和机会平均分配",
      effect: {"justice": 20}, color: "#ff8c00"
    },
    justice: {
      name: "正义卡", knowledge: "正义的要求",
      description: "触发'正义审判'状态，所有非正义行为都会受到相应惩罚",
      effect: {"justice": 15}, color: "#dc143c"
    },
    rule_of_law: {
      name: "法治卡", knowledge: "全面依法治国",
      description: "触发'法治秩序'状态，建立新的法律体系，规范所有人的行为",
      effect: {"rule": 15}, color: "#4682b4"
    },
    labor: {
      name: "劳动卡", knowledge: "劳动的意义与价值",
      description: "触发'劳动光荣'状态，所有劳动者获得应有的尊重和报酬",
      effect: {"labor": 15}, color: "#daa520"
    },
    responsibility: {
      name: "责任卡", knowledge: "承担社会责任",
      description: "触发'责任担当'状态，所有角色必须履行自己的法定义务",
      effect: {"responsibility": 15}, color: "#8b4513"
    }
  },
  NPC_FATE_CONFIG: {
    anna:   { name: '安娜', title: '面包店学徒', avatar: '👩‍🍳', stateLabels: { unknown: '未知', alive: '生还', injured: '受伤', awakened: '觉醒', worried: '担忧' } },
    pierre: { name: '皮埃尔', title: '巴黎青年', avatar: '⚔️', stateLabels: { unknown: '未知', awakened: '觉醒', radical: '激进', dead: '阵亡', survived: '生还' } },
    jacques: { name: '雅克', title: '国民自卫军', avatar: '🛡️', stateLabels: { unknown: '未知', doubt: '怀疑', order: '回归秩序', disappointed: '失望' } },
    alice:  { name: '艾莉丝', title: '王宫侍女', avatar: '👑', stateLabels: { unknown: '未知', shaken: '动摇', exiled: '流亡', survived: '海外生存' } }
  },
  ESSAY_QUESTIONS: [
    {
      q: "结合法国大革命，谈谈你对'法治与自由的关系'的理解。",
      template: "①法治与自由相互联系、不可分割。\n②法治标定了自由的界限，自由的实现不能触碰法律的红线。\n③法治是自由的保障，人们合法的自由和权利不受非法干涉和侵害。\n④结合材料：法国大革命中，《人权宣言》以法律形式确立了自由平等原则，但恐怖统治时期对自由的践踏说明，没有法治保障的自由会走向反面。\n⑤结论：有边界才有秩序，守底线才享有自由。",
      related: ["k_freedom_law", "k_declaration"],
      values: ["freedom", "rule"]
    },
    {
      q: "法国大革命中，第三等级为什么要争取平等？请运用'平等'的有关知识加以说明。",
      template: "①平等是人类的崇高理想，是社会发展的永恒主题。\n②同等情况同等对待：第三等级人口占全国98%却只有少数代表权，违反了权利公平。\n③不同情况差别对待：贵族和教士享有免税特权，违反了规则公平。\n④法律面前人人平等是社会主义法治的基本原则。\n⑤结合材料：法国封建等级制度中，第三等级承担重税却无政治权利，这种不平等最终导致了革命的爆发。",
      related: ["k_fair", "k_equality"],
      values: ["equality", "justice"]
    },
    {
      q: "如何评价拿破仑的对外战争？请从'正义'的角度进行分析。",
      template: "①正义是法治追求的基本价值目标之一，是社会制度的重要价值。\n②拿破仑对外战争具有双重性质：\n  进步性：在废除各地封建特权的同时，传播了自由民主思想。\n  局限性：也对当地人民进行压榨和掠夺，损害了当地人民的利益。\n③真正的正义应该促进社会进步、维护公共利益。\n④结合材料：拿破仑战争前期传播革命思想具有正义性，后期的侵略掠夺则走向了正义的反面。",
      related: ["k_napoleon_code", "k_justice"],
      values: ["justice", "freedom"]
    },
    {
      q: "从法国大革命的历史中，我们可以得到哪些关于'公平正义'的启示？",
      template: "①公平是个人生存和发展的重要保障，是社会稳定和进步的重要基础。\n②正义是社会和谐的的基本条件，守护正义需要勇气和智慧。\n③法国大革命启示我们：\n  - 制度保障公平：立法要公平对待每个人，司法要维护合法权益。\n  - 个人维护公平：面对不公要敢于说'不'，采用合理合法的方式。\n  - 公正司法是维护公平正义的最后一道防线。\n④结论：公平正义是人类永恒的追求，需要法治和德治共同保障。",
      related: ["k_fair", "k_justice", "k_equality"],
      values: ["justice", "equality", "rule"]
    },
    {
      q: "《人权宣言》和社会主义核心价值观都强调'自由、平等'，这说明了什么？",
      template: "①说明了自由平等是人类共同的追求，不分国界和历史时期。\n②《人权宣言》首次以法律形式宣告了人权、法治、自由、平等原则。\n③社会主义核心价值观社会层面也包含'自由、平等、公正、法治'。\n④法治是自由的保障，法律面前人人平等是法治的基本原则。\n⑤结合材料：从法国大革命到今天，人类对公平正义的追求从未停止，法治是实现这些价值的必由之路。",
      related: ["k_declaration", "k_freedom_law", "k_napoleon_code"],
      values: ["freedom", "equality", "rule"]
    }
  ],
  QUIZ_DATA: [
    { q: "法国大革命开始的标志是什么？", opts: ["A. 三级会议召开", "B. 攻占巴士底狱", "C. 人权宣言发表", "D. 拿破仑上台"], ans: 1, explain: "1789年7月14日，巴黎人民攻占巴士底狱，标志着法国大革命爆发。" },
    { q: "《人权宣言》的核心主张是什么？", opts: ["A. 君权神授", "B. 天赋人权、自由平等", "C. 君主立宪", "D. 殖民扩张"], ans: 1, explain: "《人权宣言》确立了人权、法治、自由、平等的基本原则。" },
    { q: "自由与法治的关系是什么？", opts: ["A. 自由高于法治", "B. 法治保障自由，自由在法治框架内", "C. 法治限制自由", "D. 两者无关"], ans: 1, explain: "法治与自由相互联系、不可分割，法治是自由的保障。" },
    { q: "以下哪项不属于法律面前人人平等的表现？", opts: ["A. 平等保护", "B. 平等遵守", "C. 所有公民享有相同的权利", "D. 平等反对特权"], ans: 2, explain: "平等不意味着所有人享有完全相同的权利，而是指法律适用上的平等。" },
    { q: "法国大革命对我们今天的启示是什么？", opts: ["A. 革命是解决问题的唯一方式", "B. 自由平等是人类的共同追求，法治是实现它们的保障", "C. 历史不会重演", "D. 强人政治最有效"], ans: 1, explain: "法国大革命告诉我们，自由平等是人类永恒的追求，而法治是保障这些价值的基础。" }
  ],
  endingConditions: {
    afterlifeMinItems: 5,
    afterlifeValueKey: 'justice',
    afterlifeMinValue: 70,
    dramaticMinHighCount: 2,
    dramaticMinValue: 80
  },
  endingTitles: null,
  totalKnowledge: 7,
  hasNpcFateSummary: true
};

// ============================================================
// 卡牌数据
// ============================================================
const CARDS = GAME_CONFIG.CARDS;

// ============================================================
// 正式事件钩子（权威数据源，DOM 监听仅兜底）
// ============================================================
function ttCurrentAct() {
  var el = document.getElementById('sceneLabel');
  return el ? String(el.textContent || '').trim() : '';
}

function ttHook(name, payload) {
  try {
    if (!window.GameHooks || typeof window.GameHooks.emit !== 'function') return false;
    payload = payload || {};
    if (!payload.scriptId) payload.scriptId = (window.GAME_CONFIG && GAME_CONFIG.scriptId) || '';
    return window.GameHooks.emit(name, payload);
  } catch (error) {
    return false;
  }
}

let ttLastActId = '';
function ttEmitActEnter(actId, actTitle) {
  var key = String(actId || '').trim();
  if (!key || key === ttLastActId) return;
  ttLastActId = key;
  ttHook('script.act_enter', { actId: key, actTitle: String(actTitle || key).trim() });
}

// ============================================================
// 立绘显示辅助（兼容 wrapper 结构和直接 img 结构）
// ============================================================
function getCharEl(side) {
  var wrap = document.getElementById('char-' + side + '-wrap');
  return wrap || document.getElementById('char-' + side);
}
function showCharEl(side) {
  var el = getCharEl(side);
  if (el) el.style.display = (el.tagName === 'DIV' ? 'block' : 'block');
}
function hideCharEl(side) {
  var el = getCharEl(side);
  if (el) el.style.display = 'none';
}
function setCharSrc(side, src) {
  var img = document.getElementById('char-' + side);
  if (img) img.src = src;
}

// ============================================================
// 状态管理
// ============================================================
let dialogIndex = 0;
let isTyping = false;
let typingTimer = null;
let gameValues = { ...GAME_CONFIG.values };
let valueLabels = { ...GAME_CONFIG.valueLabels };
let collectedItems = [];  // 收集品追踪
let collectedKnowledge = [];  // 知识点碎片追踪
let wrongChoices = [];  // 选错记录（用于论述题复习卡）
let quizScore = 0;        // 知识测试得分
let lastChoiceIndex = -1; // 记录玩家上次选择的选项索引

// ============================================================
// Menu按钮 - 简单确认对话框
// ============================================================
function confirmMenu() {
  if (confirm('确定要返回主页吗？当前游戏进度已自动保存。')) {
    window.location.href = 'index.html';
  }
}

// 记录游戏开始时间（用于精确计算游戏时长）
window._gameStartTime = window._gameStartTime || Date.now();

// ============================================================
// 初始化游戏HUD
// ============================================================
function initGameHUD() {
  // 先检查存档，有存档则恢复进度
  var savedProgress = DataStore.loadProgress(GAME_CONFIG.scriptId);
  if (savedProgress && savedProgress.dialogIndex > 0) {
    dialogIndex = savedProgress.dialogIndex;
    gameValues = savedProgress.gameValues || { ...GAME_CONFIG.values };
    collectedItems = savedProgress.collectedItems || [];
    if (savedProgress.npcFate) npcFate = savedProgress.npcFate;
  } else {
    dialogIndex = 0;
    gameValues = { ...GAME_CONFIG.values };
  }
  valueLabels = { ...GAME_CONFIG.valueLabels };
  document.getElementById('gameScene').style.backgroundImage = "url('game/images/bg/opera_house.jpg')";
  renderValueHUD();
  showDialogLine();

  // 播放BGM - 从 GAME_CONFIG.sceneBGM 读取第一个场景的 BGM
  if (typeof AudioManager !== 'undefined') {
    var firstSceneBGM = null;
    if (GAME_CONFIG.sceneBGM) {
      var bgmKeys = Object.keys(GAME_CONFIG.sceneBGM);
      if (bgmKeys.length > 0) firstSceneBGM = GAME_CONFIG.sceneBGM[bgmKeys[0]];
    }
    if (firstSceneBGM) {
      AudioManager.playBGM(firstSceneBGM);
    }
  }

  // 初始化语音管理器
  if (typeof VoiceManager !== 'undefined') {
    VoiceManager.init(function(success) {
      if (success) {
        console.log('[Game] 语音系统就绪');
      } else {
        console.warn('[Game] 语音系统不可用，将以纯文本模式运行');
      }
    });
  }

  // 存档已在 initGameHUD 中恢复，此处无需重复
}

// ============================================================
// 渲染数值HUD
// ============================================================
function renderValueHUD() {
  const hud = document.getElementById('valueHud');
  const colors = GAME_CONFIG.valueColors;
  const fallbackColors = { labor: '#daa520', responsibility: '#8b4513', life: '#ff69b4', reform: '#FF8C00', patriotism: '#DC143C', democracy: '#4fc3f7' };
  const allColors = { ...fallbackColors, ...colors };
  hud.innerHTML = '';
  for (const [key, label] of Object.entries(valueLabels)) {
    const val = gameValues[key] || 0;
    const color = allColors[key] || '#ff6b35';
    const item = document.createElement('div');
    item.className = 'value-item';
    item.innerHTML = `
      <span class="value-label">${label}</span>
      <div class="value-bar-wrap">
        <div class="value-bar-fill" style="width:${val}%;background:${color}"></div>
      </div>
      <span class="value-num">${val}</span>
    `;
    hud.appendChild(item);
  }
}

// ============================================================
// 更新数值
// ============================================================
function updateValue(key, amount) {
  if (gameValues[key] !== undefined) {
    gameValues[key] = Math.max(0, Math.min(100, gameValues[key] + amount));
  }
  renderValueHUD();
  DataStore.saveProgress({ scriptId: GAME_CONFIG.scriptId, dialogIndex, gameValues: {...gameValues}, collectedItems: [...collectedItems], currentAct: '' });
  // 数值变化音效
  if (typeof AudioManager !== 'undefined') {
    AudioManager.playSFX(amount > 0 ? AudioManager.SFX.VALUE_UP : AudioManager.SFX.VALUE_DOWN);
  }
}
// ============================================================
// 显示对话行
// ============================================================
function showDialogLine() {
  if (dialogIndex >= DIALOG_SCRIPT.length) return;
  const line = DIALOG_SCRIPT[dialogIndex];

  // 处理幕间过渡
  if (line.type === 'act_transition') {
    showActTransition(line.actTitle, line.actSubtitle, line.hookText);
    dialogIndex++;
    return;
  }

  // 处理幕末钩子（黑屏字幕）
  if (line.type === 'hook') {
    showActTransition('', '', line.text);
    dialogIndex++;
    return;
  }

  // 处理条件对话（基于已使用的卡牌）
  if (line.type === 'if_card_used') {
    if (usedCards.has(line.cardId)) {
      // 卡牌已使用，显示条件对话
      showDialogLine(); // 递归调用下一个节点
    } else {
      dialogIndex++; // 跳过条件对话
      showDialogLine(); // 继续下一个
    }
    return;
  }

  // 处理收集品
  if (line.type === 'collectible') {
    showCollectibleNotification(line.name);
    dialogIndex++;
    return;
  }

  // 处理知识点碎片
  if (line.type === 'knowledge') {
    if (!collectedKnowledge) collectedKnowledge = [];
    if (!collectedKnowledge.find(k => k.id === line.id)) {
      collectedKnowledge.push({ id: line.id, name: line.name, desc: line.desc, category: line.category });
      showKnowledgeCard(line);
    }
    dialogIndex++;
    return;
  }

  // 处理条件收集品
  if (line.type === 'collectible_conditional') {
    if (line.condition && line.condition()) {
      showCollectibleNotification(line.name);
    }
    dialogIndex++;
    return;
  }

  // 处理结局判定
  if (line.type === 'ending_check') {
    showEnding();
    return;
  }

  // 处理选择
  if (line.type === 'choice') {
    showChoices(line);
    return;
  }

  // 处理卡牌选择
  if (line.type === 'card_choice') {
    showCardChoice(line);
    return;
  }

  // 处理命运档案事件
  if (line.type === 'npc_fate_event') {
    updateNpcFate(line.npcId, line.newState, line.eventText);
    dialogIndex++;
    // 非阻塞：直接继续下一行，不等toast
    showDialogLine();
    return;
  }

  // 处理证物调查
  if (line.type === 'evidence') {
    showEvidence(line);
    return;
  }

  // 处理限压抉择
  if (line.type === 'pressure_choice') {
    showPressureChoice(line);
    return;
  }

  // 更新背景
  if (line.bg) {
    document.getElementById('gameScene').style.backgroundImage = `url('${line.bg}')`;
  }

  // 更新场景标签 + 切换场景BGM + 环境音效
  if (line.scene) {
    document.getElementById('sceneLabel').textContent = line.scene;
    ttEmitActEnter(line.scene, line.scene);
    // 根据场景切换 BGM 和环境音效
    if (typeof AudioManager !== 'undefined') {
      var sceneBGM = GAME_CONFIG.sceneBGM;
      // 环境音效映射（雨声等）
      var sceneAmbient = {
        '第二幕 · 巴士底狱': AudioManager.SFX.RAIN,       // 攻占巴士底狱 - 下雨
        '第五幕 · 滑铁卢': AudioManager.SFX.RAIN_HEAVY,   // 滑铁卢 - 暴雨
      };
      var bgmSrc = sceneBGM[line.scene];
      if (bgmSrc && AudioManager._lastSceneBGM !== line.scene) {
        AudioManager.playBGM(bgmSrc);
        AudioManager._lastSceneBGM = line.scene;
      }
      // 环境音效
      var ambientSrc = sceneAmbient[line.scene];
      if (ambientSrc && AudioManager._lastAmbient !== line.scene) {
        AudioManager.playAmbient(ambientSrc);
        AudioManager._lastAmbient = line.scene;
      } else if (!ambientSrc && AudioManager._lastAmbient) {
        AudioManager.stopAmbient();
        AudioManager._lastAmbient = null;
      }
    }
  }

  const speakerEl = document.getElementById('dialogSpeaker');
  const textEl = document.getElementById('dialogText');
  const continueEl = document.getElementById('dialogContinue');
  const dotEl = document.getElementById('speakerDot');
  const nameEl = document.getElementById('speakerName');

  var cp = document.getElementById('choicePanel');
  cp.style.display = 'none';
  cp.style.pointerEvents = 'none';

  const charLeft = document.getElementById('char-left');
  const charRight = document.getElementById('char-right');

  // 角色配置
  const charConfig = GAME_CONFIG.charConfig;

  // 解析 speaker key（支持 speakerNameToKey 映射）
  let speakerKey = line.speaker;
  if (GAME_CONFIG.speakerNameToKey && GAME_CONFIG.speakerNameToKey[line.speaker]) {
    speakerKey = GAME_CONFIG.speakerNameToKey[line.speaker];
  }

  if (line.speaker && charConfig[speakerKey]) {
    const cfg = charConfig[speakerKey];
    speakerEl.style.display = 'flex';
    dotEl.style.background = cfg.color;
    nameEl.textContent = cfg.name;
    nameEl.style.color = cfg.color;
  } else {
    speakerEl.style.display = 'none';
  }

  // 角色立绘显示逻辑：根据 charLeft/charRight 推断角色

  // NPC表情名 → charConfig key 的映射
  const npcExprToKey = { 'louis_king': 'louis', 'louis': 'louis', 'robespierre': 'robespierre', 'napoleon': 'napoleon', 'marie': 'marie' };

  // 推断左侧角色
  if (line.charLeft) {
    let leftSpeaker = line.speaker;
    let leftExpr = line.charLeft;
    // 如果 charLeft 表情属于 fulina 系列
    if (['excited', 'marie_royal', 'serious', 'normal'].includes(line.charLeft) && charConfig['fulina']) {
      leftSpeaker = 'fulina';
    }
    // 如果 charLeft 表情属于 NPC 系列
    if (npcExprToKey[line.charLeft]) {
      leftSpeaker = npcExprToKey[line.charLeft];
    }
    const lCfg = charConfig[leftSpeaker];
    if (lCfg) {
      setCharSrc('left', `game/images/characters/${lCfg.dir}/${leftExpr}.png`);
      showCharEl('left');
    }
  } else if (line.speaker && charConfig[speakerKey] && (speakerKey === 'fulina' || npcExprToKey[speakerKey] !== undefined)) {
    const cfg = charConfig[speakerKey];
    setCharSrc('left', `game/images/characters/${cfg.dir}/${cfg.defaultExpr}.png`);
    showCharEl('left');
  } else {
    hideCharEl('left');
  }

  // 推断右侧角色
  if (line.charRight) {
    let rightSpeaker = 'hutao';
    let rightExpr = line.charRight;
    const rCfg = charConfig[rightSpeaker];
    if (rCfg) {
      setCharSrc('right', `game/images/characters/${rCfg.dir}/${rightExpr}.png`);
      showCharEl('right');
    }
  } else if (line.speaker === 'hutao' && charConfig['hutao']) {
    const cfg = charConfig['hutao'];
    setCharSrc('right', `game/images/characters/${cfg.dir}/${cfg.defaultExpr}.png`);
    showCharEl('right');
  } else {
    hideCharEl('right');
  }

  // 旁白时隐藏角色
  if (!line.speaker) {
    hideCharEl('left');
    hideCharEl('right');
  }

  // ---- 语音播放 ----
  var voiceSpeakerId = line.speaker || 'narrator';
  try {
    if (typeof VoiceManager !== 'undefined' && VoiceManager.isEnabled() && VoiceManager.isAvailable()) {
      var voiceInfo = VoiceManager.play(voiceSpeakerId, dialogIndex, 'dialog');
      if (voiceInfo && voiceInfo.duration) {
        var textLen = line.text.length;
        var charsPerSec = textLen / voiceInfo.duration;
        var dynamicInterval = Math.max(20, Math.min(80, 1000 / charsPerSec));
        typeText(textEl, line.text, continueEl, dynamicInterval);
      } else {
        typeText(textEl, line.text, continueEl);
      }
      // 预加载后续3条语音
      try { VoiceManager.preload([dialogIndex + 1, dialogIndex + 2, dialogIndex + 3], 'dialog'); } catch(e) {}
    } else {
      typeText(textEl, line.text, continueEl);
    }
  } catch(voiceErr) {
    console.warn('[Game] 语音播放异常，降级为纯文本:', voiceErr);
    typeText(textEl, line.text, continueEl);
  }
}

// ============================================================
// 幕间过渡
// ============================================================
function showActTransition(title, subtitle, hookText) {
  ttEmitActEnter(title, subtitle || title);
  // 停止当前语音
  if (typeof VoiceManager !== 'undefined') VoiceManager.stop();
  let overlay = document.getElementById('actTransitionOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'actTransitionOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;opacity:0;transition:opacity 0.5s';
    document.body.appendChild(overlay);
  }
  const hookHtml = hookText ? `<div class="act-hook-text">${hookText}</div>` : '';
  overlay.innerHTML = `<div style="font-size:60px;color:#d4a574;font-weight:bold;margin-bottom:20px">${title}</div><div style="font-size:36px;color:#aabbcc">${subtitle}</div>${hookHtml}`;
  overlay.style.display = 'flex';
  setTimeout(() => overlay.style.opacity = '1', 50);
  const duration = hookText ? 4500 : 2500;
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; showDialogLine(); }, 500);
  }, duration);
}

// ============================================================
// 收集品通知（动态创建版本）
// ============================================================
function showCollectibleNotification(name) {
  // 停止当前语音
  if (typeof VoiceManager !== 'undefined') VoiceManager.stop();
  if (!collectedItems.includes(name)) collectedItems.push(name);
  DataStore.saveProgress({ scriptId: GAME_CONFIG.scriptId, dialogIndex, gameValues: {...gameValues}, collectedItems: [...collectedItems], currentAct: '' });
  // 收集品音效
  if (typeof AudioManager !== 'undefined') {
    AudioManager.playSFX(AudioManager.SFX.COLLECTIBLE);
  }
  let el = document.getElementById('collectibleToastDynamic');
  if (!el) {
    el = document.createElement('div');
    el.id = 'collectibleToastDynamic';
    el.style.cssText = 'position:fixed;top:100px;left:50%;transform:translateX(-50%);background:rgba(26,42,90,0.9);border:2px solid #d4a574;padding:16px 30px;border-radius:12px;z-index:2000;text-align:center;opacity:0;transition:all 0.4s;pointer-events:none;backdrop-filter:blur(8px);box-shadow:0 8px 30px rgba(0,0,0,0.4)';
    document.body.appendChild(el);
  }
  el.innerHTML = `<div style="font-size:20px;color:#d4a574;font-weight:bold">✨ 获得收集品！</div><div style="font-size:16px;color:#fff;margin-top:5px">${name}</div>`;
  el.style.opacity = '1';
  el.style.pointerEvents = 'auto';
  el.style.top = '100px';
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.style.top = '80px';
    setTimeout(() => showDialogLine(), 400);
  }, 2500);
}

// ============================================================
// 知识点碎片卡片
// ============================================================
function showKnowledgeCard(line) {
  ttHook('script.knowledge_open', {
    knowledgeId: line.id || line.name || '',
    title: String(line.name || '').slice(0, 200)
  });
  if (typeof AudioManager !== 'undefined') {
    AudioManager.playSFX(AudioManager.SFX.COLLECTIBLE);
  }
  let el = document.getElementById('knowledgeCardOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'knowledgeCardOverlay';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:2000;opacity:0;transition:opacity 0.4s;pointer-events:none';
    document.body.appendChild(el);
  }
  const categoryColors = { '公平': '#f59e0b', '自由': '#3b82f6', '平等': '#10b981', '法治': '#8b5cf6', '正义': '#ef4444' };
  const catColor = categoryColors[line.category] || '#d4a574';
  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#1a2a5a,#0f1a3a);border:2px solid ${catColor};border-radius:16px;padding:30px 40px;max-width:500px;text-align:center;box-shadow:0 0 40px ${catColor}44">
      <div style="font-size:12px;color:${catColor};letter-spacing:3px;margin-bottom:8px">📚 知识点碎片</div>
      <div style="font-size:13px;color:${catColor};background:${catColor}22;display:inline-block;padding:3px 12px;border-radius:20px;margin-bottom:12px">${line.category}</div>
      <div style="font-size:22px;color:#fff;font-weight:bold;margin-bottom:16px">${line.name}</div>
      <div style="font-size:15px;color:#c5c5d3;line-height:1.8;text-align:left">${line.desc}</div>
      <div style="margin-top:20px;font-size:13px;color:#888">已收集 ${collectedKnowledge.length}/${GAME_CONFIG.totalKnowledge} 个知识点碎片</div>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:center">
        ${Array.from({length:GAME_CONFIG.totalKnowledge}, (_, i) => `<div style="width:12px;height:12px;border-radius:50%;background:${i < collectedKnowledge.length ? catColor : '#333'};border:1px solid ${i < collectedKnowledge.length ? catColor : '#555'}"></div>`).join('')}
      </div>
    </div>`;
  el.style.display = 'flex';
  el.style.pointerEvents = 'auto';
  setTimeout(() => el.style.opacity = '1', 50);
  el.onclick = function() {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    setTimeout(() => { el.style.display = 'none'; showDialogLine(); }, 400);
  };
}

// ============================================================
// 选择后展示历史回响面板（困境选择无对错之分）
// ============================================================
function showReflectionPanel(choiceText, reflectionContent) {
  let el = document.getElementById('reflectionOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'reflectionOverlay';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:2000;opacity:0;transition:opacity 0.4s;pointer-events:none';
    document.body.appendChild(el);
  }
  // 将换行符转为HTML换行
  const formattedContent = reflectionContent.replace(/\n/g, '<br>');
  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #d4a574;border-radius:16px;padding:30px 35px;max-width:560px;box-shadow:0 0 30px rgba(212,165,116,0.2)">
      <div style="font-size:14px;color:#d4a574;font-weight:bold;margin-bottom:12px">📜 历史回响</div>
      <div style="font-size:13px;color:#d4a574;background:rgba(212,165,116,0.1);padding:8px 14px;border-radius:8px;margin-bottom:16px">你的选择：${choiceText}</div>
      <div style="font-size:14px;color:#c5c5d3;line-height:1.8">${formattedContent}</div>
      <div style="margin-top:16px;text-align:center">
        <button onclick="var w=document.getElementById('reflectionOverlay');w.style.opacity='0';w.style.pointerEvents='none';setTimeout(()=>{w.style.display='none';document.getElementById('choicePanel').style.display='none';dialogIndex++;showDialogLine()},400)"
          style="background:linear-gradient(135deg,#efbd8a,#5a3912);color:#472a03;border:none;padding:8px 24px;border-radius:8px;font-size:14px;cursor:pointer">我记住了</button>
      </div>
    </div>`;
  el.style.display = 'flex';
  el.style.pointerEvents = 'auto';
  setTimeout(() => el.style.opacity = '1', 50);
}

// ============================================================
// 论述题复习卡（结局后生成）
// ============================================================
const ESSAY_QUESTIONS = GAME_CONFIG.ESSAY_QUESTIONS;

function showEssayReviewCard() {
  // 根据收集的知识点和数值，筛选最相关的论述题
  const collectedIds = collectedKnowledge.map(k => k.id);
  let relevantEssays = ESSAY_QUESTIONS.filter(eq => {
    return eq.related.some(r => collectedIds.includes(r));
  });
  if (relevantEssays.length < 3) {
    relevantEssays = ESSAY_QUESTIONS.slice(0, 3);
  }

  // 生成知识点摘要
  const knowledgeSummary = collectedKnowledge.map(k =>
    `<div style="background:rgba(212,165,116,0.1);border-left:3px solid #d4a574;padding:10px 14px;margin-bottom:8px;border-radius:0 8px 8px 0">
      <div style="font-size:14px;color:#d4a574;font-weight:bold">${k.name}</div>
      <div style="font-size:13px;color:#aabbcc;margin-top:4px;line-height:1.6">${k.desc}</div>
    </div>`
  ).join('');

  // 生成论述题卡片
  const essayCards = relevantEssays.map((eq, i) =>
    `<div style="background:rgba(255,255,255,0.05);border:1px solid #334;border-radius:12px;padding:20px;margin-bottom:16px">
      <div style="font-size:12px;color:#888;margin-bottom:6px">论述题 ${i+1}</div>
      <div style="font-size:15px;color:#fff;font-weight:bold;margin-bottom:12px;line-height:1.6">${eq.q}</div>
      <details style="cursor:pointer">
        <summary style="font-size:13px;color:#d4a574;outline:none">📝 查看答题模板</summary>
        <pre style="margin-top:10px;font-size:13px;color:#c5c5d3;line-height:1.8;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:14px;border-radius:8px;font-family:inherit">${eq.template}</pre>
      </details>
    </div>`
  ).join('');

  // 创建复习卡页面
  let el = document.getElementById('essayReviewOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'essayReviewOverlay';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:linear-gradient(180deg,#0a0a1a,#1a1a3a);z-index:3000;overflow-y:auto;padding:30px 20px';
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div style="max-width:700px;margin:0 auto">
      <div style="text-align:center;margin-bottom:30px">
        <div style="font-size:28px;color:#d4a574;font-weight:bold">📖 论述题复习卡</div>
        <div style="font-size:14px;color:#888;margin-top:8px">${GAME_CONFIG.title} · 道法考点总结</div>
        <div style="font-size:12px;color:#666;margin-top:4px">已收集 ${collectedKnowledge.length}/${GAME_CONFIG.totalKnowledge} 个知识点碎片</div>
      </div>

      <div style="font-size:16px;color:#d4a574;font-weight:bold;margin-bottom:12px">📚 收集的知识点</div>
      ${knowledgeSummary}

      <div style="font-size:16px;color:#d4a574;font-weight:bold;margin:24px 0 12px">✍️ 论述题练习</div>
      <div style="font-size:13px;color:#888;margin-bottom:16px">点击"查看答题模板"学习答题方法，考试时结合材料灵活运用</div>
      ${essayCards}

      <div style="text-align:center;margin:30px 0">
        <button onclick="document.getElementById('essayReviewOverlay').style.display='none';document.getElementById('essayReviewOverlay').style.pointerEvents='none';showQuiz()"
          style="background:linear-gradient(135deg,#efbd8a,#5a3912);color:#472a03;border:none;padding:12px 36px;border-radius:10px;font-size:16px;cursor:pointer;font-weight:bold">
          开始知识测试 →
        </button>
      </div>
    </div>`;
  el.style.display = 'block';
  el.style.pointerEvents = 'auto';
  el.scrollTop = 0;
}

// ============================================================
// 收集品Toast（HTML版本）
// ============================================================
function showCollectibleToast(itemName) {
  const toast = document.getElementById('collectibleToast');
  document.getElementById('toastItem').textContent = itemName;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============================================================
// 结局对话数据
// ============================================================
const afterlifeDialog = GAME_CONFIG.afterlifeDialog || [
    { speaker: "旁白", text: "本庭已听取所有证词。所有在革命中逝去的灵魂，终于等到了这一刻……", color: "#c5c5d3" },
    { speaker: "路易十六", text: "我曾以为王权不可动摇……但历史证明，人民的力量才是永恒的。谢谢你，让我终于理解了这一点。", color: "#4169e1" },
    { speaker: "玛丽·安托瓦内特", text: "如果我能重来，我会选择站在人民的一边。自由和平等，不是口号，而是每个人应得的尊严。", color: "#b6c4ff" },
    { speaker: "罗伯斯庇尔", text: "我追求的正义，最终变成了恐怖……真正的正义，应该有温度，有慈悲。", color: "#dc143c" },
    { speaker: "拿破仑", text: "我用剑征服了欧洲，却无法征服时间。但我的法典，至今仍在守护着公平与正义。", color: "#32cd32" },
    { speaker: "子衿", text: "所有的灵魂都得到了安息。历史的教训，将由你们这一代来铭记和传承。", color: "#b6c4ff" },
    { speaker: "洛书", text: "生死轮回，因果相续。愿逝者安息，愿生者前行。", color: "#ffb2b8" },
    { speaker: "旁白", text: "【无罪判决】所有在革命中逝去的灵魂化作星光，永远守护着这片土地上的自由与正义。本庭裁定：革命，无罪。", color: "#c5c5d3" }
];

const dramaticDialog = GAME_CONFIG.dramaticDialog || [
    { speaker: "旁白", text: "本庭审议完毕。在这个结局里，历史走向了一个不同的方向……", color: "#c5c5d3" },
    { speaker: "玛丽·安托瓦内特", text: "我没有被送上断头台。在乡下的简朴生活中，我终于理解了人民真正需要的是什么。", color: "#b6c4ff" },
    { speaker: "子衿", text: "正义不是冰冷的法律条文，它也应该有温度。但本庭必须提醒——宽恕不等于遗忘。", color: "#b6c4ff" },
    { speaker: "旁白", text: "【有罪判决】玛丽·安托瓦内特在乡下过着简朴的生活，帮助那些贫困的农民。但历史的审判，从未真正结束。", color: "#c5c5d3" }
];

// ============================================================
// 结局对话索引追踪
// ============================================================
let endingDialog = null;
let endingDialogIndex = 0;

// ============================================================
// 显示结局
// ============================================================
function showEnding() {
  const vals = Object.keys(GAME_CONFIG.values).map(k => gameValues[k] || 0);
  const allCollected = collectedItems.length >= GAME_CONFIG.endingConditions.afterlifeMinItems;
  const afterlifeValue = gameValues[GAME_CONFIG.endingConditions.afterlifeValueKey] || 0;
  const highCount = vals.filter(v => v >= GAME_CONFIG.endingConditions.dramaticMinValue).length;
  let endBg = '';
  let endingType = '';

  if (allCollected && afterlifeValue >= GAME_CONFIG.endingConditions.afterlifeMinValue) {
    endingType = 'afterlife';
    endingDialog = afterlifeDialog;
    endBg = 'game/images/bg/ending_afterlife.jpg';
  } else if (highCount >= GAME_CONFIG.endingConditions.dramaticMinHighCount) {
    endingType = 'dramatic';
    endingDialog = dramaticDialog;
    endBg = 'game/images/bg/ending_dramatic.jpg';
  } else {
    endingType = 'historical';
    endingDialog = null;
    endBg = 'game/images/bg/ending_historical.jpg';
  }

  window._ttEndingType = endingType;
  ttHook('script.ending', { endingType: endingType, learningTier: 'pending' });

  DataStore.saveEnding(GAME_CONFIG.scriptId, endingType);
  DataStore.saveCollectibles(GAME_CONFIG.scriptId, collectedItems);
  var elapsed = Math.round((Date.now() - (window._gameStartTime || Date.now())) / 1000);
  DataStore.addPlayTime(Math.max(elapsed, 30)); // 至少30秒
  // 结局音效：停止BGM，播放转场音效
  if (typeof AudioManager !== 'undefined') {
    AudioManager.stopBGM();
    AudioManager.playSFX(AudioManager.SFX.TRANSITION);
  }
  if (endBg) document.getElementById('gameScene').style.backgroundImage = `url('${endBg}')`;
  if (GAME_CONFIG.endingTitles) {
    document.getElementById('sceneLabel').textContent = GAME_CONFIG.endingTitles[endingType] || '—— 结局 ——';
  } else {
    document.getElementById('sceneLabel').textContent = '—— 结局 ——';
  }
  hideCharEl('left');
  hideCharEl('right');
  document.getElementById('choicePanel').style.display = 'none';

  if (endingDialog) {
    // 多角色对话结局
    endingDialogIndex = 0;
    showEndingDialog(0);
  } else {
    // 历史结局：保持单段落显示
    const historicalText = GAME_CONFIG.historicalText || '【悬而未决】法国大革命历时26年，最终以波旁王朝复辟告终。但它摧毁了封建统治，传播了自由民主的进步思想，对整个世界产生了深远影响。本庭宣布：此案，悬而未决。';
    document.getElementById('dialogSpeaker').style.display = 'none';
    const textEl = document.getElementById('dialogText');
    textEl.innerHTML = historicalText;
    document.getElementById('dialogContinue').style.display = 'block';
    document.getElementById('dialogContinue').textContent = '📖 查看命运档案';
    document.getElementById('dialogContinue').onclick = () => {
      if (GAME_CONFIG.hasNpcFateSummary) {
        showNpcFateSummary();
      } else {
        showEssayReviewCard();
      }
    };
  }
}

// ============================================================
// 显示结局对话（多角色逐步对话）
// ============================================================
function showEndingDialog(index) {
  if (!endingDialog || index >= endingDialog.length) return;
  endingDialogIndex = index;

  const line = endingDialog[index];
  const speakerEl = document.getElementById('dialogSpeaker');
  const textEl = document.getElementById('dialogText');
  const continueEl = document.getElementById('dialogContinue');
  const dotEl = document.getElementById('speakerDot');
  const nameEl = document.getElementById('speakerName');

  // 显示说话者
  speakerEl.style.display = 'flex';
  dotEl.style.background = line.color;
  nameEl.textContent = line.speaker;
  nameEl.style.color = line.color;

  // ---- 语音播放 ----
  var voiceSource = endingType || 'dialog';
  var voiceSpeakerId = 'narrator';
  if (typeof VoiceManager !== 'undefined') {
    voiceSpeakerId = VoiceManager.resolveSpeakerId(line.speaker) || 'narrator';
  }
  if (typeof VoiceManager !== 'undefined' && VoiceManager.isEnabled() && VoiceManager.isAvailable()) {
    var voiceInfo = VoiceManager.play(voiceSpeakerId, index, voiceSource);
    if (voiceInfo && voiceInfo.duration) {
      var textLen = line.text.length;
      var charsPerSec = textLen / voiceInfo.duration;
      var dynamicInterval = Math.max(20, Math.min(80, 1000 / charsPerSec));
      typeText(textEl, line.text, continueEl, dynamicInterval);
    } else {
      typeText(textEl, line.text, continueEl);
    }
  } else {
    typeText(textEl, line.text, continueEl);
  }

  // 设置点击推进逻辑
  const dialogBox = document.getElementById('dialogBox');
  // 临时替换 onclick
  dialogBox.onclick = function() {
    if (isTyping) {
      // 跳过打字机效果
      clearInterval(typingTimer);
      textEl.innerHTML = line.text;
      isTyping = false;
      continueEl.style.display = 'block';
      return;
    }
    // 推进到下一句
    if (endingDialogIndex < endingDialog.length - 1) {
      showEndingDialog(endingDialogIndex + 1);
    }
    // 最后一句话的 continue 按钮在 typeText 完成后由 originalOnComplete 闭包处理
  };

  // 如果是最后一行，打字完成后显示"进入知识测试"按钮
  if (index === endingDialog.length - 1) {
    let _endingCompleted = false;
    const originalOnComplete = function() {
      if (_endingCompleted) return;
      _endingCompleted = true;
      var continueEl = document.getElementById('dialogContinue');
      if (continueEl) {
        continueEl.style.display = 'block';
        continueEl.textContent = '📖 查看命运档案';
        continueEl.onclick = function(e) {
          e.stopPropagation();
          if (GAME_CONFIG.hasNpcFateSummary) {
            showNpcFateSummary();
          } else {
            showEssayReviewCard();
          }
        };
        dialogBox.onclick = function() {
          if (GAME_CONFIG.hasNpcFateSummary) {
            showNpcFateSummary();
          } else {
            showEssayReviewCard();
          }
        };
      }
    };
    const checkTyping = setInterval(() => {
      if (!isTyping) {
        clearInterval(checkTyping);
        originalOnComplete();
      }
    }, 100);
    // 安全兜底：最多等5秒自动跳转
    setTimeout(() => {
      clearInterval(checkTyping);
      originalOnComplete();
    }, 5000);
  }
}

// ============================================================
// 知识测试
// ============================================================
const QUIZ_DATA = GAME_CONFIG.QUIZ_DATA;

// ============================================================
// 语音开关
// ============================================================
function toggleVoice() {
  if (typeof VoiceManager === 'undefined') return;
  var enabled = VoiceManager.toggle();
  var btn = document.getElementById('voiceToggle');
  if (btn) {
    btn.classList.toggle('active', enabled);
    btn.textContent = enabled ? '🔊' : '🔇';
  }
}

let quizIndex = 0;

function showQuiz() {
  quizIndex = 0;
  quizScore = 0;
  const dialogBox = document.querySelector('.dialog-box');
  dialogBox.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:14px;color:#efbd8a;margin-bottom:8px;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:0.2em;text-transform:uppercase;">Knowledge Test</div>
      <div style="font-size:24px;font-family:'Noto Serif',serif;color:#dbe1ff;margin-bottom:4px;">知识测试</div>
      <div style="font-size:13px;color:#c5c5d3;margin-bottom:20px;">共 ${QUIZ_DATA.length} 题，测试你对${GAME_CONFIG.title}的理解</div>
      <button onclick="startQuiz()" style="background:linear-gradient(135deg,#efbd8a,#5a3912);color:#472a03;border:none;padding:12px 32px;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;font-family:'Noto Serif',serif;letter-spacing:0.1em;">开始答题</button>
    </div>
  `;
  var _dc = document.getElementById('dialogContinue'); if (_dc) _dc.style.display = 'none';
}

function startQuiz() {
  quizIndex = 0;
  quizScore = 0;
  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (quizIndex >= QUIZ_DATA.length) {
    showQuizResult();
    return;
  }
  const q = QUIZ_DATA[quizIndex];
  const dialogBox = document.querySelector('.dialog-box');
  dialogBox.innerHTML = `
    <div style="padding:16px;">
      <div style="font-size:12px;color:#8f909d;margin-bottom:8px;font-family:'Plus Jakarta Sans',sans-serif;">第 ${quizIndex + 1} / ${QUIZ_DATA.length} 题</div>
      <div style="font-size:16px;color:#dbe1ff;margin-bottom:16px;line-height:1.6;">${q.q}</div>
      <div style="display:flex;flex-direction:column;gap:8px;" id="quizOptions">
        ${q.opts.map((opt, i) => `
          <button onclick="selectAnswer(${i})" id="qopt${i}" style="text-align:left;padding:10px 16px;border-radius:8px;border:1px solid rgba(68,70,81,0.5);background:rgba(18,30,64,0.6);color:#c5c5d3;cursor:pointer;font-size:14px;transition:all 0.2s;">${opt}</button>
        `).join('')}
      </div>
      <div id="quizFeedback" style="margin-top:12px;display:none;padding:12px;border-radius:8px;font-size:13px;line-height:1.5;"></div>
    </div>
  `;
}

function selectAnswer(idx) {
  const q = QUIZ_DATA[quizIndex];
  const correct = idx === q.ans;
  if (correct) quizScore++;

  ttHook('quiz.answer', {
    questionId: q.id || ('q' + (quizIndex + 1)),
    choiceIndex: idx,
    correct: correct,
    knowledgeId: q.knowledgeId || ''
  });

  // 正确/错误音效
  if (correct) { playCorrectSFX(); } else { playWrongSFX(); }

  if (!correct) {
    DataStore.saveWrongAnswer({
      question: q.q,
      userAnswer: q.opts[idx],
      correctAnswer: q.opts[q.ans],
      explanation: q.explain,
      subject: (GAME_CONFIG.title || '综合').replace('时空剧场 - ', ''),
      timestamp: Date.now()
    });
  }

  // Disable all buttons and show feedback
  document.querySelectorAll('#quizOptions button').forEach((btn, i) => {
    btn.style.pointerEvents = 'none';
    if (i === q.ans) {
      btn.style.background = 'rgba(34,197,94,0.2)';
      btn.style.borderColor = '#22c55e';
      btn.style.color = '#22c55e';
    } else if (i === idx && !correct) {
      btn.style.background = 'rgba(239,68,68,0.2)';
      btn.style.borderColor = '#ef4444';
      btn.style.color = '#ef4444';
    }
  });

  const fb = document.getElementById('quizFeedback');
  fb.style.display = 'block';
  fb.style.background = correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
  fb.style.border = `1px solid ${correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`;
  fb.style.color = correct ? '#22c55e' : '#ef4444';
  fb.innerHTML = `${correct ? '✅ 正确！' : '❌ 错误。'} ${q.explain}<br><button onclick="nextQuizQuestion()" style="margin-top:8px;background:linear-gradient(135deg,#efbd8a,#5a3912);color:#472a03;border:none;padding:8px 20px;border-radius:6px;font-size:13px;cursor:pointer;">下一题 →</button>`;
}

function nextQuizQuestion() {
  quizIndex++;
  renderQuizQuestion();
}

function showQuizResult() {
  const total = QUIZ_DATA.length;
  const pct = Math.round(quizScore / total * 100);
  const learningTier = pct >= 90 ? 'S' : pct >= 80 ? 'A' : pct >= 60 ? 'B' : 'C';
  ttHook('quiz.complete', { score: quizScore, total: total, pct: pct, learningTier: learningTier });
  ttHook('script.ending', { endingType: window._ttEndingType || 'unknown', learningTier: learningTier });
  const dialogBox = document.querySelector('.dialog-box');
  dialogBox.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:14px;color:#efbd8a;margin-bottom:8px;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:0.2em;">Quiz Complete</div>
      <div style="font-size:48px;font-weight:bold;color:${pct >= 80 ? '#22c55e' : pct >= 60 ? '#efbd8a' : '#ef4444'};margin:16px 0;">${quizScore}/${total}</div>
      <div style="font-size:16px;color:#dbe1ff;margin-bottom:4px;">正确率 ${pct}%</div>
      <div style="font-size:13px;color:#c5c5d3;margin-bottom:24px;">${pct >= 80 ? '🌟 太棒了！你对' + (GAME_CONFIG.title || '本剧本').replace('时空剧场 - ', '') + '掌握得很好！' : pct >= 60 ? '📚 不错！继续复习可以做得更好。' : '💪 加油！回顾知识点后再来挑战吧。'}</div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button onclick="location.href='script-select.html'" style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;font-family:'Noto Serif',serif;letter-spacing:0.1em;">返回剧本选择</button>
        <button onclick="restartGame()" style="background:linear-gradient(135deg,#efbd8a,#5a3912);color:#472a03;border:none;padding:12px 32px;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;font-family:'Noto Serif',serif;letter-spacing:0.1em;">重新开始</button>
      </div>
    </div>
  `;
}

function restartGame() {
  // 重置所有游戏状态
  collectedItems = [];
  collectedKnowledge = [];
  wrongChoices = [];
  quizScore = 0;
  lastChoiceIndex = -1;
  usedCards = new Set();
  endingDialog = null;
  endingDialogIndex = 0;
  initNpcFate();
  clearPressureEffects();

  document.querySelector('.dialog-box').innerHTML = `
    <div class="dialog-speaker" id="dialogSpeaker" style="display:none;">
      <span class="speaker-dot" id="speakerDot"></span>
      <span id="speakerName"></span>
    </div>
    <div class="dialog-text" id="dialogText" style="min-height:120px;"></div>
    <div id="dialogContinue" class="dialog-continue" style="display:none;">点击继续 ▼</div>
  `;
  document.getElementById('dialogContinue').textContent = '点击继续 ▼';
  document.getElementById('dialogContinue').onclick = null;
  initGameHUD();
}

// ============================================================
// 打字机效果
// ============================================================
function typeText(el, text, continueEl, interval) {
  isTyping = true;
  continueEl.style.display = 'none';
  el.innerHTML = '<span class="cursor-blink"></span>';
  let i = 0;
  clearInterval(typingTimer);
  var typeInterval = interval || 40; // 默认40ms，向后兼容
  typingTimer = setInterval(() => {
    if (i < text.length) {
      el.innerHTML = text.substring(0, i + 1) + '<span class="cursor-blink"></span>';
      i++;
    } else {
      clearInterval(typingTimer);
      el.innerHTML = text;
      isTyping = false;
      continueEl.style.display = 'block';
    }
  }, typeInterval);
}

// ============================================================
// ============================================================
// 选择题音效（Web Audio API 合成，无需外部文件）
// ============================================================
function playCorrectSFX() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    // 悦耳叮咚：C5 + E5 + G5 三音和弦，清脆风铃感
    var freqs = [523, 659, 784];
    freqs.forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      var t = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
      // 高泛音（金属质感但柔和）
      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2.76;
      gain2.gain.setValueAtTime(0.06, t);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.3);
    });
  } catch(e) {}
}

function playWrongSFX() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    // 柔和低沉提示：两个下降音，不刺耳
    var freqs = [392, 330]; // G4 → E4
    freqs.forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      var t = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch(e) {}
}

// 推进对话
// ============================================================
function advanceDialog() {
  // 停止当前语音
  if (typeof VoiceManager !== 'undefined') {
    VoiceManager.stop();
  }
  // 如果选择面板/卡牌面板/知识点卡片/收集品通知正在显示，不允许跳过
  var choicePanel = document.getElementById('choicePanel');
  var cardModal = document.getElementById('cardModal');
  var knowledgeOverlay = document.getElementById('knowledgeCardOverlay');
  var reflectionOverlay = document.getElementById('reflectionOverlay');
  var collectToast = document.getElementById('collectibleToastDynamic');
  var essayOverlay = document.getElementById('essayReviewOverlay');
  var evidenceOverlay = document.getElementById('evidenceOverlay');
  var npcFateToast = document.getElementById('npcFateToast');
  var cardStanceOverlay = document.getElementById('cardStanceOverlay');
  var pressureOverlay = document.getElementById('pressureOverlay');
  if ((choicePanel && choicePanel.style.display === 'flex') ||
      (cardModal && cardModal.style.display === 'flex') ||
      (knowledgeOverlay && knowledgeOverlay.style.display === 'flex') ||
      (reflectionOverlay && reflectionOverlay.style.display === 'flex') ||
      (essayOverlay && essayOverlay.style.display === 'block') ||
      (evidenceOverlay && evidenceOverlay.classList.contains('show')) ||
      (cardStanceOverlay && cardStanceOverlay.classList.contains('show')) ||
      (pressureOverlay && pressureOverlay.classList.contains('show')) ||
      (collectToast && collectToast.style.opacity === '1')) {
    return; // 必须先互动（选择/查收/关闭卡片）
  }
  if (isTyping) {
    clearInterval(typingTimer);
    const line = DIALOG_SCRIPT[dialogIndex];
    if (line && line.text) {
      document.getElementById('dialogText').innerHTML = line.text;
    }
    isTyping = false;
    document.getElementById('dialogContinue').style.display = 'block';
    return;
  }
  dialogIndex++;
  if (dialogIndex < DIALOG_SCRIPT.length) {
    showDialogLine();
  }
}

// ============================================================
// 显示选择
// ============================================================
function showChoices(line) {
    hideCharEl('left');
    hideCharEl('right');
  const panel = document.getElementById('choicePanel');
  panel.style.display = 'flex';
  panel.style.pointerEvents = 'auto';
  panel.innerHTML = '';
  if (line.prompt) {
    const promptEl = document.createElement('div');
    promptEl.style.cssText = 'width:100%;text-align:center;font-size:16px;color:#fff;background:rgba(0,0,0,0.7);padding:10px 16px;border-radius:8px;margin-bottom:8px;backdrop-filter:blur(4px)';
    promptEl.textContent = line.prompt;
    panel.appendChild(promptEl);
  }
  document.getElementById('dialogContinue').style.display = 'none';

  // 显示提示文本
  const textEl = document.getElementById('dialogText');
  textEl.innerHTML = '请做出你的选择……';
  document.getElementById('dialogSpeaker').style.display = 'none';

  line.choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice.text;
    btn.style.animation = `slideUp 0.3s ease ${idx * 0.1}s both`;
    btn.onclick = () => {
      // 禁用所有按钮
      const allBtns = panel.querySelectorAll('.choice-btn');
      allBtns.forEach(b => { b.style.pointerEvents = 'none'; });

      // 统一金色反馈（困境选择无对错之分）
      btn.style.background = 'rgba(212,165,116,0.25)';
      btn.style.borderColor = '#d4a574';
      btn.style.color = '#d4a574';
      btn.style.boxShadow = '0 0 20px rgba(212,165,116,0.3)';
      playCorrectSFX();

      if (choice.action === 'openCard') {
        setTimeout(() => { openCardModal(); }, 800);
        return;
      }
      lastChoiceIndex = idx;
      ttHook('script.choice', {
        nodeId: 'dialog_' + dialogIndex,
        choiceIndex: idx,
        choiceText: String(choice.text || '').slice(0, 200),
        actId: ttCurrentAct(),
        timed: false
      });
      // 应用效果
      if (choice.effects) {
        for (const [key, val] of Object.entries(choice.effects)) {
          updateValue(key, val);
        }
      }
      // 选择后展示历史回响面板
      var choiceReflectionMap = GAME_CONFIG.choiceReflectionMap || {
        '第一幕 · 凡尔赛宫': '📜 历史回响\n\n1789年，法国面临严重的财政危机。贵族和教士享有免税特权，而第三等级（平民）承担了全部税负。面包价格涨到了普通人三个月的工资。\n\n饥饿是革命的催化剂——当人们连生存都无法保障时，"秩序"和"规则"就失去了意义。\n\n1789年10月，巴黎妇女因为面包短缺向凡尔赛进发，迫使国王返回巴黎。她们没有等待"更多力量"——饥饿让等待变成了一种奢侈。\n\n但历史也告诉我们，没有组织的愤怒很容易被暴力吞噬。\n\n💭 如果你是那个跪在雪地里的母亲，你会怎么做？',
        '第二幕 · 巴士底狱': '📜 历史回响\n\n巴士底狱是法国封建专制统治的象征。1789年7月14日，约800名巴黎市民用了一天时间攻占了这座堡垒。\n\n狱中只有7名囚犯，但存有大量武器和火药。攻城战中约98名市民牺牲。\n\n这一天后来成为法国的国庆日。攻占巴士底狱的象征意义远大于军事意义——它标志着人民不再恐惧。\n\n💭 一座只关着7个人的监狱，值得用近百条生命去攻占吗？\n💭 如果"象征意义"如此重要，那"人命"的意义又在哪里？',
        '第三幕 · 国民议会': '📜 历史回响\n\n《人权宣言》第1条写道："在权利方面，人们生来是而且始终是自由平等的。"\n\n但这份宣言最初只适用于男性白人。法国殖民地奴隶制直到1794年才被废除——而仅仅8年后，拿破仑又恢复了它。\n\n妇女的政治权利直到1944年才得到承认。\n\n💭 一份伟大的文献，应该因为它"没有做到完美"而被否定吗？\n💭 还是说，正是因为它"指出了方向"，后人才有可能一步步接近那个理想？',
        '第四幕 · 恐怖统治': '📜 历史回响\n\n1793-1794年的"恐怖统治"期间，革命法庭判处了约16000-17000人死刑。\n\n很多人仅因被"举报"就被处决，没有真正的犯罪证据。\n\n罗伯斯庇尔坚信这是保卫共和国的必要手段。1794年7月，他被自己的同志送上了断头台。\n\n💭 "为了正义"和"以正义之名行不义"之间的界限，到底在哪里？\n💭 如果你是罗伯斯庇尔，面对内外夹击的革命危机，你会怎么做？',
        '第五幕 · 拿破仑': '📜 历史回响\n\n《拿破仑法典》（1804年）确立了法律面前人人平等、私有财产神圣不可侵犯等原则，影响了全球40多个国家的法律体系。\n\n但拿破仑本人通过政变上台、自称皇帝、发动战争造成数百万人死亡。\n\n他是"革命理念的传播者"还是"披着革命外衣的独裁者"？历史至今没有定论。\n\n💭 一个独裁者，能制定出一份推动人类文明的法律吗？\n💭 如果答案是"能"，那这对我们理解"制度"和"人"的关系意味着什么？',
        '第五幕 · 欧洲': '📜 历史回响\n\n拿破仑战争造成约300-600万人死亡。\n\n但它也摧毁了欧洲的封建制度，传播了法国大革命的思想。\n\n二战后的纽伦堡审判确立了一个原则："侵略战争是最高级别的国际犯罪。"但在拿破仑的时代，这个概念还不存在。\n\n💭 历史人物应该用他所在时代的标准来评判，还是用今天的标准来评判？\n💭 如果用今天的标准，那200年后的人又会怎么评判我们？'
      };
      var scene = document.getElementById('sceneLabel').textContent;
      var reflectionText = choiceReflectionMap[scene] || '📜 历史回响\n\n你的选择已经记录。历史没有标准答案，但每一个选择都值得被思考。';
      setTimeout(() => {
        showReflectionPanel(choice.text, reflectionText);
      }, 800);
      return; // 不自动推进，等历史回响面板关闭后手动推进
    };
    panel.appendChild(btn);
  });
}

// ============================================================
// 卡牌弹窗（查看功能：已获取彩色，未获取灰色）
// ============================================================
let usedCards = new Set();

function openCardModal() {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';
  for (const [id, card] of Object.entries(CARDS)) {
    const isUsed = usedCards.has(id);
    const item = document.createElement('div');
    item.className = 'card-item';
    item.style.opacity = isUsed ? '1' : '0.4';
    item.style.filter = isUsed ? 'none' : 'grayscale(100%)';
    item.style.cursor = isUsed ? 'pointer' : 'default';
    item.innerHTML = `
      <div style="margin-bottom:10px;position:relative">
        <img src="game/images/cards/card_${id}.jpg" style="width:80px;height:110px;object-fit:cover;border-radius:6px;${isUsed ? '' : 'filter:grayscale(100%)'}">
        ${isUsed ? '<div style="position:absolute;top:-4px;right:-4px;background:#22c55e;color:#fff;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:8px">已获取</div>' : ''}
      </div>
      <div class="card-name" style="${isUsed ? '' : 'color:#666'}">${card.name}</div>
      <div class="card-knowledge" style="${isUsed ? '' : 'color:#555'}">${card.knowledge}</div>
      <div class="card-desc" style="${isUsed ? '' : 'color:#555'}">${card.description}</div>
    `;
    if (isUsed) {
      item.onclick = () => showCardDetail(id);
    }
    grid.appendChild(item);
  }
  document.getElementById('cardModal').classList.add('active');
  document.getElementById('cardModal').style.pointerEvents = 'auto';
}

function showCardDetail(cardId) {
  const card = CARDS[cardId];
  if (!card) return;
  const el = document.getElementById('cardDetailOverlay');
  if (!el) return;
  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #6366f1;border-radius:16px;padding:24px;max-width:400px;text-align:center">
      <div style="margin-bottom:12px"><img src="game/images/cards/card_${cardId}.jpg" style="width:120px;height:168px;object-fit:cover;border-radius:10px;box-shadow:0 4px 16px rgba(99,102,241,0.3)"></div>
      <div style="font-size:18px;color:#fff;font-weight:bold;margin-bottom:8px">${card.name}</div>
      <div style="font-size:14px;color:#c5c5d3;line-height:1.7;margin-bottom:16px">${card.description}</div>
      <div style="font-size:13px;color:#d4a574;margin-bottom:16px">📖 ${card.knowledge}</div>
      <button onclick="document.getElementById('cardDetailOverlay').style.display='none'" style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;padding:8px 24px;border-radius:8px;font-size:14px;cursor:pointer">关闭</button>
    </div>`;
  el.style.display = 'flex';
  el.style.pointerEvents = 'auto';
}

function closeCardModal() {
  document.getElementById('cardModal').classList.remove('active');
  document.getElementById('cardModal').style.pointerEvents = 'none';
}

function useCard(cardId) {
  const card = CARDS[cardId];
  if (!card) return;
  if (usedCards.has(cardId)) {
    showCardDetail(cardId);
    return;
  }
  usedCards.add(cardId);
  ttHook('script.card', { cardId: String(cardId), action: 'use' });
  for (const [key, val] of Object.entries(card.effect)) {
    updateValue(key, val);
  }
  closeCardModal();
  showCollectibleToast(card.name + ' 已获取！');
}

function showCardChoice(line) {
    hideCharEl('left');
    hideCharEl('right');
    const panel = document.getElementById('choicePanel');
    const textEl = document.getElementById('dialogText');
    textEl.innerHTML = line.prompt || '你想使用哪张道法卡牌来解读这句话？';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = '12px';
    panel.style.alignItems = 'center';
    panel.innerHTML = `
      <div style="font-size:12px;color:#888;text-align:center;margin-bottom:4px">💡 选择卡牌 = 表明你的立场。推荐卡牌标有 ⭐</div>
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
        ${line.cards.map((card, i) => `
          <button onclick="chooseCard(${i})" style="
            background: ${card.recommend ? 'linear-gradient(135deg,rgba(40,30,10,0.92),rgba(30,25,10,0.88))' : 'rgba(15,20,45,0.92)'};
            border: 2px solid ${card.recommend ? '#ffd700' : 'rgba(212,165,116,0.4)'};
            border-radius: 16px;
            padding: 16px;
            width: 160px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
            position: relative;
            backdrop-filter: blur(6px);
          " onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.5),0 0 30px " + (card.recommend ? "rgba(255,215,0,0.2)" : "rgba(212,165,116,0.15)") + "'" onmouseout="this.style.transform='';this.style.boxShadow=''">
            ${card.recommend ? '<div style="position:absolute;top:-8px;right:-8px;background:#ffd700;color:#000;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:10px">⭐推荐</div>' : ''}
            <div style="margin-bottom:10px">
              <img src="${card.img}" style="width:100px;height:140px;object-fit:cover;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.3)">
            </div>
            <div style="font-size:15px;color:#fff;font-weight:bold;margin-bottom:6px">${card.name}</div>
            <div style="font-size:12px;color:#c5c5d3;margin-bottom:8px;line-height:1.5">${card.desc}</div>
            <div style="font-size:11px;color:${card.recommend ? '#ffd700' : '#9aa'};line-height:1.4">${card.hint}</div>
          </button>
        `).join('')}
      </div>
    `;
    window._currentCardChoice = line;
}
function chooseCard(idx) {
    const line = window._currentCardChoice;
    if (!line) return;
    // 点击音效
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSFX(AudioManager.SFX.CLICK);
    }
    const card = line.cards[idx];
    usedCards.add(card.id);
    ttHook('script.card', { cardId: String(card.id || idx), action: 'choose' });
    for (const [key, val] of Object.entries(card.effect)) {
        updateValue(key, val);
    }
    DataStore.saveProgress({ scriptId: GAME_CONFIG.scriptId, dialogIndex, gameValues: {...gameValues}, collectedItems: [...collectedItems], currentAct: '' });
    document.getElementById('choicePanel').style.display = 'none';

    // 如果卡牌有立场台词和 NPC 反馈，显示立场表态动画
    if (card.quote || card.fulinaFeedback || card.hutaoFeedback) {
      showCardStance(card, line);
    } else {
      showCollectibleToast(card.name + ' 已获取！');
      dialogIndex++;
      showDialogLine();
    }
}

function showCardStance(card, line) {
  let overlay = document.getElementById('cardStanceOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'cardStanceOverlay';
    overlay.className = 'card-stance-overlay';
    document.body.appendChild(overlay);
  }
  let html = '<div class="card-stance-content"><div class="card-stance-glow"></div>';
  if (card.quote) {
    html += `<div class="card-stance-quote">"${card.quote}"</div>`;
  }
  if (card.fulinaFeedback) {
    html += `<div class="card-npc-feedback" style="animation-delay:1.5s"><div class="npc-fb-name" style="color:#7dd3fc">子衿</div><div class="npc-fb-text">${card.fulinaFeedback}</div></div>`;
  }
  if (card.hutaoFeedback) {
    html += `<div class="card-npc-feedback" style="animation-delay:2s"><div class="npc-fb-name" style="color:#fca5a5">洛书</div><div class="npc-fb-text">${card.hutaoFeedback}</div></div>`;
  }
  html += '<div class="card-stance-continue">点击继续 ▼</div></div>';
  overlay.innerHTML = html;
  requestAnimationFrame(() => overlay.classList.add('show'));
  // 点击关闭
  overlay.onclick = function() {
    overlay.classList.remove('show');
    showCollectibleToast(card.name + ' 已获取！');
    dialogIndex++;
    showDialogLine();
  };
}

// ============================================================
// 命运档案 - NPC 命运追踪系统
// ============================================================
const NPC_FATE_CONFIG = GAME_CONFIG.NPC_FATE_CONFIG;
let npcFate = {};
function initNpcFate() {
  if (!NPC_FATE_CONFIG) return;
  npcFate = {};
  for (const id of Object.keys(NPC_FATE_CONFIG)) {
    npcFate[id] = { state: 'unknown', events: [] };
  }
}
initNpcFate();

function updateNpcFate(npcId, newState, eventText) {
  if (!NPC_FATE_CONFIG) return;
  if (!npcFate[npcId]) return;
  npcFate[npcId].state = newState;
  npcFate[npcId].events.push(eventText);
  const cfg = NPC_FATE_CONFIG[npcId];
  const stateLabel = cfg.stateLabels[newState] || newState;
  showNpcFateToast(cfg.name, stateLabel, eventText);
  // 保存进度
  DataStore.saveProgress({ scriptId: GAME_CONFIG.scriptId, dialogIndex, gameValues: {...gameValues}, collectedItems: [...collectedItems], npcFate: JSON.parse(JSON.stringify(npcFate)), currentAct: '' });
}

function showNpcFateToast(name, stateText, eventText) {
  if (!NPC_FATE_CONFIG) return;
  let el = document.getElementById('npcFateToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'npcFateToast';
    el.className = 'npc-fate-toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div class="fate-toast-title">📜 命运变更</div>
    <div class="fate-toast-name">${name}</div>
    <div class="fate-toast-event">${eventText}</div>
  `;
  // 触发显示
  requestAnimationFrame(() => {
    el.classList.add('show');
  });
  // 3 秒后隐藏
  setTimeout(() => {
    el.classList.remove('show');
  }, 3000);
}

function showNpcFateSummary() {
  if (!NPC_FATE_CONFIG) {
    showEssayReviewCard();
    return;
  }
  let overlay = document.getElementById('npcFateSummaryOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'npcFateSummaryOverlay';
    overlay.className = 'npc-fate-summary-overlay';
    document.body.appendChild(overlay);
  }
  const stateClassMap = {
    unknown: 'fate-state-unknown', alive: 'fate-state-alive', injured: 'fate-state-injured',
    awakened: 'fate-state-awakened', worried: 'fate-state-worried', radical: 'fate-state-radical',
    dead: 'fate-state-dead', survived: 'fate-state-alive', doubt: 'fate-state-doubt',
    order: 'fate-state-awakened', disappointed: 'fate-state-doubt', shaken: 'fate-state-worried',
    exiled: 'fate-state-exiled', arrested: 'fate-state-arrested'
  };
  let cardsHtml = '';
  for (const [id, cfg] of Object.entries(NPC_FATE_CONFIG)) {
    const fate = npcFate[id] || { state: 'unknown', events: [] };
    const stateLabel = cfg.stateLabels[fate.state] || fate.state;
    const stateClass = stateClassMap[fate.state] || 'fate-state-unknown';
    const lastEvent = fate.events.length > 0 ? fate.events[fate.events.length - 1] : '尚未发生交集';
    cardsHtml += `
      <div class="npc-fate-card">
        <div class="npc-avatar">${cfg.avatar}</div>
        <div class="npc-name">${cfg.name}</div>
        <div class="npc-title">${cfg.title}</div>
        <div class="npc-state ${stateClass}">${stateLabel}</div>
        <div class="npc-desc">${lastEvent}</div>
      </div>
    `;
  }
  overlay.innerHTML = `
    <div class="npc-fate-summary-panel">
      <div class="summary-title">📜 命运档案</div>
      <div class="summary-subtitle">你这次旅程，改变了谁？</div>
      <div class="npc-fate-cards">${cardsHtml}</div>
      <button class="summary-btn" onclick="closeNpcFateSummary()">继续 →</button>
    </div>
  `;
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function closeNpcFateSummary() {
  const overlay = document.getElementById('npcFateSummaryOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
  // 推进到知识测试
  showEssayReviewCard();
}

// ============================================================
// 证物调查 - 推理系统
// ============================================================
function showEvidence(line) {
  hideCharEl('left');
  hideCharEl('right');
  let overlay = document.getElementById('evidenceOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'evidenceOverlay';
    overlay.className = 'evidence-overlay';
    document.body.appendChild(overlay);
  }
  const itemsHtml = line.items.map((item, i) => `
    <div class="evidence-card" onclick="this.classList.toggle('selected')">
      <div class="ev-type">${item.type}</div>
      <div class="ev-title">${item.title}</div>
      <div class="ev-content">${item.content}</div>
    </div>
  `).join('');
  const optionsHtml = line.options.map((opt, i) => `
    <button class="evidence-option-btn" onclick="selectEvidenceOption(${i})">${opt.text}</button>
  `).join('');
  overlay.innerHTML = `
    <div class="evidence-panel">
      <div class="evidence-title">🔍 证物调查</div>
      <div class="evidence-subtitle">仔细查看以下材料，找出问题的答案</div>
      <div class="evidence-items">${itemsHtml}</div>
      <div class="evidence-question"><div class="eq-text">${line.question}</div></div>
      <div class="evidence-options" id="evidenceOptions">${optionsHtml}</div>
      <div id="evidenceFeedback"></div>
      <button class="evidence-close-btn" id="evidenceCloseBtn" style="display:none" onclick="closeEvidence()">继续 →</button>
    </div>
  `;
  window._currentEvidence = line;
  ttHook('script.evidence_open', {
    nodeId: 'evidence_' + dialogIndex,
    evidenceId: line.id || ('evidence_' + dialogIndex),
    evidenceTitle: String(line.question || '证物调查').slice(0, 200)
  });
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function selectEvidenceOption(idx) {
  const line = window._currentEvidence;
  if (!line) return;
  const opt = line.options[idx];
  ttHook('quiz.answer', {
    questionId: 'evidence_' + dialogIndex,
    choiceIndex: idx,
    correct: idx === opt.correctIndex,
    knowledgeId: line.id || ''
  });
  const btns = document.querySelectorAll('#evidenceOptions .evidence-option-btn');
  const feedbackEl = document.getElementById('evidenceFeedback');
  const closeBtn = document.getElementById('evidenceCloseBtn');
  // 禁用所有按钮
  btns.forEach((b, i) => {
    b.style.pointerEvents = 'none';
    if (i === opt.correctIndex) b.classList.add('correct');
    if (i === idx && idx !== opt.correctIndex) b.classList.add('wrong');
  });
  if (idx === opt.correctIndex) {
    feedbackEl.className = 'evidence-feedback correct';
    feedbackEl.textContent = opt.correctFeedback || '✅ 回答正确！你的推理很准确。';
    playCorrectSFX();
    if (opt.effects) {
      for (const [key, val] of Object.entries(opt.effects)) {
        updateValue(key, val);
      }
    }
  } else {
    feedbackEl.className = 'evidence-feedback wrong';
    feedbackEl.textContent = opt.wrongFeedback || '💡 不完全对。洛书提示：再仔细看看这些证物之间的关系。';
    playWrongSFX();
  }
  closeBtn.style.display = 'block';
}

function closeEvidence() {
  const overlay = document.getElementById('evidenceOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
  dialogIndex++;
  showDialogLine();
}

// ============================================================
// 限压抉择 - 倒计时紧急决策系统
// ============================================================
let pressureTimer = null;
let pressureTimeLeft = 0;
let pressureResolved = false;

function showPressureChoice(line) {
  hideCharEl('left');
  hideCharEl('right');

  // 创建红边闪烁
  let redBorder = document.getElementById('pressureRedBorder');
  if (!redBorder) {
    redBorder = document.createElement('div');
    redBorder.id = 'pressureRedBorder';
    redBorder.className = 'pressure-red-border';
    document.body.appendChild(redBorder);
  }

  // 创建倒计时 HUD
  let timerHud = document.getElementById('pressureTimerHud');
  if (!timerHud) {
    timerHud = document.createElement('div');
    timerHud.id = 'pressureTimerHud';
    timerHud.className = 'pressure-timer-hud';
    document.body.appendChild(timerHud);
  }

  // 创建主面板
  let overlay = document.getElementById('pressureOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pressureOverlay';
    overlay.className = 'pressure-overlay';
    document.body.appendChild(overlay);
  }

  const choicesHtml = line.choices.map((c, i) => `
    <button class="pressure-choice-btn" onclick="selectPressureChoice(${i})">${c.text}</button>
  `).join('');

  overlay.innerHTML = `
    <div class="pressure-content">
      <div class="pressure-urgent-text">${line.urgentText || '时间不多了，你必须立刻做出决定！'}</div>
      <div class="pressure-choices">${choicesHtml}</div>
      <div class="pressure-timeout-msg" id="pressureTimeoutMsg"></div>
    </div>
  `;

  window._currentPressure = line;
  pressureTimeLeft = line.timeout || 8;
  pressureResolved = false;

  // 显示所有元素
  requestAnimationFrame(() => {
    overlay.classList.add('show');
    redBorder.style.display = 'block';
    timerHud.textContent = pressureTimeLeft;
    timerHud.style.display = 'block';
    document.getElementById('gameScene').classList.add('pressure-shake');
  });

  // 启动倒计时
  pressureTimer = setInterval(() => {
    pressureTimeLeft--;
    timerHud.textContent = pressureTimeLeft;
    if (pressureTimeLeft <= 3) {
      timerHud.classList.add('urgent');
    }
    if (pressureTimeLeft <= 0) {
      pressureTimeout();
    }
  }, 1000);
}

function clearPressureEffects() {
  if (pressureTimer) {
    clearInterval(pressureTimer);
    pressureTimer = null;
  }
  const overlay = document.getElementById('pressureOverlay');
  if (overlay) overlay.classList.remove('show');
  const redBorder = document.getElementById('pressureRedBorder');
  if (redBorder) redBorder.style.display = 'none';
  const timerHud = document.getElementById('pressureTimerHud');
  if (timerHud) {
    timerHud.style.display = 'none';
    timerHud.classList.remove('urgent');
  }
  document.getElementById('gameScene').classList.remove('pressure-shake');
}

function pressureTimeout() {
  if (pressureResolved) return;
  pressureResolved = true;
  clearPressureEffects();
  const line = window._currentPressure;
  if (!line) return;
  const defaultIdx = line.defaultChoice || 0;
  const choice = line.choices[defaultIdx];
  ttHook('script.choice', {
    nodeId: 'pressure_' + dialogIndex,
    choiceIndex: defaultIdx,
    choiceText: '[超时默认] ' + String(choice.text || '').slice(0, 180),
    actId: ttCurrentAct(),
    timed: true
  });
  // 显示超时提示
  const textEl = document.getElementById('dialogText');
  textEl.innerHTML = `<span style="color:#fbbf24">⏰ 时间耗尽……</span><br><br>${line.timeoutText || '你犹豫太久，局势已经替你做出了选择。'}`;
  document.getElementById('dialogSpeaker').style.display = 'none';
  document.getElementById('dialogContinue').style.display = 'block';
  document.getElementById('dialogContinue').textContent = '点击继续 ▼';
  document.getElementById('dialogContinue').onclick = function() {
    document.getElementById('dialogContinue').onclick = null;
    if (choice.effects) {
      for (const [key, val] of Object.entries(choice.effects)) {
        updateValue(key, val);
      }
    }
    lastChoiceIndex = defaultIdx;
    dialogIndex++;
    showDialogLine();
  };
}

function selectPressureChoice(idx) {
  if (pressureResolved) return;
  pressureResolved = true;
  clearPressureEffects();
  const line = window._currentPressure;
  if (!line) return;
  const choice = line.choices[idx];
  ttHook('script.choice', {
    nodeId: 'pressure_' + dialogIndex,
    choiceIndex: idx,
    choiceText: String(choice.text || '').slice(0, 200),
    actId: ttCurrentAct(),
    timed: true
  });
  if (choice.effects) {
    for (const [key, val] of Object.entries(choice.effects)) {
      updateValue(key, val);
    }
  }
  lastChoiceIndex = idx;
  playCorrectSFX();
  dialogIndex++;
  showDialogLine();
}

// ============================================================
// 页面加载时自动开始游戏
// ============================================================
function initGame() {
  initGameHUD();
  // 键盘支持：空格/回车推进对话
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      advanceDialog();
    }
  });
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
