# ENG-CMP-08｜用户互动与许愿池工程设计

> 对应 PRD：CMP-08 用户互动与许愿池系统  
> 状态：已确认  
> 核心交付：互动事件、管理员时间线、用户反馈、许愿池、路线图闭环。

---

# 一、工程结论

本组件拆为五个运行模块：

```text
用户互动事件
→ 管理员互动看板
→ 用户反馈
→ 许愿池
→ 愿望治理与路线图
```

工程实现必须使用服务端和数据库。纯 `localStorage` 无法满足管理员跨设备查看和愿望公开治理。

学生、教师保持匿名免注册；管理员使用 CMP-01 正式账号。

---

# 二、代码结构

```text
assets/js/
├─ event-client.js
├─ feedback-client.js
└─ wish-pool-client.js

server/modules/events/
├─ event.routes.js
├─ event.schemas.js
├─ event.service.js
├─ event.repository.js
└─ event-catalog.service.js

server/modules/feedback/
├─ feedback.routes.js
├─ feedback.schemas.js
├─ feedback.service.js
└─ feedback.repository.js

server/modules/wishes/
├─ wish.routes.js
├─ wish.schemas.js
├─ wish.service.js
├─ wish-state-machine.js
└─ wish.repository.js

server/modules/admin/
├─ dashboard.routes.js
├─ interaction.routes.js
├─ feedback-admin.routes.js
├─ wish-admin.routes.js
└─ audit.routes.js

admin/
├─ index.html
├─ interactions.html
├─ actor.html
├─ feedback.html
├─ wishes.html
├─ roadmap.html
├─ audit.html
├─ admin.js
└─ admin.css

wish-pool.html
```

---

# 三、用户互动事件模块

## 3.1 客户端队列

EventClient 负责：

- 白名单校验；
- 事件补全；
- 优先级；
- 内存批次；
- 本机离线队列；
- sendBeacon；
- 重试；
- 数据关闭开关。

本机键：

```text
tt_event_queue_v1
tt_event_queue_meta_v1
```

队列对象：

```json
{
  "version": 1,
  "items": [],
  "lastFlushAt": 1710000000000,
  "dropped": {
    "low": 0,
    "normal": 0,
    "critical": 0
  }
}
```

## 3.2 服务端接收

`POST /api/v1/events/batch`：

```text
请求体大小检查
→ 公共字段 Schema
→ analytics 开关/必要事件判断
→ 事件目录查找
→ payload 白名单过滤
→ actor/session upsert
→ eventId 去重
→ 批量事务写入
→ 返回逐条状态
```

不合法事件不落入正式事件表，可按计数记录拒绝原因，避免将恶意 payload 放进错误日志。

## 3.3 会话管理

服务端收到新 sessionId：

- actor 不存在则创建；
- session 不存在则创建；
- 更新 actor lastSeen；
- 更新 session lastPage、scriptId、eventCount；
- session_ended 可补 endedAt；
- 无 session_ended 时由最后事件时间估算展示，不回写为精确结束事实。

---

# 四、管理员互动看板

## 4.1 页面结构

### 总览 `admin/index.html`

卡片：

- 今日匿名用户；
- 今日会话；
- 剧本开始；
- 剧本完成；
- 测试完成；
- AI 请求；
- 规则降级；
- 新反馈；
- 新愿望。

列表：

- 最近异常；
- 最近反馈；
- 热门愿望；
- 近期剧本完成情况。

### 互动查询 `admin/interactions.html`

筛选：

```text
时间范围
actorId
sessionId
角色
页面
剧本
幕次
事件类型
AI 模式
客户端版本
```

列表列：

```text
时间
匿名用户
会话
事件
剧本/幕次
业务摘要
页面
版本
traceId
```

### 用户时间线 `admin/actor.html`

头部：

- actorId；
- 角色；
- 首次/最近出现；
- 会话数；
- 剧本数；
- 是否关闭分析；
- 数据状态。

时间线按会话分组：

