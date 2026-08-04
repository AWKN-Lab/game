# ENG-CMP-06｜学习数据与评估工程设计

> 对应 PRD：CMP-06 学习数据与评估  
> 状态：已确认  
> 本期结论：完整学习档案保留本机，服务端只接收最小复盘摘要和事件。

---

# 一、工程目标

1. 保持五个剧本旧存档可读取；
2. 把多个剧本共享或不一致的学习字段升级为按剧本存储；
3. 为学习复盘提供唯一聚合 API；
4. 记录可解释的错题、知识点与尝试历史；
5. 区分正式知识测试、卡牌练习和剧情选择；
6. 数据损坏时可恢复默认值，不导致页面白屏；
7. 不建立默认云端学生画像。

---

# 二、DataStore 版本

根结构新增：

```json
{
  "schemaVersion": 3,
  "identity": {},
  "scripts": {},
  "cards": {},
  "preferences": {},
  "generatedCards": {}
}
```

按剧本结构：

```json
{
  "scripts": {
    "american_revolution": {
      "progress": {
        "actId": "act_2",
        "dialogIndex": 84,
        "values": {},
        "updatedAt": 1710000000000
      },
      "completion": {
        "completed": true,
        "endingIds": ["ar_ending_02"],
        "bestEndingId": "ar_ending_02",
        "completedAt": 1710000000000
      },
      "playTime": {
        "totalSeconds": 1200,
        "sessions": 2,
        "lastSessionSeconds": 500
      },
      "knowledge": {
        "ar_h01": {
          "seenCount": 2,
          "correctCount": 0,
          "wrongCount": 1,
          "lastResult": "wrong",
          "lastSeenAt": 1710000000000
        }
      },
      "quiz": {
        "attempts": [],
        "bestScorePct": 60,
        "latestScorePct": 60
      },
      "wrongAnswers": [],
      "collectibles": [],
      "npcFates": {},
      "rating": {}
    }
  }
}
```

---

# 三、旧数据迁移

## 3.1 迁移入口

```js
DataStore.load()
→ detectVersion(raw)
→ migrateSequentially(raw)
→ validateNormalized(data)
→ saveIfChanged(data)
```

迁移必须按版本逐级执行：

```text
v0 → v1 → v2 → v3
```

禁止直接写一个“从任意旧版到最新版”的不可追踪大函数。

## 3.2 迁移规则

### 全局游戏时长

若旧数据只有全局总时长：

- 不伪造分剧本精确时长；
- 保存到 `legacy.unassignedPlayTime`；
- 新会话开始后按剧本累计；
- UI 可显示“历史总时长”但复盘只使用新按剧本时长。

### 布尔知识掌握

旧值：

```json
{"ar_h01": true}
```

迁移为：

```json
{
  "seenCount": 1,
  "correctCount": 1,
  "wrongCount": 0,
  "lastResult": "correct",
  "migrated": true
}
```

旧 false：只表示见过但未掌握时，迁移为 seen=1、correct=0、wrong=0、lastResult=unknown，不能凭空记一次答错。

### 错题

缺 questionId 时生成兼容 ID：

```text
legacy:<scriptId>:<index>
```

保留原题目摘要，但上传 AI 时优先使用可验证的正式 questionId。

## 3.3 迁移失败

- 先复制原始字符串到 `tt_data_recovery_backup_<timestamp>`；
- 使用默认数据启动；
- 向用户显示“本机学习记录需要修复”，提供导出原始数据；
- 不自动反复覆盖损坏数据；
- 记录本机错误，不上传完整损坏内容。

---

# 四、统一 API

## 4.1 进度

```js
DataStore.getScriptProgress(scriptId)
DataStore.saveScriptProgress(scriptId, patch)
DataStore.clearScriptProgress(scriptId)
DataStore.markScriptCompleted(scriptId, endingId)
```

## 4.2 时间

```js
DataStore.startPlaySession(scriptId)
DataStore.pausePlaySession(scriptId)
DataStore.finishPlaySession(scriptId)
DataStore.getPlayTime(scriptId)
```

计时使用 `performance.now()` 计算会话内时长，页面隐藏超过阈值时暂停，避免后台标签虚增。

## 4.3 知识点

```js
DataStore.markKnowledgeSeen(scriptId, knowledgeId)
DataStore.recordKnowledgeResult(scriptId, knowledgeId, result)
DataStore.getKnowledgeStats(scriptId)
```

## 4.4 答题

```js
DataStore.startQuizAttempt(scriptId, questionIds)
DataStore.recordQuizAnswer(scriptId, attemptId, answer)
DataStore.completeQuizAttempt(scriptId, attemptId)
DataStore.getQuizSummary(scriptId)
DataStore.getWrongAnswers(scriptId)
```

answer：

```json
{
  "questionId": "ar_q02",
  "knowledgeIds": ["ar_h01"],
  "selectedOptionId": "tax_too_high",
  "correctOptionId": "colonial_rule",
  "correct": false,
  "explanationKey": "ar_q02_explain",
  "elapsedMs": 15000,
  "answeredAt": 1710000000000
}
```

不把卡牌练习写入正式 quiz attempts。

## 4.5 评级

```js
DataStore.computeLearningTier(scriptId)
DataStore.getLearningRating(scriptId)
```

评级算法必须确定、可测试，不由 AI 直接决定。

---

# 五、复盘上下文聚合

唯一出口：

```js
DataStore.getLearningReviewContext(scriptId)
```

返回：

