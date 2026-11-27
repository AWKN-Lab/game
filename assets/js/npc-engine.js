/**
 * NPC 对话引擎（规则层，不调 AI）
 *
 * 职责（对应 ENG-09 与 docs/npc/ 卡面规则）：
 *  1. 人设提示词装配：骨架卡 + 信任档位指令 + 记忆（按剧本隔离）；
 *  2. 信任状态：trust_triggers 驱动，单调可解释，分 low/normal/high 三档；
 *  3. 秘密门禁：信任门槛以下的秘密表述 → 违规（调用方应重试或降级规则版）；
 *  4. 数字门禁：应答中命中账本 forbidden 模式（史实参考/已废弃口径）→ 违规；
 *  5. 三层记忆：会话窗口（最近 7 轮）+ 关键记忆，按 (scriptId, npcId) 隔离；
 *  6. 四联对账：位置/持有物/伤势/人际 与剧情状态不一致 → 阻断引用。
 *
 * 数据来源：data/npc_personas.json（docs/npc/ 卡面的规则层消费视图）。
 * 约束：Node.js 内置能力，不新增 npm 依赖；浏览器端可复用纯函数（自行注入 personas）。
 */

const SESSION_WINDOW = 7;

/**
 * 从磁盘加载人设数据（仅 Node 环境使用）。
 * @param {string} [path] JSON 路径，默认仓库内 data/npc_personas.json
 * @returns {Promise<object>} personas
 */
export async function loadPersonas(path) {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const defaultPath = fileURLToPath(new URL('../../data/npc_personas.json', import.meta.url));
  const raw = await readFile(path || defaultPath, 'utf-8');
  return JSON.parse(raw);
}

/** 取单个 NPC 卡面；找不到抛错。 */
export function getPersona(personas, npcId) {
  const npc = personas.npcs.find((n) => n.npc_id === npcId);
  if (!npc) throw new Error(`unknown npc_id: ${npcId}`);
  return npc;
}

/** 信任档位：low(<2) / normal(2-4) / high(>=5)。 */
export function trustTier(trust) {
  if (trust >= 5) return 'high';
  if (trust >= 2) return 'normal';
  return 'low';
}

/**
 * 应用信任事件。delta 来自卡面 trust_triggers；越界钳制到 [-5, 10]。
 * @returns {{trust:number, tier:string, applied:boolean}}
 */
export function applyTrustEvent(state, npcId, event) {
  const persona = getPersona(state.personas, npcId);
  const rule = persona.trust_triggers.find((t) => t.event === event);
  if (!rule) return { trust: state.trust[npcId] ?? 0, tier: trustTier(state.trust[npcId] ?? 0), applied: false };
  const next = Math.max(-5, Math.min(10, (state.trust[npcId] ?? 0) + rule.delta));
  state.trust[npcId] = next;
  return { trust: next, tier: trustTier(next), applied: true };
}

/**
 * 秘密门禁：检查应答文本是否在信任不足时泄露秘密。
 * @returns {{ok:boolean, violations:Array<{secret_id:string, reason:string}>}}
 */
