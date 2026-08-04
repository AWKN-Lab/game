# ENG-CMP-02｜剧本内容工程设计

> 对应 PRD：CMP-02 剧本内容系统  
> 状态：已确认  
> 本期结论：统一元数据，不重写五个剧本正文。

---

# 一、目标

解决当前同一剧本信息散落在注册表、详情页、学习页和剧本 HTML 中造成的口径漂移。

本期建立一个统一内容注册中心，服务：

- 剧本列表；
- 剧本详情；
- 学习统计；
- AI 导学上下文；
- 复盘推荐；
- 管理员筛选；
- 事件解释；
- 内容校验。

---

# 二、保留与改动

## 保留

- 五个剧本 HTML；
- `GAME_CONFIG`；
- `DIALOG_SCRIPT`；
- 现有资源路径；
- 原有剧情事件格式；
- 现有知识点 JSON。

## 改动

- 扩展 `script-registry.js`；
- 新增教学元数据；
- 新增角色别名与文本补丁；
- 页面移除重复剧本数组；
- 新增内容校验脚本；
- 建立内容版本。

---

# 三、统一剧本模型

`script-registry.js` 每个剧本对象：

```js
{
  id: 'american_revolution',
  name: '美国独立战争',
  subtitle: '',
  file: 'american_revolution.html',
  cover: '...',
  era: '18世纪',
  region: '北美',
  subjects: ['history', 'civics'],
  grade: ['八年级上'],
  difficulty: 'medium',
  estimatedMinutes: 40,
  acts: 6,
  knowledgePoints: 10,
  collectibles: 0,
  endings: [
    { id: '...', name: '...', description: '...' }
  ],
  contentVersion: 'ar-2026-08-04',
  enabled: true,
  classroom: {
    durationOptions: [15, 20, 40],
    defaultUsageMode: 'projection',
    teachingMetadataKey: 'american_revolution'
  },
  relatedScripts: ['game-scene']
}
```

约束：

- id 全局唯一且发布后不随意修改；
- file 必须存在；
- knowledgePoints 与知识库实际数量一致；
- endings 由注册表统一渲染；
- disabled 剧本不出现在公开列表，但旧进度仍能读取；
- `contentVersion` 每次影响 AI/事件解释的改动都更新。

---

# 四、教学元数据

新增：

```text
data/teaching_metadata.json
```

结构：

```json
{
  "version": "teaching-2026-08-04",
  "scripts": {
    "american_revolution": {
      "objectives": [
        {
          "id": "ar_obj_01",
          "text": "区分根本原因、导火线和开始标志",
          "knowledgeIds": ["ar_h01", "ar_h02"]
        }
      ],
      "acts": [
        {
          "actId": "act_1",
          "title": "波士顿的怒火",
          "minutes": {"weak": 10, "average": 8, "strong": 6},
          "knowledgeIds": ["ar_h01"],
          "nodeIds": ["ar_ev_001", "ar_choice_001"],
          "suitableFor": [15, 20, 40]
        }
      ],
      "commonMisconceptions": [
        {
          "id": "ar_mis_01",
          "text": "把税收过高直接写成根本原因",
          "knowledgeIds": ["ar_h01"],
          "questionIds": ["ar_q02"],
          "ruleHint": "区分表现、直接冲突和深层矛盾"
        }
      ],
      "boardTemplates": [],
      "followupQuestions": [],
      "relatedScripts": []
    }
  }
}
```

AI 只使用已配置字段，缺失时进入规则模板，不从剧本 HTML 全文临时抓取。

---

# 五、节点 ID 治理

现有部分事件可能没有稳定 `nodeId`。本期处理：

1. 只为 AI 导学、管理员分析和测试需要的关键节点补 ID；
2. 不一次性给所有普通对白编号；
3. ID 格式：`<script-prefix>_<type>_<sequence>`；
4. 已发布 ID 不复用；
5. 删除节点时保留 tombstone 映射。

示例：

```text
ar_choice_001
ar_pc_001
ar_ev_001
ar_knowledge_001
ar_q_001
```

`tombstones`：

```json
{
  "ar_choice_000": {
    "removedIn": "ar-2026-09-01",
    "replacement": "ar_choice_001"
  }
}
```

管理员查看旧事件时可以解释历史 ID。

---

# 六、知识点治理

## 6.1 单一来源

`data/knowledge_points.json` 是知识点正文来源。

注册表只保存数量和版本，不复制知识点正文。

## 6.2 必填字段

```json
{
  "id": "ar_h01",
  "scriptId": "american_revolution",
  "subject": "history",
  "title": "...",
  "examStatement": "...",
  "actId": "act_1",
  "tags": ["原因", "殖民统治"],
  "difficulty": "basic",
  "enabled": true
}
```

旧字段暂时保留，校验脚本输出缺失警告；P0 只补 AI 和复盘使用的关键字段。

## 6.3 数量口径

构建时计算：

```text
按 scriptId 分组的 enabled 知识点数量
```

与注册表不一致时 `npm run check` 失败。对外不再手工写“65 个”或其他总数。

---

# 七、角色与内容资产

新增：

