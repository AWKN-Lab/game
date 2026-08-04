# ENG-CMP-05｜AI 教学助手工程设计

> 对应 PRD：CMP-05 AI 教学助手  
> 状态：已确认  
> 核心交付：教师导学卡、学生复盘卡、规则降级。

---

# 一、工程原则

1. AI 只处理已验证剧本、知识点和真实学习数据；
2. 历史事实由内容系统提供，模型不能自行扩写为事实来源；
3. 前端不保存模型密钥；
4. 输出必须是结构化 JSON 并通过 Schema；
5. 超时、供应商错误、格式错误、内容缺失均降级；
6. AI 失败不阻断原剧情和测试；
7. 每次生成记录 promptVersion、contentVersion、模式和 traceId；
8. 学生复盘的每个薄弱点必须能回指真实错题或知识点；
9. 不给学生贴人格和能力标签；
10. MVP 不开放自由聊天。

---

# 二、代码结构

```text
assets/js/
└─ ai-teaching-assistant.js

server/modules/ai/
├─ ai.routes.js
├─ ai.schemas.js
├─ ai.service.js
├─ context-builder.js
├─ prompt-builder.js
├─ output-validator.js
├─ fallback-engine.js
├─ ai-run.repository.js
└─ providers/
   ├─ provider.interface.js
   ├─ qwen.provider.js
   └─ stub.provider.js
```

配置：

```text
data/ai_prompts.json
data/rule_templates.json
data/teaching_metadata.json
```

---

# 三、前端组件

## 3.1 公共 API

```js
AiTeachingAssistant.generateLessonPlan(input)
AiTeachingAssistant.generateLearningReview(scriptId)
AiTeachingAssistant.cancelCurrentRequest()
AiTeachingAssistant.getLastResult(task, scriptId)
```

## 3.2 网络调用

前端只发送 PRD 允许字段。

```js
ApiClient.post('/api/v1/teaching-assistant', payload, {
  timeoutMs: 15000,
  idempotencyKey
});
```

前端超时后：

- 如果服务端已返回规则版，正常展示；
- 如果整个 API 不可用，调用浏览器本地规则引擎；
- 展示“基础版导学卡/复盘卡”，不展示技术错误。

## 3.3 导学卡 UI 状态

```text
idle
→ form_open
→ validating
→ loading
→ success_ai | success_rule
→ error_recoverable
```

按钮防重复：生成期间禁用；修改输入后允许重新生成。

## 3.4 复盘卡数据读取

```js
const learningData = DataStore.getLearningReviewContext(scriptId);
```

前端再次过滤：

```js
pick(learningData, [
  'completed', 'endingId', 'quizPct', 'tier',
  'attemptCount', 'playTimeSeconds',
  'wrongAnswers', 'knowledgeSummary'
]);
```

数据不足时不调用 API。

---

# 四、服务端主流程

```text
请求进入
→ Schema 校验
→ 限流与幂等
→ 按 task 选择上下文构建器
→ 从服务端内容快照读取可信数据
→ 构建 Prompt
→ 创建 ai_runs=processing（或内存状态后落库）
→ 调用 Provider
→ 解析 JSON
→ Schema 校验
→ 业务约束校验
→ 成功返回

任一步失败
→ 分类错误
→ 执行 fallback-engine
→ 写 ai_runs=fallback
→ 返回规则版
```

用户不需要重试才能得到可用结果。

---

# 五、上下文构建

## 5.1 导学卡上下文

输入：

- scriptId；
- duration；
- studentLevel；
- teachingFocus；
- usageMode。

服务端补充：

- 剧本名称；
- 年级；
- 幕次摘要；
- 关键节点；
- 知识点；
- 常见误区；
- 板书模板；
- 可用时长；
- 相关剧本；
- 内容版本。

上下文限制：

- 只选择与时长和教学重点相关的幕次；
- 不发送整篇剧本台词；
- 每个知识点只发送标题、中考表述和必要解释；
- 教学重点最多 200 字；
- 总上下文超过预算时按相关性裁剪。

## 5.2 复盘卡上下文

服务端验证：

- scriptId 有效；
- questionId 属于该剧本；
- knowledgeId 属于该剧本或允许跨学科；
- scorePct 与正确数逻辑一致时才使用；
- 客户端 explanation 只作为内容系统已知解析的 ID/摘要，不盲信任长文本。

