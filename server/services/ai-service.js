import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT_DIR } from '../config.js';

const metadata = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/teaching_metadata.json'), 'utf8'));
const rules = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/rule_templates.json'), 'utf8'));
const prompts = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/ai_prompts.json'), 'utf8'));

const scriptNames = {
  french_revolution: '法国大革命',
  american_revolution: '美国独立战争',
  industrial_revolution: '蒸汽时代的光与影',
  wuxu_reform: '戊戌变法',
  xinhai_revolution: '辛亥革命'
};

function scriptMeta(scriptId) {
  const value = metadata.scripts?.[scriptId];
  if (!value) throw Object.assign(new Error('未知剧本'), { code: 'UNKNOWN_SCRIPT' });
  return value;
}

function pickActs(acts, count, focus) {
  const words = String(focus || '').split(/[，。；、\s]+/).filter(Boolean);
  return acts.map((act, index) => ({
    act,
    index,
    score: words.reduce((sum, word) => sum + ([act.title, ...(act.focus || [])].join('').includes(word) ? 2 : 0), 0)
  })).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, Math.max(1, count)).sort((a, b) => a.index - b.index).map((item) => item.act);
}

export function ruleLessonPlan(input) {
  const meta = scriptMeta(input.scriptId);
  const duration = String([15, 20, 40].includes(Number(input.duration)) ? Number(input.duration) : 40);
  const durationRule = rules.lessonPlan.duration[duration];
  const levelRule = rules.lessonPlan.studentLevel[input.studentLevel] || rules.lessonPlan.studentLevel.average;
  const selected = pickActs(meta.acts, durationRule.actCount, input.teachingFocus);
  const objectives = [...new Set([
    input.teachingFocus ? `围绕“${String(input.teachingFocus).slice(0, 80)}”形成清楚表达` : null,
    ...meta.objectives
  ].filter(Boolean))].slice(0, durationRule.objectiveCount);
  return {
    title: `${scriptNames[input.scriptId]}｜${duration}分钟导学卡`,
    objectives,
    recommendedActs: selected.map((act) => ({
      id: act.id,
      title: act.title,
      minutes: Math.min(act.minutes || 8, Math.max(4, Math.floor(Number(duration) / selected.length))),
      reason: (act.focus || []).join('、') || '覆盖本节核心知识'
    })),
    pauseQuestions: meta.followupQuestions.slice(0, durationRule.questionCount),
    boardOutline: meta.boardOutline.slice(0, duration === '15' ? 3 : 5),
    summary: '请学生用“背景—事件—结果—影响”四句话收束本课，并说清本节最容易混淆的概念。',
    homework: '用四句话复述本课，再选择一个容易混淆的知识点写出区别。',
    teachingTip: `学生基础：${levelRule.label}；提问方式：${levelRule.questionStyle}；板书方式：${levelRule.boardStyle}。`,
    warnings: meta.commonMisconceptions
  };
}

export function ruleLearningReview(input) {
  const context = input.learningData || {};
  const meta = scriptMeta(input.scriptId);
  const quizPct = Number(context.quizPct || 0);
  const wrongAnswers = Array.isArray(context.wrongAnswers) ? context.wrongAnswers.slice(-8) : [];
  const knowledge = Array.isArray(context.knowledgeSummary) ? context.knowledgeSummary : [];
  let mastered = knowledge.filter((item) => item.mastered || Number(item.correct) > Number(item.wrong)).slice(0, 4).map((item) => item.title || item.knowledgeId).filter(Boolean);
  if (!mastered.length && quizPct >= 80) mastered = meta.objectives.slice(0, 3);
  if (!mastered.length && context.completed) mastered = ['已经完成剧情主线', '能够识别本课主要人物和事件'];
  let confusions = wrongAnswers.slice(0, 3).map((item) => item.question ? `需要重新理解：${String(item.question).slice(0, 120)}` : '需要复习相关知识点');
  if (!confusions.length) confusions = meta.commonMisconceptions.slice(0, quizPct >= 80 ? 1 : 3);
  let whyWrong = '当前还没有足够的测试和错题数据。先完成一次知识测试，再生成更具体的复盘。';
  if (context.completed || context.quizTotal || wrongAnswers.length) {
    if (quizPct >= 80) whyWrong = '基础知识已经比较稳，下一步要把零散知识连接成因果链，并尝试比较不同历史事件。';
    else if (quizPct >= 60) whyWrong = '主要事件已经记住，但概念区分和原因层次还不够稳定，需要把表面事件与深层原因分开。';
    else whyWrong = '目前更像是在记事件名称，时间线和“为什么发生”还没有连起来。先补核心线索，再做综合判断。';
  }
  const nextId = meta.relatedScripts?.[0] || null;
  return {
    title: `${scriptNames[input.scriptId]}｜我的学习复盘`,
    mastered,
    confusions,
    whyWrong,
    actions: rules.learningReview.defaultActions.slice(0, 3),
    nextScript: nextId ? { id: nextId, name: scriptNames[nextId], reason: '用下一部剧本比较相近概念和历史影响。' } : null,
    dataSummary: { completed: !!context.completed, quizPct, wrongCount: wrongAnswers.length, tier: context.tier || 'completed' }
  };
}