```text
进入首页
查看剧本详情
开始剧本
进入第一幕
查看证据
做出选择
获得卡牌
答题错误
完成测试
生成复盘
提交反馈
提交愿望
```

## 4.2 业务摘要器

后台不直接显示 JSON。

```js
EventPresenter.present(event, contentRegistry)
```

示例：

```text
choice_selected
→ 在《美国独立战争》第一幕选择「先查看证据」
```

显示名称来自内容注册表，若内容版本已变化：

```text
节点 ar_choice_001（当前名称：先查看证据）
事件版本：ar-2026-08-04
```

找不到名称时显示 ID，不猜测。

## 4.3 查询分页

使用 cursor，不使用大 offset：

```text
cursor = occurredAt + eventId
```

默认 50，最大 100。

匿名时间线默认 30 天，最大 500 条；更大范围需 owner 导出权限，P1 实现。

## 4.4 看板统计

MVP 直接 SQL 聚合：

- COUNT DISTINCT actor_id；
- COUNT sessions；
- 按 event name；
- 按 scriptId；
- 按 mode；
- 按日期。

不做复杂漏斗引擎。固定漏斗可定义：

```text
script_viewed
→ script_started
→ quiz_started
→ quiz_completed
→ learning_review_generated
```

---

# 五、用户反馈模块

## 5.1 入口

全局悬浮入口保持克制，不遮挡剧情按钮。

来源：

- 页面反馈；
- 剧本节点反馈；
- 知识点反馈；
- 导学卡反馈；
- 复盘卡反馈。

前端调用：

```js
FeedbackClient.open({
  sourceType: 'game',
  scriptId,
  actId,
  nodeId
});
```

## 5.2 表单

字段：

- 类型；
- 标题；
- 具体内容；
- 是否同意作为公开案例引用；
- 联系方式可选，比赛 MVP 建议不展示。

表单不自动附带完整页面 HTML、截图和 localStorage。

## 5.3 状态

```text
new
→ triaged
→ in_progress
→ resolved

new/triaged
→ rejected
```

管理员字段：

- category；
- priority；
- assignee；
- internalNote；
- publicReply。

## 5.4 用户状态查询

提交后返回 `publicId`。用户可在本机“我的反馈”查看：

- 已收到；
- 已查看；
- 处理中；
- 已解决。

MVP 不建立消息推送。状态由用户主动打开页面查询。

## 5.5 重复与关联

管理员可以关联：

- scriptId；
- nodeId；
- knowledgeId；
- aiRunId；
- GitHub Issue；
- PRD 路径。

反馈合并 P1，P0 可先用 `duplicate_of` 字段或内部备注。

---

# 六、许愿池用户端

## 6.1 页面区域

`wish-pool.html`：

```text
顶部说明
我要许愿
热门剧本
热门功能
子衿讲什么
洛书聊什么
正在调研
已进入计划
开发中
已经实现
```

## 6.2 提交表单

### type=script

- 想开发哪个历史剧本；
- 为什么；
- 哪个知识点/问题最难；
- 年级和教材章节可选。

### type=feature

- 想增加什么功能；
- 当前遇到的问题；
- 希望怎样使用；
- 关联页面/剧本可选。

### type=zijin_question

- 希望子衿讲清的问题；
- 关联历史知识点可选。

### type=luoshu_question

- 希望洛书讨论的道法问题；
- 关联价值标签可选。

## 6.3 提交约束

- 标题 2—80 字；
- 原因 2—500 字；
- 问题 0—500 字；
- 每 actor 每日最多 5 条；
- 网络哈希限制异常批量提交；
- 默认 pending_review；
- allowPublic=false 的愿望不进入公开池，但管理员可查看；
- 服务端纯文本存储与输出转义。

## 6.4 公开列表

只有状态以下内容公开：

```text
public
researching
planned
developing
implemented
```

不公开：

```text
pending_review
needs_more_info
rejected
```

`duplicate` 详情页跳转主愿望或显示已合并。

## 6.5 点亮