构建内容：

- 剧本知识点摘要；
- 错题与正确答案 ID；
- 知识掌握统计；
- 完成状态；
- 推荐剧本关系。

---

# 六、Prompt 配置

`data/ai_prompts.json`：

```json
{
  "version": "prompts-2026-08-04",
  "lessonPlan": {
    "version": "lesson-plan-v1",
    "system": "你是初中历史道法教学助手……",
    "rules": [
      "只能使用上下文中的历史事实",
      "输出必须符合 JSON Schema",
      "内容控制在一页内",
      "问题要具体、可在课堂执行"
    ]
  },
  "learningReview": {
    "version": "learning-review-v1",
    "system": "你负责根据真实学习数据生成复盘……",
    "rules": [
      "不得编造学生行为",
      "每个薄弱点要有 evidenceId",
      "不得使用笨、差、没天赋等词",
      "行动建议必须可执行"
    ]
  }
}
```

Prompt 不直接写在页面 HTML 和路由代码中。

变更 Prompt：

- 更新 version；
- 运行 fixtures；
- 人工抽查；
- 记录变更原因；
- 可按环境灰度，但比赛版只保留一个稳定版本。

---

# 七、Provider 接口

```js
class AiProvider {
  async generateJson({
    task,
    systemPrompt,
    userPrompt,
    schema,
    timeoutMs,
    traceId
  }) {
    throw new Error('not implemented');
  }
}
```

Provider 返回：

```js
{
  rawText,
  parsedCandidate,
  provider,
  model,
  latencyMs,
  usage: {
    inputTokens,
    outputTokens
  }
}
```

供应商特有字段不能泄漏到路由和前端。

## 超时

- Provider timeout 建议 12 秒；
- 总接口预算 15 秒；
- 使用 AbortController；
- 超时后不继续等待模型；
- 记录 `AI_TIMEOUT` 并降级。

## 重试

仅允许一次轻量修复：

- 第一次结果可解析但缺字段：用修复 Prompt；
- 网络超时、限流、认证错误不做无界重试；
- 修复仍失败直接规则版。

---

# 八、输出 Schema

## 8.1 导学卡

```js
const LessonPlanSchema = z.object({
  title: z.string().min(2).max(80),
  objectives: z.array(z.string().min(2).max(100)).min(1).max(4),
  recommendedActs: z.array(z.object({
    actId: z.string(),
    reason: z.string().min(2).max(120),
    minutes: z.number().int().min(1).max(40)
  })).min(1).max(4),
  pauseQuestions: z.array(z.object({
    question: z.string().min(4).max(150),
    knowledgeIds: z.array(z.string()).min(1).max(4),
    teacherHint: z.string().max(150)
  })).min(2).max(4),
  boardOutline: z.array(z.string().min(2).max(120)).min(2).max(8),
  summary: z.string().min(10).max(300),
  homework: z.string().min(4).max(200)
});
```

业务校验：

- actId 必须存在；
- knowledgeIds 必须存在；
- minutes 合计不能明显超过 duration；
- 不得出现未在上下文中的专有历史实体；
- 输出不得包含 Markdown 代码块。

## 8.2 学习复盘

```js
const LearningReviewSchema = z.object({
  mastered: z.array(z.object({
    text: z.string().min(2).max(120),
    knowledgeIds: z.array(z.string()).min(1).max(4)
  })).max(5),
  confused: z.array(z.object({
    text: z.string().min(2).max(150),
    knowledgeIds: z.array(z.string()).min(1).max(4),
    evidence: z.string()
  })).max(5),
  whyWrong: z.string().min(4).max(300),
  actions: z.array(z.string().min(4).max(150)).length(3),
  nextScript: z.object({
    scriptId: z.string(),
    reason: z.string().min(4).max(180)
  }).nullable()
});
```

业务校验：

- mastered 不得引用答错且没有其他正确证据的知识点；
- confused 的 evidence 必须是 questionId/knowledgeId；
- 无错题时不能编造具体错误；
- nextScript 必须存在且不是 disabled；
- 禁用标签词检查。

---

# 九、规则降级引擎

## 9.1 导学卡规则

输入优先级：

```text
教学重点命中知识点
→ 常见误区
→ 时长适配幕次
→ 年级和基础
→ 默认核心节点
```

时长：