function stripThink(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
}
function extractJson(content) {
  let text = stripThink(content).trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first < 0 || last <= first) throw Object.assign(new Error('模型未返回 JSON'), { code: 'AI_INVALID_JSON' });
  return JSON.parse(text.slice(first, last + 1));
}
function coerceArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(/[\n;；。]/).map((s) => s.trim()).filter(Boolean);
  if (value === null || value === undefined) return [];
  return [String(value)];
}
function normalize(task, value, input) {
  if (task === 'lesson_plan') {
    value.objectives = coerceArray(value.objectives);
    value.recommendedActs = Array.isArray(value.recommendedActs) ? value.recommendedActs : [];
    value.pauseQuestions = coerceArray(value.pauseQuestions);
    value.boardOutline = coerceArray(value.boardOutline);
    if (typeof value.title !== 'string' || !value.title) {
      value.title = `${scriptNames[input.scriptId] || '导学'}｜导学卡`;
    }
  } else {
    value.mastered = coerceArray(value.mastered).slice(0, 6);
    value.confusions = coerceArray(value.confusions).slice(0, 6);
    value.actions = coerceArray(value.actions).slice(0, 3);
    while (value.actions.length < 3) value.actions.push('重新回顾本课核心知识点，并对照常见误区自查。');
    if (typeof value.whyWrong !== 'string' || !value.whyWrong) {
      value.whyWrong = '当前数据还不足以定位具体薄弱点，先补一次完整测试。';
    }
    if (typeof value.title !== 'string' || !value.title) {
      value.title = `${scriptNames[input.scriptId] || '学习'}｜我的学习复盘`;
    }
  }
  return value;
}

function validate(task, value) {
  if (!value || typeof value !== 'object') return false;
  if (task === 'lesson_plan') {
    return typeof value.title === 'string' && Array.isArray(value.objectives) && Array.isArray(value.recommendedActs) && Array.isArray(value.pauseQuestions) && Array.isArray(value.boardOutline) && typeof value.summary === 'string' && typeof value.homework === 'string';
  }
  return typeof value.title === 'string' && Array.isArray(value.mastered) && Array.isArray(value.confusions) && typeof value.whyWrong === 'string' && Array.isArray(value.actions) && value.actions.length === 3;
}

function buildProviders() {
  const list = [{
    tag: 'primary',
    baseUrl: config.aiBaseUrl,
    model: config.aiModel,
    apiKey: config.aiApiKey
  }];
  if (config.aiFallbackBaseUrl && config.aiFallbackApiKey) {
    list.push({
      tag: 'fallback',
      baseUrl: config.aiFallbackBaseUrl,
      model: config.aiFallbackModel || config.aiModel,
      apiKey: config.aiFallbackApiKey
    });
  }
  return list;
}

async function callOneProvider(provider, task, input) {
  const prompt = task === 'lesson_plan' ? prompts.lessonPlan : prompts.learningReview;
  const trusted = {
    scriptId: input.scriptId,
    scriptName: scriptNames[input.scriptId],
    teachingMetadata: scriptMeta(input.scriptId),
    userConditions: task === 'lesson_plan' ? {
      duration: input.duration,
      studentLevel: input.studentLevel,
      teachingFocus: String(input.teachingFocus || '').slice(0, 160),
      usageMode: input.usageMode
    } : undefined,
    learningData: task === 'learning_review' ? input.learningData : undefined
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.aiTimeoutMs);
  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: `${prompt.system}\n${prompt.instruction}` },
          { role: 'user', content: JSON.stringify(trusted) }
        ],
        temperature: 0.2,
        top_p: 0.8,
        stream: false
      }),
      signal: controller.signal
    });
    if (!response.ok) throw Object.assign(new Error(`AI HTTP ${response.status}`), { code: 'AI_HTTP_ERROR', status: response.status });
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const value = extractJson(content);
    const normalized = normalize(task, value, input);
    if (!validate(task, normalized)) throw Object.assign(new Error('AI 输出结构不完整'), { code: 'AI_SCHEMA_ERROR' });
    return { value: normalized, provider: provider.tag };
  } finally {
    clearTimeout(timer);
  }
}

async function callProvider(task, input) {
  if (!config.aiEnabled || (!config.aiApiKey && !config.aiFallbackApiKey)) {
    throw Object.assign(new Error('AI 未配置'), { code: 'AI_NOT_CONFIGURED' });
  }
  let lastError;
  for (const provider of buildProviders()) {
    try {
      return await callOneProvider(provider, task, input);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || Object.assign(new Error('AI 全部失败'), { code: 'AI_FAILED' });
}

export async function generate(task, input) {
  const fallback = () => task === 'lesson_plan' ? ruleLessonPlan(input) : ruleLearningReview(input);
  try {
    const { value, provider } = await callProvider(task, input);
    return { mode: 'ai', data: value, provider, errorCode: null };
  } catch (error) {
    return { mode: 'rule', data: fallback(), provider: 'rule', errorCode: error.name === 'AbortError' ? 'AI_TIMEOUT' : (error.code || 'AI_FAILED') };
  }
}

export function supportedScript(scriptId) {
  return Object.prototype.hasOwnProperty.call(metadata.scripts || {}, scriptId);
}
