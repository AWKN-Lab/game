# ENG-02｜API 与数据契约

> 状态：已确认  
> 版本：V1.0  
> Base URL：`/api/v1`  
> 编码：UTF-8  
> 时间：ISO 8601 UTC  
> ID：UUID/ULID 字符串

---

# 一、通用约定

## 1.1 响应信封

成功：

```json
{
  "success": true,
  "data": {},
  "error": null,
  "traceId": "01J4..."
}
```

失败：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数不完整",
    "fields": {
      "duration": "必须为 15、20 或 40"
    }
  },
  "traceId": "01J4..."
}
```

## 1.2 请求头

公开接口：

```text
Content-Type: application/json
X-Anonymous-Id: <uuid>
X-Session-Id: <uuid>
X-Client-Version: <git-sha-or-version>
```

管理员写接口额外要求：

```text
X-CSRF-Token: <token>
Origin: https://<production-host>
```

## 1.3 错误码

| HTTP | code | 说明 |
|---|---|---|
| 400 | VALIDATION_ERROR | Schema 校验失败 |
| 401 | AUTH_REQUIRED | 未登录或会话过期 |
| 403 | FORBIDDEN | 权限不足 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 重复点亮、状态冲突或幂等冲突 |
| 413 | PAYLOAD_TOO_LARGE | 请求体过大 |
| 422 | CONTENT_REJECTED | 文本违反公开规则或无法处理 |
| 429 | RATE_LIMITED | 频率过高 |
| 500 | INTERNAL_ERROR | 未分类服务端错误 |
| 503 | SERVICE_UNAVAILABLE | 数据库或必要依赖不可用 |

用户侧不得直接展示内部堆栈、SQL、模型响应或环境变量。

## 1.4 幂等

以下请求支持 `Idempotency-Key`：

- 事件批量上传；
- 反馈提交；
- 愿望提交；
- 导学卡和复盘卡生成。

服务端保存短期幂等结果，重复请求返回同一业务资源，不重复写入。

---

# 二、健康检查

## GET `/health/live`

只验证进程存活。

响应：

```json
{
  "success": true,
  "data": {
    "status": "live",
    "version": "2026.08.04+sha"
  },
  "error": null,
  "traceId": "..."
}
```

## GET `/health/ready`

验证：

- 配置已加载；
- SQLite 可读写；
- 迁移版本正确；
- 必要内容文件存在。

AI Provider 不作为 ready 硬依赖，因为系统可以规则降级。

---

# 三、匿名事件接口

## POST `/events/batch`

请求：

```json
{
  "sentAt": "2026-08-04T08:00:00.000Z",
  "events": [
    {
      "eventId": "01J...",
      "name": "choice_selected",
      "occurredAt": "2026-08-04T07:59:59.000Z",
      "actorId": "uuid",
      "sessionId": "uuid",
      "role": "student",
      "page": "american_revolution.html",
      "scriptId": "american_revolution",
      "payload": {
        "actId": "act_1",
        "nodeId": "ar_choice_001",
        "choiceIndex": 1,
        "choiceId": "observe_evidence"
      },
      "schemaVersion": 1
    }
  ]
}
```

约束：

- 每批 1—20 条；
- 单批解压前不超过 64 KB；
- 每个 payload 建议不超过 2 KB；
- `name` 必须在事件目录；
- 服务端忽略客户端提交的 IP、User-Agent 和管理员字段；
- 服务端自行补充接收时间、粗粒度设备信息和哈希网络标识；
- 事件去重键为 `eventId`。

响应：

```json
{
  "success": true,
  "data": {
    "accepted": 1,
    "duplicate": 0,
    "rejected": 0,
    "results": [
      {"eventId": "01J...", "status": "accepted"}
    ]
  },
  "error": null,
  "traceId": "..."
}
```

事件接口不返回用户历史，不允许修改和删除单条事件。

---

# 四、AI 教学助手接口

## POST `/teaching-assistant`

统一处理 `lesson_plan` 和 `learning_review`。

### 4.1 导学卡请求

```json
{
  "task": "lesson_plan",
  "scriptId": "american_revolution",
  "duration": 40,
  "studentLevel": "average",
  "teachingFocus": "区分根本原因、导火线和开始标志",
  "usageMode": "projection",
  "saveResult": false,
  "clientContextVersion": "content-2026-08-04"
}
```

枚举：

```text
studentLevel: weak | average | strong
usageMode: projection | self_study
duration: 15 | 20 | 40
```

服务端根据 `scriptId` 读取正式剧本元数据，不接受客户端上传整篇剧本作为可信事实。

### 4.2 导学卡响应

```json
{
  "success": true,
  "data": {
    "task": "lesson_plan",
    "mode": "ai",
    "runId": "01J...",
    "scriptId": "american_revolution",
    "contentVersion": "content-2026-08-04",
    "promptVersion": "lesson-plan-v1",
    "card": {
      "title": "美国独立战争｜40分钟导学卡",
      "objectives": ["..."],
      "recommendedActs": [
        {
          "actId": "act_1",
          "reason": "用于区分深层原因与直接冲突",
          "minutes": 8
        }
      ],
      "pauseQuestions": [
        {
          "question": "...",
          "knowledgeIds": ["ar_h01"],
          "teacherHint": "..."
        }
      ],
      "boardOutline": ["..."],
      "summary": "...",
      "homework": "..."
    },
    "warnings": []
  },
  "error": null,
  "traceId": "..."
}
```

`mode`：

- `ai`：模型生成且结构校验通过；
- `rule`：规则引擎生成；
- `ai_repaired`：模型首次格式错误，经一次修复成功。

### 4.3 学习复盘请求

```json
{
  "task": "learning_review",
  "scriptId": "american_revolution",
  "saveResult": false,
  "learningData": {
    "completed": true,
    "endingId": "ending_x",
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
        "explanation": "..."
      }
    ],
    "knowledgeSummary": [
      {
        "knowledgeId": "ar_h01",
        "correct": 0,
        "wrong": 1,
        "lastResult": "wrong"
      }
    ]
  }
}
```

禁止字段：

- 姓名；
- 手机号；
- 邮箱；
- 本机密码；
- 完整 localStorage；
- 未主动提交的自由文本。

### 4.4 学习复盘响应

```json
{
  "success": true,
  "data": {
    "task": "learning_review",
    "mode": "rule",
    "runId": "01J...",
    "scriptId": "american_revolution",
    "card": {
      "mastered": [
        {"text": "...", "knowledgeIds": ["ar_h02"]}
      ],
      "confused": [
        {"text": "...", "knowledgeIds": ["ar_h01"], "evidence": "ar_q02"}
      ],
      "whyWrong": "...",
      "actions": ["...", "...", "..."],
      "nextScript": {
        "scriptId": "game-scene",
        "reason": "..."
      }
    },
    "warnings": []
  },
  "error": null,
  "traceId": "..."
}
```

无有效测试数据时返回：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "LEARNING_DATA_INSUFFICIENT",
    "message": "请先完成该剧本的知识测试"
  },
  "traceId": "..."
}
```