- 15 分钟：1 幕、2 知识点、2 问题；
- 20 分钟：2 幕、3 知识点、3 问题；
- 40 分钟：3 幕、4—5 知识点、3 问题。

基础：

- weak：时间、人物、事件、直接因果，问题短；
- average：因果链与比较；
- strong：证据、局限和价值冲突。

实现必须是确定性的，同一输入和内容版本返回同一结果。

## 9.2 复盘卡规则

```text
quizPct >= 80
→ 掌握优先，给迁移比较任务

60 <= quizPct < 80
→ 选错误最多的 1—2 个知识点

quizPct < 60
→ 回到时间线、核心概念和错题重做
```

错因模板按错误类型：

- 原因层级混淆；
- 时间顺序混淆；
- 人物与事件混淆；
- 性质/意义不完整；
- 道法概念边界混淆；
- 题干主体识别错误。

规则结果同样通过输出 Schema。

---

# 十、AI 运行记录

每次请求写 `ai_runs`：

```text
id
task
scriptId
mode
status
provider/model
promptVersion
contentVersion
inputDigest
latencyMs
tokenUsage
errorCode
traceId
createdAt
```

默认不保存：

- 完整 Prompt；
- 完整学习数据；
- AI Key；
- 供应商认证响应；
- 用户未同意保存的完整结果。

管理员看板可见：

- 成功率；
- 规则降级率；
- P50/P95 延迟；
- 错误分类；
- 按任务/剧本分布；
- promptVersion 分布。

---

# 十一、限流与成本

公开 AI 接口：

- 同 actorId 每分钟 5 次；
- 每小时 30 次；
- 同网络哈希增加滥用保护；
- 生成中同 task/scriptId 重复点击通过幂等复用。

成本控制：

- 上下文裁剪；
- 固定结构；
- 默认不要求长篇解释；
- 相同导学参数可短期缓存；
- 学生复盘不跨用户缓存；
- 管理员可查看每日调用量和规则降级量。

---

# 十二、前端渲染安全

- AI 所有文本使用 `textContent`；
- 不渲染模型返回 HTML；
- 不执行 Markdown 中的链接和脚本；
- 列表长度由 Schema 限制；
- 过长内容在服务端拒绝或截断后重新校验；
- 用户可以一键反馈“内容不准确/看不懂”。

---

# 十三、代码任务

| 任务 | 交付 | 验收 |
|---|---|---|
| AI-ENG-01 | 前端导学/复盘客户端 | 状态机与超时正常 |
| AI-ENG-02 | 服务端 route/schema | 两 task 契约通过 |
| AI-ENG-03 | 上下文构建器 | 不发送整篇剧本 |
| AI-ENG-04 | Provider 适配器 | 密钥只在服务端 |
| AI-ENG-05 | 输出 Schema/业务校验 | 幻觉引用被拒绝 |
| AI-ENG-06 | 导学规则引擎 | 无 AI 可用 |
| AI-ENG-07 | 复盘规则引擎 | 有真实证据 |
| AI-ENG-08 | ai_runs 记录 | 可追踪模式与错误 |
| AI-ENG-09 | UI 和事件 | 可反馈、可区分模式 |
| AI-ENG-10 | fixtures | valid/invalid/timeout 全覆盖 |

---

# 十四、验收

1. 主演示剧本可生成 AI 导学卡；
2. 其他四个剧本至少能生成规则版基础卡；
3. 无 AI Key 时接口仍成功返回 rule；
4. Provider 超时 15 秒内返回规则版；
5. 模型输出不存在 actId 时降级；
6. 导学分钟数合理；
7. 复盘只使用真实错题；
8. 无学习数据时明确拒绝；
9. 复盘恰好给 3 个行动；
10. 不出现人格标签；
11. 输出不能执行 HTML；
12. AI Key 不在前端、仓库和日志；
13. 管理员能看到 ai/ai_repaired/rule；
14. 重复点击不重复计费；
15. 用户反馈能关联 runId。

---

# 十五、回滚

- 前端可直接调用本地规则引擎，关闭服务端 AI；
- `AI_PROVIDER=disabled` 时强制 rule；
- Prompt 版本可回退到上一配置；
- Provider 适配器故障不影响 API 其他模块；
- 数据库保留 ai_runs，不因回滚删除；
- 发生内容安全事故时先强制规则版，再排查模型和 Prompt。