- 每 actor 每愿望一票；
- 点亮可取消；
- 操作幂等；
- 公开计数来自缓存字段，数据库唯一约束为事实；
- 被审核下线后不能继续点亮；
- 用户不能点亮自己的未公开愿望。

## 6.6 热度排序

MVP：

```text
score = vote_count + freshness_bonus + status_bonus
```

建议不做隐蔽复杂算法。页面标明“按点亮和近期活跃排序”。

`freshness_bonus` 仅用于相同票数排序，避免旧愿望永久占顶。

---

# 七、愿望治理后台

## 7.1 管理列表

筛选：

- 类型；
- 状态；
- 优先级；
- 负责人；
- 目标版本；
- 关联剧本；
- 创建时间；
- 点亮数；
- 是否可能重复。

批量操作比赛版只支持批量分类，不支持批量删除和批量实现。

## 7.2 审核

管理员看到：

- 原始标题/原因；
- 建议公开标题/原因；
- actor 历史愿望数；
- 同类候选；
- 关联剧本/知识点；
- 是否含联系方式或敏感内容。

审核动作：

- 公开；
- 需要补充；
- 重复；
- 暂不采纳；
- 拒绝。

公开文本可做最小编辑：

- 去除个人信息；
- 修正明显错别字；
- 保留用户原意；
- 不擅自改变需求范围。

原文内部保留。

## 7.3 状态机

合法主路径：

```text
pending_review
→ public
→ researching
→ planned
→ developing
→ implemented
```

分支：

```text
pending_review → needs_more_info
pending_review/public/researching → duplicate
pending_review/public/researching/planned → not_planned
pending_review → rejected
```

`not_planned` 可以回到 `researching`，需要填写原因。

`implemented` 回退需 owner 权限，并填写“实现撤回/重新开发”原因。

## 7.4 合并重复

输入 sourceWishId 和 targetWishId。

事务：

1. 锁定/读取两个愿望；
2. 验证类型兼容；
3. 将来源票迁移到目标，按 actor 去重；
4. 重算目标票数；
5. 来源设 duplicate_of；
6. 写状态历史；
7. 写公开说明；
8. 写审计；
9. 返回目标愿望。

不得简单相加票数造成一人多票。

## 7.5 产品路线图

路线图来自愿望数据，不另建手工副本。

分栏：

```text
正在调研 researching
已经计划 planned
正在开发 developing
已经实现 implemented
```

卡片：

- 标题；
- 类型；
- 点亮数；
- 公开回复；
- 目标版本；
- 最后更新时间。

`targetVersion` 为空时不展示虚假日期。

---

# 八、管理员回复

回复分：

- public：用户可见；
- internal：仅管理员。

公开回复原则：

- 说明当前判断；
- 不承诺无法确定的上线日期；
- 解释暂不采纳原因；
- 实现后说明入口和版本；
- 不暴露内部人员隐私和安全信息。

回复修改保留审计。P0 可以不支持删除，只支持追加更正。

---

# 九、AI 辅助治理边界

比赛后可增加相似愿望推荐，但 AI 不能自动：

- 公开用户内容；
- 删除愿望；
- 合并点亮；
- 设置已实现；
- 承诺版本。

P0 所有治理动作由管理员确认。

若做相似推荐，只返回候选及理由，不执行写操作。

---

# 十、权限

| 操作 | viewer | editor | owner |
|---|---:|---:|---:|
| 查看事件 | 是 | 是 | 是 |
| 查看匿名时间线 | 是 | 是 | 是 |
| 查看反馈/愿望 | 是 | 是 | 是 |
| 更新反馈 | 否 | 是 | 是 |
| 审核愿望 | 否 | 是 | 是 |
| 合并愿望 | 否 | 是 | 是 |
| 变更路线图状态 | 否 | 是 | 是 |
| 导出事件 | 否 | 否/P1 | 是 |
| 删除 actor 数据 | 否 | 否 | 是 |
| 查看完整审计 | 否 | 部分 | 是 |