---

# 五、用户反馈接口

## POST `/feedback`

请求：

```json
{
  "type": "content_error",
  "source": {
    "page": "american_revolution.html",
    "scriptId": "american_revolution",
    "actId": "act_1",
    "nodeId": "ar_choice_001",
    "runId": null
  },
  "title": "根本原因的解释看不懂",
  "content": "这里能不能再举一个简单例子？",
  "allowPublicQuote": false,
  "contact": null
}
```

`type`：

```text
content_error
interaction_problem
ai_result_problem
suggestion
other
```

限制：

- title 2—80 字；
- content 2—1000 字；
- contact 可空，MVP 不要求；
- 默认私密；
- 每匿名 ID 每小时最多 10 条；
- 原始 HTML 不允许存储，按纯文本处理。

响应：

```json
{
  "success": true,
  "data": {
    "feedbackId": "FB-20260804-0001",
    "status": "new",
    "message": "已收到"
  },
  "error": null,
  "traceId": "..."
}
```

---

# 六、许愿池公开接口

## POST `/wishes`

请求：

```json
{
  "type": "script",
  "title": "希望先开发鸦片战争",
  "reason": "这部分是中考重点，事件因果容易混淆",
  "problemToSolve": "想把背景、原因、结果和影响串起来",
  "grade": "八年级上",
  "textbookUnit": "中国开始沦为半殖民地半封建社会",
  "relatedScriptId": null,
  "allowPublic": true
}
```

`type`：

```text
script
feature
zijin_question
luoshu_question
```

响应：

```json
{
  "success": true,
  "data": {
    "wishId": "WS-20260804-0001",
    "status": "pending_review",
    "manageToken": "只返回一次的随机令牌"
  },
  "error": null,
  "traceId": "..."
}
```

服务端只保存 `manageToken` 哈希。MVP 可暂不开放用户编辑，但保留撤回接口能力。

## GET `/wishes`

查询：

```text
type=script|feature|zijin_question|luoshu_question
status=public|researching|planned|developing|implemented
sort=hot|new|updated
cursor=<opaque>
limit=20，最大 50
```

