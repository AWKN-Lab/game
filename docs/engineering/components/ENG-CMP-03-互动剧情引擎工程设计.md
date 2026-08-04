# ENG-CMP-03｜互动剧情引擎工程设计

> 对应 PRD：CMP-03 互动剧情引擎  
> 状态：已确认  
> 本期结论：只加公共钩子与稳定 ID，不重写状态机。

---

# 一、现有能力

现有 `engine.js` 已承载：

- 对话推进；
- 普通选择；
- 卡牌选择；
- 证据调查；
- 限时选择；
- 知识点；
- 收集品；
- NPC 命运；
- 幕间过渡；
- 结局判定；
- 知识测试；
- 学习评级；
- 音频和语音；
- 本机进度续玩。

本期不改变这些事件的剧情语义。

---

# 二、工程目标

1. 为所有关键互动提供统一事件出口；
2. 让事件 SDK 缺失或后端故障时引擎继续运行；
3. 让五个剧本不用各自实现埋点；
4. 提供内容版本、scriptId、actId、nodeId 的公共上下文；
5. 对旧剧本无稳定 ID 的节点使用确定性兼容 ID；
6. 建立引擎回归测试基线。

---

# 三、GameHooks 设计

## 3.1 公共接口

在 `engine.js` 最前部初始化：

```js
(function initGameHooks(global) {
  const handlers = new Set();

  global.GameHooks = global.GameHooks || {
    register(handler) {
      if (typeof handler === 'function') handlers.add(handler);
      return () => handlers.delete(handler);
    },
    emit(name, payload = {}) {
      for (const handler of handlers) {
        try {
          handler(name, payload);
        } catch (error) {
          console.warn('[GameHooks] handler failed', error);
        }
      }
    }
  };
})(window);
```

约束：

- `emit` 同步、快速、不可抛出到剧情主流程；
- handler 不允许修改传入剧情对象；
- 传入 payload 使用新对象和原始值；
- 事件客户端内部异步入队；
- 不在引擎中直接调用 `fetch`。

## 3.2 公共上下文

```js
function getGameEventContext(extra = {}) {
  return {
    scriptId: GAME_CONFIG.id,
    contentVersion: GAME_CONFIG.contentVersion || window.APP_CONTENT_VERSION,
    actId: currentActId || null,
    dialogIndex: currentDialogIndex,
    ...extra
  };
}
```

不把完整 `GAME_CONFIG`、`DIALOG_SCRIPT` 或游戏状态放入事件。

---

# 四、关键接入点

## 4.1 游戏启动

在新游戏完成初始化后：

```js
GameHooks.emit('script_started', getGameEventContext({
  resume: false,
  startActId: currentActId
}));
```

继续游戏：

```js
GameHooks.emit('script_resumed', getGameEventContext({
  resume: true
}));
```

启动事件只发送一次，避免页面重复初始化造成重复。

## 4.2 幕次进入

在 `act_transition` 完成切换时：

```js
GameHooks.emit('act_entered', getGameEventContext({
  actIndex,
  titleKey: line.titleKey || null
}));
```

不上传完整幕标题，自后台内容注册表解析。

## 4.3 普通选择

展示时：

```js
GameHooks.emit('choice_presented', getGameEventContext({
  nodeId: resolveNodeId(line),
  choiceCount: line.choices.length,
  choiceIds: line.choices.map(resolveChoiceId),
  timed: false
}));
```

选中并应用效果后：

```js
GameHooks.emit('choice_selected', getGameEventContext({
  nodeId,
  choiceId,
  choiceIndex,
  timed: false,
  elapsedMs
}));
```

事件发生顺序：

```text
用户点击
→ 引擎校验选项
→ 应用剧情效果
→ 保存本机状态
→ emit choice_selected
→ 继续剧情
```

即使事件失败，选择仍然生效。

## 4.4 限时选择

- 展示：`choice_presented`，`timed=true`；
- 用户选择：`choice_selected`；
- 超时：`pressure_choice_expired`；
- 超时后默认选项应用完成再发事件。

记录 `elapsedMs`，不上传用户鼠标轨迹。

## 4.5 证据调查

- 每个证据首次打开：`evidence_opened`；
- 重复打开不重复记首次事件，可增加 `repeat=true`；
- 完成全部必需证据：`evidence_completed`；
- 不上传证据全文。

## 4.6 知识点

知识卡真正展示后：

```js
GameHooks.emit('knowledge_opened', {
  knowledgeId,
  nodeId,
  source: 'story'
});
```

关闭卡片不必记录，除非后续需要停留时长。

## 4.7 卡牌

引擎只发领域事件：

- `card_acquired`；
- `card_used`；

图鉴页面的 `card_viewed` 由卡牌组件自己负责。

## 4.8 答题

提交后、展示解析前或后均可，但必须使用已判定结果：

```js
GameHooks.emit('quiz_answer_submitted', {
  questionId,
  knowledgeIds,
  selectedOptionId,
  correct,
  attemptNumber,
  elapsedMs
});
```

