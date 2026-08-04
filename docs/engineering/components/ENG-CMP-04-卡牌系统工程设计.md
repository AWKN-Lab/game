# ENG-CMP-04｜卡牌系统工程设计

> 对应 PRD：CMP-04 卡牌系统  
> 状态：已确认  
> 本期结论：保持现有玩法，只统一卡牌身份、数据来源和事件出口。

---

# 一、工程目标

1. 保证现有卡牌获取、查看、使用、练习与战斗不退化；
2. 为管理员提供可解释的卡牌互动数据；
3. 统一卡牌 ID、类型、知识点和剧本来源；
4. 避免卡牌数据继续散落在多个页面和脚本；
5. 不把比赛版本扩展成复杂 TCG。

---

# 二、工程边界

包含：

- 卡牌注册表；
- 卡牌稳定 ID；
- 卡牌与知识点映射；
- 卡牌获取/使用/练习事件；
- 旧存档兼容；
- 数据校验。

不包含：

- 新战斗规则；
- 卡牌付费；
- 抽卡；
- PVP；
- 卡牌市场；
- 卡牌 AI 自动生成。

---

# 三、卡牌统一模型

建议新增或收口为：

```text
data/cards.json
```

```json
{
  "version": "cards-2026-08-04",
  "cards": [
    {
      "id": "civics_rule_of_law",
      "name": "法治",
      "type": "civics",
      "rarity": "core",
      "description": "...",
      "knowledgeIds": ["ar_h05"],
      "scriptIds": ["american_revolution", "game-scene"],
      "enabled": true,
      "asset": {
        "image": "...",
        "icon": "..."
      },
      "usage": {
        "story": true,
        "practice": true,
        "battle": true
      }
    }
  ]
}
```

约束：

- `id` 发布后稳定；
- 卡牌名称可改，ID 不随名称变化；
- 旧 ID 通过 alias 映射；
- `knowledgeIds` 必须存在；
- `scriptIds` 必须存在；
- disabled 卡牌不再新发放，但旧存档仍可显示；
- 图片缺失时显示通用卡面。

---

# 四、旧存档兼容

现有卡牌存档可能保存名称、索引或旧 ID。

新增：

```text
data/card_aliases.json
```

```json
{
  "version": 1,
  "aliases": {
    "rule_of_law": "civics_rule_of_law",
    "法治": "civics_rule_of_law"
  }
}
```

读取流程：

```text
读取旧卡牌键
→ 查 canonical ID
→ 找到则使用统一卡牌
→ 找不到则保留 unknown 占位
→ 不删除原存档
```

未知卡牌应记录本机兼容警告，不能导致整个图鉴失败。

---

# 五、卡牌事件接入

## 5.1 获取

在卡牌真正写入本机收藏后：

```js
GameHooks.emit('card_acquired', {
  cardId,
  cardType,
  source,
  nodeId,
  firstTime
});
```

重复获取：

- `firstTime=false`；
- 不重复增加唯一收藏；
- 如有数量系统，单独记录 `quantityDelta`，比赛版不新增。

## 5.2 查看

图鉴卡牌详情打开：

```js
EventClient.track('card_viewed', {
  cardId,
  source: 'collection'
});
```

短时间重复开关可做 2 秒去抖，减少噪声。

## 5.3 使用

效果真正应用后：

```js
GameHooks.emit('card_used', {
  cardId,
  context: 'story_choice',
  nodeId,
  result: 'effect_applied'
});
```

被拒绝时：

```js
{
  "result": "rejected",
  "reason": "not_allowed|insufficient_condition|already_used"
}
```

不上传完整卡牌说明和剧情选项文案。

## 5.4 练习与战斗

完成一轮后发聚合事件：

```js
EventClient.track('card_practice_completed', {
  cardId,
  questionCount,
  correctCount,
  durationSeconds
});
```

比赛版不记录每一次动画、拖拽和普通攻击。

---

# 六、DataStore 接口

建议统一：

```js
DataStore.getOwnedCardIds()
DataStore.hasCard(cardId)
DataStore.acquireCard(cardId, source)
DataStore.getCardUsageStats(cardId)
DataStore.recordCardUse(cardId, context, result)
```

兼容层内部处理旧字段，不让页面直接读取历史存储结构。

新增本机结构：

```json
{
  "cards": {
    "schemaVersion": 2,
    "owned": {
      "civics_rule_of_law": {
        "acquiredAt": 1710000000000,
        "source": "story",
        "useCount": 2,
        "lastUsedAt": 1710000001000
      }
    }
  }
}
```

本期不强制迁移全部旧存档，读取时懒迁移并保存新版本。

---

# 七、页面更新

## 卡牌图鉴

- 由 cards registry 渲染；
- 显示来源剧本和关联知识点；
- unknown 卡牌显示兼容占位；
- 卡图失败显示默认图；
- 事件系统关闭不影响查看。

## 剧情页面

- 发放和使用通过统一 DataStore API；
- 不允许每个剧本直接拼接卡牌存储键；
- 旧剧本调用由兼容函数转发。

## 练习页面

- 使用 canonical cardId；
- 题目关联 knowledgeId；
- 完成结果可被学习数据组件读取；
- 不把卡牌分数混入正式中考测试正确率。

---

# 八、管理员展示

卡牌分析只展示：

- 获取次数；
- 首次获取用户数；
- 查看次数；
- 使用次数；
- 被拒绝次数；
- 练习完成数；
- 关联剧本和知识点。

管理员匿名时间线显示：

```text
获得「法治」卡牌
查看「法治」卡牌
在节点 ar_choice_003 使用，效果已应用
完成卡牌练习：4/5
```

名称由当前卡牌注册表解析，同时保留事件发生时 cardId。

---

# 九、校验

构建检查：

- cardId 唯一；
- alias 无循环；
- canonical ID 存在；
- knowledgeId 存在；
- scriptId 存在；
- asset 路径存在或配置 fallback；
- disabled 卡牌仍可由 alias 解析；
- 剧本引用的卡牌存在。

错误 cardId 阻断构建，缺失非关键图片可以 warning + fallback。

---

# 十、代码任务

| 任务 | 改动 | 验收 |
|---|---|---|
| CARD-ENG-01 | `data/cards.json` | 现有卡牌全部可注册 |
| CARD-ENG-02 | alias 和旧存档兼容 | 旧收藏不丢失 |
| CARD-ENG-03 | DataStore 统一 API | 页面不直读散乱键 |
| CARD-ENG-04 | 获取/使用事件 | 管理后台可解释 |
| CARD-ENG-05 | 图鉴/练习事件 | 低噪声、无全文 |
| CARD-ENG-06 | 内容校验 | 无失效引用 |
| CARD-ENG-07 | 五剧本回归 | 发卡与用卡正常 |

---

# 十一、测试

1. 旧名称能映射 canonical ID；
2. 未知旧卡不导致图鉴崩溃；
3. 重复获取不重复收藏；
4. 首次获取事件 firstTime=true；
5. 重复获取 firstTime=false；
6. 使用效果应用后才发 card_used；
7. 被拒绝使用记录原因；
8. 关闭分析后不发卡牌事件；
9. API 失败不影响发卡；
10. 卡图失败显示默认图；
11. 练习成绩不污染正式测试；
12. 管理端能按 cardId 统计。

---

# 十二、本期不做与回滚

不做复杂数值扩张、抽卡和新战斗系统。

回滚时：

- 统一注册表可保留，旧页面继续读取兼容 API；
- 事件适配器可关闭；
- 不删除新版本卡牌存档；
- alias 不回收；
- 任何回滚都不得让用户已获得卡牌消失。