只返回已审核公开内容。

## GET `/wishes/:id`

返回愿望详情、公开回复、状态历史和当前匿名用户是否点亮。

## POST `/wishes/:id/vote`

同一 actorId 对同一愿望只能存在一条有效点亮。

响应：

```json
{
  "success": true,
  "data": {
    "voted": true,
    "voteCount": 24
  },
  "error": null,
  "traceId": "..."
}
```

## DELETE `/wishes/:id/vote`

取消点亮，幂等。

---

# 七、管理员认证接口

## POST `/admin/auth/login`

请求：

```json
{
  "username": "admin",
  "password": "***"
}
```

成功后：

- 服务端设置 Session Cookie；
- 返回 CSRF Token；
- 密码不写日志；
- 失败提示统一，不透露用户名是否存在。

## GET `/admin/auth/me`

```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "01J...",
      "username": "admin",
      "displayName": "产品管理员",
      "role": "owner"
    },
    "csrfToken": "...",
    "sessionExpiresAt": "..."
  },
  "error": null,
  "traceId": "..."
}
```

## POST `/admin/auth/logout`

删除服务端 Session，清除 Cookie。

---

# 八、管理员事件接口

## GET `/admin/events/summary`

查询维度：

- from/to；
- scriptId；
- role；
- clientVersion。

返回：

- sessions；
- uniqueActors；
- scriptStarted；
- scriptCompleted；
- choices；
- quizSubmitted；
- aiRuns；
- aiFallbacks；
- feedbackCreated；
- wishesCreated。

## GET `/admin/events`

筛选：

- actorId；
- sessionId；
- eventName；
- scriptId；
- actId；
- from/to；
- cursor；
- limit。

返回事件摘要，payload 只返回事件目录允许管理员查看的字段。

## GET `/admin/actors/:actorId/timeline`

按时间返回跨会话匿名时间线。

约束：

- 默认最近 30 天；
- 单次最多 500 条；
- 自由文本正文不混入事件时间线；
- 导出属于单独权限。

---

# 九、管理员反馈接口

```text
GET    /admin/feedback
GET    /admin/feedback/:id
PATCH  /admin/feedback/:id
POST   /admin/feedback/:id/replies
```

允许状态：

```text
new
triaged
in_progress
resolved
rejected
```

PATCH 示例：

```json
{
  "status": "triaged",
  "category": "content_clarity",
  "priority": "P1",
  "assignee": "admin-id",
  "internalNote": "需要调整第一幕导学问题"
}
```

`internalNote` 永不返回公开接口。

---

# 十、管理员许愿池接口

```text
GET    /admin/wishes
GET    /admin/wishes/:id
PATCH  /admin/wishes/:id
POST   /admin/wishes/:id/replies
POST   /admin/wishes/:id/merge
```

愿望状态：

```text
pending_review
public
researching
planned
developing
implemented
duplicate
not_planned
needs_more_info
rejected
```

状态迁移必须符合状态机，禁止从 `pending_review` 直接改成 `implemented` 而不写历史。

PATCH 示例：

```json
{
  "status": "planned",
  "priority": "P1",
  "targetVersion": "2026.09",
  "owner": "admin-id",
  "publicResponse": "已进入九月内容计划",
  "linkedPrd": "docs/prd/...",
  "linkedIssue": "https://github.com/AWKN-Lab/game/issues/12"
}
```

## POST `/admin/wishes/:id/merge`

请求：

```json
{
  "targetWishId": "WS-...",
  "reason": "重复愿望"
}
```

事务内：

1. 迁移去重点亮；
2. 来源愿望标记 duplicate；
3. 写状态历史；
4. 写审计日志；
5. 更新目标计数。

---

# 十一、管理员审计接口

## GET `/admin/audit`

查询：

- adminId；
- action；
- resourceType；
- resourceId；
- from/to。

每条记录包含：

- 管理员；
- 动作；
- 资源；
- 变更前摘要；
- 变更后摘要；
- traceId；
- 时间。

密码、Session、CSRF、AI Key 和完整用户自由文本不得写入审计详情。

---

# 十二、版本兼容

1. API 路径使用 `/v1`；
2. 事件单独携带 `schemaVersion`；
3. 服务端至少兼容当前和前一版事件 Schema；
4. 不兼容变更发布 `/v2`；
5. 新增响应字段属于兼容变更；
6. 删除字段、改枚举语义属于破坏性变更；
7. 客户端遇到未知响应字段必须忽略；
8. 服务端遇到未知请求字段默认剔除，不持久化。