完成测试：

```js
GameHooks.emit('quiz_completed', {
  correctCount,
  questionCount,
  scorePct,
  attemptNumber,
  durationSeconds
});
```

不上传完整题目和答案文本。

## 4.9 结局与完成

- 首次解锁：`ending_unlocked`；
- 完成收尾和本机存档后：`script_completed`；
- 重看结局不重复发 firstTime=true。

---

# 五、稳定 ID

## 5.1 正式 ID 优先

优先使用剧情对象中的：

```js
line.id
choice.id
question.id
```

## 5.2 兼容 ID

旧节点无 ID 时：

```text
<scriptId>:<eventType>:<dialogIndex>
```

选项：

```text
<nodeId>:choice:<index>
```

示例：

```text
american_revolution:choice:84
american_revolution:choice:84:choice:1
```

兼容 ID 只用于当前内容版本。正式补 ID 后通过 alias/tombstone 解释旧事件。

禁止基于完整台词哈希，因为文案小改会导致 ID 漂移。

---

# 六、适配器

新增：

```text
assets/js/game-event-adapter.js
```

```js
GameHooks.register((name, payload) => {
  if (!window.EventClient) return;
  EventClient.track(name, payload);
});
```

引擎不知道：

- API 地址；
- actorId；
- sessionId；
- 队列策略；
- 隐私开关。

这些由 EventClient 自动补充。

---

# 七、脚本加载顺序

剧本页底部：

```html
<script src="assets/js/identity-client.js"></script>
<script src="assets/js/event-client.js"></script>
<script src="assets/js/game-event-adapter.js"></script>
<script src="data-store.js"></script>
<script src="engine.js"></script>
```

如果现有页面要求 `engine.js` 更早加载，GameHooks 自初始化仍需成立。关键是适配器注册发生在用户开始互动前。

统一脚本片段可通过构建脚本检查五个页面是否接入，避免漏一个剧本。

---

# 八、状态兼容

## 8.1 不改变的状态

- 当前对话索引；
- 当前幕；
- 游戏数值；
- 收集品；
- NPC 命运；
- 结局；
- 错题；
- 知识点；
- 本机进度键。

## 8.2 可新增的状态

仅为避免重复事件，可在运行内存或本机轻量保存：

```js
telemetry: {
  emittedStart: true,
  openedEvidenceIds: [],
  emittedEndingIds: []
}
```

该状态不能参与剧情判定。

---

# 九、错误隔离

GameHooks handler 错误：

- 捕获；
- console warning；
- 不显示给学生；
- 不阻止剧情。

EventClient 不存在：

- 空操作；
- 不加载 polyfill；
- 不报阻断错误。

数据序列化失败：

- EventClient 拒绝该事件；
- 记录最小内部错误；
- 不序列化剧情对象循环引用。

---

# 十、回归基线

为每个剧本建立测试夹具：

```json
{
  "scriptId": "american_revolution",
  "eventTypes": ["choice", "evidence", "pressure_choice"],
  "acts": 6,
  "knowledgePoints": 10,
  "criticalNodes": ["..."],
  "endings": ["..."]
}
```

测试引擎行为：

1. 无 GameHooks handler 时正常；
2. handler 抛异常时正常；
3. 同一选择效果只应用一次；
4. 事件 payload 不含可变剧情对象；
5. `script_completed` 在存档后发出；
6. 继续游戏发 resumed，不重复 started；
7. 限时超时事件只发一次；
8. 五剧本关键节点可触发。

---

# 十一、代码任务

| 任务 | 文件 | 验收 |
|---|---|---|
| ENGINE-ENG-01 | `engine.js` GameHooks | 无 handler 行为不变 |
| ENGINE-ENG-02 | 公共上下文和 ID | 关键事件 ID 稳定 |
| ENGINE-ENG-03 | 选择/证据/知识埋点 | payload 通过目录校验 |
| ENGINE-ENG-04 | 答题/结局埋点 | 与本机数据一致 |
| ENGINE-ENG-05 | event adapter | 隐私关闭时不发送 |
| ENGINE-ENG-06 | 五剧本接入检查 | 无遗漏页面 |
| ENGINE-ENG-07 | 回归夹具与测试 | 基线全部通过 |

---

# 十二、本期不做

- 把五个剧本转换为统一 JSON 引擎；
- 多人同步；
- 服务端保存剧情状态；
- 回放引擎；
- 自动生成剧情；
- 逐句对话埋点全开；
- 对每个 UI 点击建立事件；
- 改变结局计算规则。

---

# 十三、回滚

- 删除 `game-event-adapter.js` 引用即可停止上传；
- GameHooks 代码本身为空操作，不必紧急回滚；
- 若钩子引起性能问题，关闭低优先级事件；
- 不能通过回滚恢复旧 nodeId 复用，已发布 ID 应保留兼容；
- 回滚不得删除用户本机存档。