所有写操作 CSRF + Origin + 审计。

---

# 十一、数据删除与匿名化

用户在设置中请求清除本机数据，不等于服务端数据删除，因为匿名用户可能没有账号绑定。

提供两种机制：

1. 本机立即清除：actorId、进度、队列、生成卡；
2. 服务端删除请求：使用当前 actorId 生成一次性删除请求，由管理员或自动流程处理。

服务端处理：

- 删除或匿名化 actor 事件；
- feedback/wish 作者改为匿名；
- 保留公共愿望内容时移除 actor 关联；
- 保留必要审计但移除用户标识；
- 写删除审计。

比赛版至少完成隐私文档和管理员手工删除流程，自动化 P1。

---

# 十二、代码任务

| 任务 | 交付 | 验收 |
|---|---|---|
| IW-ENG-01 | EventClient | 离线、重试、去重 |
| IW-ENG-02 | events API/repository | 白名单入库 |
| IW-ENG-03 | 管理互动列表 | 筛选与 cursor |
| IW-ENG-04 | actor 时间线 | 跨会话可解释 |
| IW-ENG-05 | feedback 客户端/API | 来源关联完整 |
| IW-ENG-06 | feedback 管理页 | 状态和回复闭环 |
| IW-ENG-07 | wish-pool 页面/API | 提交、列表、点亮 |
| IW-ENG-08 | 愿望审核页 | 公开与分类 |
| IW-ENG-09 | 状态机和历史 | 非法迁移被拒绝 |
| IW-ENG-10 | 愿望合并 | 票数去重事务 |
| IW-ENG-11 | 路线图 | 直接来自愿望状态 |
| IW-ENG-12 | 权限和审计 | 写操作全追踪 |

---

# 十三、测试

## 事件

1. 合法批次入库；
2. 未知事件拒绝；
3. 非白名单字段被剔除；
4. 重复 eventId 幂等；
5. 离线恢复后上传；
6. 关闭分析不上传普通事件；
7. 事件失败不影响游戏。

## 看板

8. viewer 可查看不能修改；
9. 时间线按事件时间排序；
10. 内容版本不同仍能显示 ID；
11. 500 条上限生效；
12. 查询不返回未授权 payload。

## 反馈

13. 无正文拒绝；
14. HTML 作为纯文本；
15. 来源节点可关联；
16. editor 可更新状态；
17. public/internal 回复隔离；
18. 日志不复制正文。

## 许愿池

19. 提交默认待审核；
20. 待审核不公开；
21. 审核后公开；
22. 同 actor 重复点亮不加票；
23. 取消点亮幂等；
24. 非法状态迁移拒绝；
25. 合并后票按 actor 去重；
26. 路线图只显示四类公开状态；
27. private 愿望不进入公开列表；
28. editor 修改写审计；
29. viewer 修改返回 403；
30. 限流生效。

---

# 十四、性能与索引

关键索引：

- events(actor_id, occurred_at)；
- events(session_id, occurred_at)；
- events(name, occurred_at)；
- events(script_id, occurred_at)；
- feedback(status, created_at)；
- wishes(status, updated_at)；
- wishes(type, vote_count, updated_at)；
- wish_votes 主键(wish_id, actor_id)。

管理员查询必须有时间范围默认值，禁止默认扫描全部事件。

---

# 十五、降级与回滚

## 事件服务故障

- 本机排队；
- 管理看板显示数据延迟；
- 剧情正常。

## 反馈/许愿服务故障

- 表单保留用户输入在本机临时草稿；
- 明确提示“暂时未提交成功”；
- 不伪造成功 ID；
- 可稍后重试。

## 管理后台故障

- 公开产品继续；
- 暂停审核和状态更新；
- 不在前端暴露管理 API 数据。

## 回滚

- 前端入口可通过 feature flag 关闭；
- 数据表保留；
- 不删除已公开愿望；
- 状态机版本回滚时仍需兼容已有状态；
- 发现隐私问题时立即关闭事件上传和公开列表，保留证据排查。