export function checkSecretGate(personas, npcId, text, trust) {
  const persona = getPersona(personas, npcId);
  const violations = [];
  for (const secret of persona.secrets || []) {
    const hit = secret.patterns.some((p) => new RegExp(p).test(text));
    if (hit && trust < secret.min_trust) {
      violations.push({ secret_id: secret.id, reason: `trust ${trust} < min_trust ${secret.min_trust}` });
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * 数字门禁：应答文本命中账本 forbidden 模式即违规（史实参考/已废弃口径）。
 * @returns {{ok:boolean, violations:Array<{pattern:string, label:string, script_id:string}>}}
 */
export function checkNumberGate(personas, scriptId, text) {
  const ledger = personas.ledger[scriptId] || { forbidden: [] };
  const global = personas.ledger.global || { forbidden: [] };
  const violations = [];
  for (const entry of [...(ledger.forbidden || []), ...(global.forbidden || [])]) {
    if (new RegExp(entry.pattern).test(text)) {
      violations.push({ pattern: entry.pattern, label: entry.label, script_id: scriptId });
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * 三层记忆（会话窗口层 + 关键记忆层；中期摘要层由调用方持久化）。
 * 会话按 (scriptId, npcId) 隔离：跨剧本不可见。
 */
export function createMemoryStore() {
  const turns = new Map(); // key: `${scriptId}|${npcId}` -> [{role, text, weight}]
  const keyMemories = new Map(); // key: `${scriptId}|${npcId}` -> [{text, story_time, weight}]

  function key(scriptId, npcId) {
    return `${scriptId}|${npcId}`;
  }

  return {
    /** 记录一轮对话；超出窗口的旧轮次被逐出（中期摘要由调用方处理）。 */
    addTurn(scriptId, npcId, role, text, weight = 0.5) {
      const k = key(scriptId, npcId);
      const arr = turns.get(k) || [];
      arr.push({ role, text, weight });
      if (arr.length > SESSION_WINDOW) arr.shift();
      turns.set(k, arr);
    },
    /** 当前会话窗口（最多 7 轮），仅限当前剧本。 */
    getSession(scriptId, npcId) {
      return [...(turns.get(key(scriptId, npcId)) || [])];
    },
    /** 升格关键记忆（人格加权前 25% 由调用方计算，这里只存取）。 */
    addKeyMemory(scriptId, npcId, text, storyTime, weight = 0.8) {
      const k = key(scriptId, npcId);
      const arr = keyMemories.get(k) || [];
      arr.push({ text, story_time: storyTime, weight });
      keyMemories.set(k, arr);
    },
    getKeyMemories(scriptId, npcId) {
      return [...(keyMemories.get(key(scriptId, npcId)) || [])];
    },
  };
}

/**
 * 装配系统提示词：骨架卡 + 信任档位 + 记忆（按剧本隔离）。
 * @param {object} opts { personas, npcId, scriptId, trust, session?, keyMemories? }
 * @returns {string} system prompt
 */
export function buildSystemPrompt({ personas, npcId, scriptId, trust = 0, session = [], keyMemories = [] }) {
  const npc = getPersona(personas, npcId);
  const tier = trustTier(trust);
  const tierRule = personas.trustTiers[tier];
  const lines = [
    `你是${npc.name}，${npc.role}。`,
    `外在面具：${npc.mask}`,
    `内在执念：${npc.obsession}`,
    `口头钩子：「${npc.hook}」`,
    `语言指纹——常说：${npc.catchphrases.join('、')}；避免：${npc.avoid.join('、')}。`,
    `知识边界：${npc.knowledge_boundary}`,
    `信任档位（当前 ${trust}，${tier}）：${tierRule.instruction}`,
  ];
  if (npc.secrets?.length) {
    lines.push(`秘密门槛：以下内容仅在信任达到门槛后可说——${npc.secrets.map((s) => s.description).join('；')}。`);
  }
  lines.push('示例对话（学语气，不背台词）：');
  for (const ex of npc.speech_examples) lines.push(`- ${ex}`);
  if (keyMemories.length) {
    lines.push('关键记忆（引用时带 story_time，说清"上次"是什么时候）：');
    for (const m of keyMemories) lines.push(`- [${m.story_time}] ${m.text}`);
  }
  if (session.length) {
    lines.push('最近对话：');
    for (const t of session) lines.push(`- ${t.role}: ${t.text}`);
  }
  lines.push(`剧本隔离：你只记得《${scriptId}》内发生的事，其他剧本的角色与事件一律不认识、不引用。`);
  return lines.join('\n');
}

/**
 * 四联对账（ENG-09 4.6）：NPC 引用历史前核对，任一不一致即阻断。
 * @param {object} state 剧情状态 {location, inventory:[], injuries:[], relations:{}}
 * @param {object} claims NPC 应答中的引用 {location?, items?:[], injuries?:[], relations?:{name:attitude}}
 * @returns {{ok:boolean, violations:string[]}}
 */
export function checkFourWay(state, claims = {}) {
  const violations = [];
  if (claims.location && claims.location !== state.location) {
    violations.push(`位置不一致：状态在「${state.location}」，应答称「${claims.location}」`);
  }
  for (const item of claims.items || []) {
    if (!(state.inventory || []).includes(item)) {
      violations.push(`持有物不存在：应答提及「${item}」，但不在持有清单`);
    }
  }
  for (const injury of claims.injuries || []) {
    if (!(state.injuries || []).includes(injury)) {
      violations.push(`伤势未登记：应答提及「${injury}」，但事件记录中没有`);
    }
  }
  for (const [name, attitude] of Object.entries(claims.relations || {})) {
    const known = (state.relations || {})[name];
    if (known === undefined) {
      violations.push(`人际未登记：应答提及与「${name}」的关系，但人际矩阵为空`);
    } else if (known !== attitude) {
      violations.push(`人际不一致：「${name}」状态为 ${known}，应答称 ${attitude}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

/** 一步式出话前自检：数字门禁 + 秘密门禁。任一违规，调用方应重试或降级规则版。 */
export function preSpeakCheck({ personas, npcId, scriptId, text, trust }) {
  const numberGate = checkNumberGate(personas, scriptId, text);
  const secretGate = checkSecretGate(personas, npcId, text, trust);
  return {
    ok: numberGate.ok && secretGate.ok,
    violations: [
      ...numberGate.violations.map((v) => ({ gate: 'number', ...v })),
      ...secretGate.violations.map((v) => ({ gate: 'secret', ...v })),
    ],
  };
}