```text
data/character_aliases.json
data/content_patches.json
```

## 7.1 角色兼容

```json
{
  "version": 1,
  "aliases": {
    "fulina": {
      "canonicalId": "zijin",
      "displayName": "子衿",
      "portraitMap": {}
    },
    "hutao": {
      "canonicalId": "luoshu",
      "displayName": "洛书",
      "portraitMap": {}
    }
  }
}
```

引擎内部旧 ID 可暂时保留，渲染层输出原创角色。

## 7.2 文本补丁

只处理第三方专属名词和明显世界观冲突：

```json
{
  "patches": [
    {
      "scriptId": "american_revolution",
      "nodeId": "ar_dialog_010",
      "field": "text",
      "replaceWith": "...",
      "reason": "remove_third_party_ip"
    }
  ]
}
```

禁止使用无节点定位的全文模糊替换，避免误伤历史内容。

---

# 八、页面统一渲染

## `script-select.html`

- 从 `SCRIPT_REGISTRY` 渲染卡片；
- 不维护独立剧本数组；
- disabled 自动隐藏；
- 点击事件使用 scriptId。

## `script-detail.html`

- 标题、年级、难度、知识点、结局全部来自注册表；
- 教学元数据按 scriptId 加载；
- 无对应剧本显示明确 404 状态；
- 移除法国大革命结局硬编码。

## `my-learning.html`

- 使用注册表渲染进度卡；
- 总数来自注册表；
- 不维护知识点数量副本；
- 推荐下一剧本使用 `relatedScripts`。

## 管理员后台

- 剧本筛选列表来自只读内容接口或内置注册表；
- 事件 nodeId 通过内容版本解释；
- 显示“事件发生时版本”和“当前版本”。

---

# 九、服务端内容加载

服务端启动时加载：

- script registry 的可序列化快照；
- knowledge points；
- teaching metadata；
- AI prompts；
- rule templates；
- event catalog。

加载过程：

```text
读取文件
→ Schema 校验
→ 交叉引用校验
→ 生成 contentVersion digest
→ 放入只读内存
```

配置错误时：

- 生产 ready 失败；
- 开发环境输出具体错误；
- 不使用静默空对象继续提供错误历史事实。

服务端不直接执行浏览器版 `script-registry.js` 中的任意代码。建议逐步新增 `data/script_registry.json` 或构建时生成 JSON 快照。

---

# 十、内容版本

全局：

```text
content-2026-08-04.<short-sha>
```

单剧本：

```text
ar-2026-08-04.1
```

事件、AI 运行和生成卡都记录版本。

以下改动必须升级版本：

- 知识点正文；
- 正确答案；
- 节点 ID；
- 结局；
- 教学元数据；
- 角色显示；
- AI Prompt 引用内容。

仅 CSS 和无语义图片修复可不升级内容版本。

---

# 十一、校验脚本

`validate-content.mjs`：

1. 读取注册表；
2. 检查脚本文件；
3. 提取/读取剧本配置；
4. 检查 scriptId 一致；
5. 检查知识点数量；
6. 检查结局引用；
7. 检查教学 actId/nodeId/knowledgeId；
8. 检查 relatedScripts；
9. 检查角色映射；
10. 扫描禁用专属名词；
11. 输出 JSON 报告和终端摘要。

错误等级：

- error：阻断构建；
- warning：允许构建但进入技术债清单；
- info：统计。

---

# 十二、代码任务

| 任务 | 改动 | 验收 |
|---|---|---|
| CONTENT-ENG-01 | 扩展 `script-registry.js` | 五剧本元数据完整 |
| CONTENT-ENG-02 | `teaching_metadata.json` | 主剧本完整，其余基础可用 |
| CONTENT-ENG-03 | 知识点口径治理 | 数量自动校验 |
| CONTENT-ENG-04 | 页面移除重复数组 | 三页面统一来源 |
| CONTENT-ENG-05 | 角色 alias 与补丁 | 公开页面无第三方专属设定 |
| CONTENT-ENG-06 | 内容版本生成 | AI/事件可追踪版本 |
| CONTENT-ENG-07 | 内容校验脚本 | 错误可阻断 CI |

---

# 十三、测试

1. 注册表每个 file 存在；
2. 页面 scriptId 与注册表一致；
3. 知识点数量准确；
4. 结局渲染随剧本切换；
5. 相关剧本 ID 有效；
6. 教学元数据不引用不存在节点；
7. 角色 alias 缺失时构建报警；
8. 文本补丁定位不到节点时构建失败；
9. disabled 剧本不出现在列表；
10. 旧进度仍能通过原 scriptId 读取；
11. AI 响应记录正确 contentVersion；
12. 旧事件 nodeId 可通过 tombstone 解释。

---

# 十四、回滚

- 页面可暂时切回旧注册表字段，但不恢复重复手工数组；
- 内容版本升级后不回收旧 ID；
- 角色兼容层可以关闭，但生产不得重新暴露第三方 IP；
- 教学元数据错误时 AI 导学降级为通用规则卡；
- 新增 JSON 文件回滚代码时可保留，不影响原剧情。