```json
{
  "schemaVersion": 1,
  "scriptId": "american_revolution",
  "completed": true,
  "endingId": "ar_ending_02",
  "quizPct": 60,
  "tier": "completed",
  "attemptCount": 1,
  "playTimeSeconds": 1200,
  "wrongAnswers": [
    {
      "questionId": "ar_q02",
      "knowledgeIds": ["ar_h01"],
      "selectedOptionId": "tax_too_high",
      "correctOptionId": "colonial_rule",
      "explanationKey": "ar_q02_explain"
    }
  ],
  "knowledgeSummary": [
    {
      "knowledgeId": "ar_h01",
      "seen": 2,
      "correct": 0,
      "wrong": 1,
      "lastResult": "wrong"
    }
  ]
}
```

不返回：

- 账号密码；
- 完整剧情存档；
- 所有选项历史；
- NPC 全状态；
- 卡牌收藏全文；
- 设备信息；
- 用户姓名和联系方式。

---

# 六、数据充足判断

```js
DataStore.canGenerateLearningReview(scriptId)
```

返回：

```json
{
  "allowed": false,
  "reason": "quiz_not_completed",
  "missing": ["quizAttempt"]
}
```

规则：

- 至少完成一次正式知识测试；
- 测试题数达到剧本设定的最低值；
- answer 数据能关联 questionId；
- 只有剧情完成、没有测试时可生成“剧情回顾”，但不得称为学习诊断；比赛 MVP 可直接提示先测试。

---

# 七、错题治理

## 7.1 去重与历史

同一题多次答错：

- `wrongAnswers` 保留每次 attempt 记录；
- UI 默认聚合显示最近一次和累计错误次数；
- 复盘上下文可只发送最近一次 + wrongCount；
- 答对后不删除历史，知识点 lastResult 更新为 correct。

## 7.2 错误类型

规则系统可通过 question metadata 标记：

```text
cause_level
chronology
person_event
nature_significance
civics_boundary
subject_identification
other
```

错因类型来源于题目配置，不让模型凭答案自由分类后成为唯一事实。

## 7.3 清理

用户可以：

- 清空某剧本错题；
- 清空全部本机学习数据；
- 导出 JSON；
- 不提供虚假云端找回。

清空前二次确认，操作后事件只记录 `learning_data_cleared` 类型和范围，不上传被删除内容。

---

# 八、生成结果本机保存

`generatedCards`：

```json
{
  "lessonPlans": {
    "american_revolution": [
      {
        "runId": "01J...",
        "mode": "rule",
        "input": {
          "duration": 40,
          "studentLevel": "average",
          "usageMode": "projection"
        },
        "result": {},
        "createdAt": 1710000000000,
        "contentVersion": "content-..."
      }
    ]
  },
  "learningReviews": {}
}
```

限制：

- 每剧本每类最多保留最近 5 份；
- 超出删除最旧；
- 用户可清除；
- AI/规则模式都保存；
- 教学重点自由文本只保存在本机时，应在隐私说明中明确。

---

# 九、事件与本机数据一致性

顺序：

```text
业务动作
→ DataStore 成功写入
→ GameHooks/EventClient 发事件
```

禁止先发“完成”事件再写存档。

若本机写入失败：

- 不发完成事件；
- 显示存储失败提示；
- 允许用户导出临时结果；
- 不让管理员后台误认为已完成。

事件系统不是恢复数据源，不从服务器事件重建完整存档。

---

# 十、存储容量与清理

浏览器 localStorage 容量有限。

控制：

- 不保存大型图片、音频和完整 AI Prompt；
- 错题解析使用 key，正文来自内容文件；
- 历史尝试每剧本最多保留 20 次，超过聚合旧尝试；
- 生成卡每类最多 5 份；
- 事件离线队列独立，最多 200 条；
- 保存前估算序列化大小；
- 超过软阈值时先清理低价值缓存，不删除进度和错题。

---

# 十一、代码任务

| 任务 | 交付 | 验收 |
|---|---|---|
| DATA-ENG-01 | schema v3 | 结构可校验 |
| DATA-ENG-02 | 顺序迁移器 | 旧数据不丢 |
| DATA-ENG-03 | 按剧本计时 | 不再共享时长 |
| DATA-ENG-04 | quiz attempts | 多次尝试可追溯 |
| DATA-ENG-05 | knowledge stats | 布尔升级为统计 |
| DATA-ENG-06 | review context | 只返回白名单 |
| DATA-ENG-07 | 数据不足判断 | 不编造复盘 |
| DATA-ENG-08 | 导出/清除 | 用户可控制 |
| DATA-ENG-09 | 容量治理 | 超限不丢核心数据 |

---

# 十二、测试

1. 空数据返回默认结构；
2. v0/v1/v2 顺序迁移到 v3；
3. 迁移重复执行幂等；
4. 全局旧时长不被伪分配；
5. 五剧本进度互不覆盖；
6. 页面隐藏时计时暂停；
7. 同一题多次答错保留历史；
8. 后续答对更新 lastResult；
9. 卡牌练习不影响 quizPct；
10. review context 不包含密码和完整存档；
11. 数据不足不调用 AI；
12. 存储损坏可备份和恢复默认；
13. 超容量先清理生成缓存；
14. 清空某剧本不影响其他剧本；
15. 导出 JSON 可重新导入或至少可读。

---

# 十三、回滚

- 新 DataStore 保留旧读取兼容至少一个大版本；
- 旧代码回滚时不得覆盖 schema v3；
- 建议写双读、单写新结构，短期提供旧 API 适配；
- 出现迁移问题时停止自动保存，保留 recovery backup；
- 不用服务器事件覆盖本机进度；
- 回滚不删除用户错题和生成卡。