# ENG-CMP-07｜运营交付工程设计

> 对应 PRD：CMP-07 运营交付系统  
> 状态：已确认  
> 核心任务：让仓库可构建、配置可验证、服务可部署、现场可降级。

---

# 一、工程目标

1. 全新环境可以按 README 构建和运行；
2. 静态站、API、数据库和管理员后台拥有统一发布流程；
3. 内容、Prompt、规则模板和事件目录可单独校验；
4. 生产配置和密钥不进入仓库；
5. AI、语音、图片、知识星系和事件服务均有降级；
6. 发布前自动检查五个剧本和关键接口；
7. 备份和回滚成为脚本，不依赖临时记忆。

---

# 二、package.json 工程化

建议根 `package.json` 统一管理前端构建和 API 服务。

```json
{
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "npm-run-all --parallel dev:static dev:api",
    "dev:static": "node scripts/dev-static.mjs",
    "dev:api": "node --watch server/start.js",
    "build:css": "tailwindcss -i ./styles/input.css -o ./dist/output.css --minify",
    "build": "npm run build:css && npm run build:manifest",
    "check": "npm run check:content && npm run check:events && npm run check:prompts && npm run check:secrets",
    "check:content": "node scripts/validate-content.mjs",
    "check:events": "node scripts/validate-events.mjs",
    "check:prompts": "node scripts/validate-prompts.mjs",
    "check:secrets": "node scripts/check-secrets.mjs",
    "test": "node --test",
    "test:api": "node --test server/tests/**/*.test.js",
    "smoke": "node scripts/smoke-pages.mjs",
    "start:api": "node server/start.js",
    "db:migrate": "node server/db/migrate.js",
    "db:migrate:check": "node server/db/migrate.js --check",
    "db:backup": "node server/db/backup.js",
    "db:integrity": "node server/db/integrity.js",
    "admin:seed": "node server/db/seed-admin.js"
  }
}
```

若不引入 `npm-run-all`，开发并行命令可暂缓，P0 只保证单独命令可用。

---

# 三、构建产物

## 3.1 CSS

输入：

```text
styles/input.css
```

输出：

```text
dist/output.css
```

要求：

- `dist/output.css` 可由 CI/部署生成；
- 页面不依赖开发者本机遗留文件；
- Tailwind 扫描包含根 HTML、admin HTML 和 JS；
- 生产输出 minify；
- 构建失败阻断发布。

## 3.2 版本清单

新增：

```text
dist/build-manifest.json
```

```json
{
  "releaseVersion": "2026.08.12+abcdef0",
  "contentVersion": "content-2026-08-12.abcdef0",
  "builtAt": "2026-08-12T10:00:00Z",
  "files": {
    "css": "dist/output.css"
  }
}
```

前端通过全局 `APP_VERSION` 或 manifest 传给事件和 API。

---

# 四、配置分层

## 4.1 入库配置

```text
data/script_registry.json 或构建快照
data/knowledge_points.json
data/teaching_metadata.json
data/ai_prompts.json
data/rule_templates.json
data/event_catalog.json
data/character_aliases.json
data/card_aliases.json
```

这些配置：

- 可版本控制；
- 不含密钥；
- 启动和构建时 Schema 校验；
- 有版本字段；
- 有默认值或明确失败策略。

## 4.2 环境配置

```text
.env
```

包含：

- API 端口；
- 数据库路径；
- Cookie Secret；
- AI Provider/Key/Model；
- Public Origin；
- 日志级别；
- Session 时长；
- 限流阈值。

`.env.example` 只放变量名和说明，不放生产值。

## 4.3 运行开关

服务端配置：

```text
FEATURE_AI_ENABLED
FEATURE_EVENTS_ENABLED
FEATURE_WISH_POOL_ENABLED
FEATURE_ADMIN_EXPORT_ENABLED
```

前端公开配置接口：

```text
GET /api/v1/public/config
```

只返回安全开关和版本，不返回密钥、数据库路径和内部阈值。

---

# 五、校验脚本

## 5.1 `validate-content.mjs`

检查剧本、知识点、教学元数据、角色、卡牌、资源和版本。

## 5.2 `validate-events.mjs`

检查：

- 事件名唯一；
- Schema 合法；
- adminVisible 是 properties 子集；
- priority 合法；
- 事件代码引用都在目录中；
- 目录中无代码未使用事件可 warning。

## 5.3 `validate-prompts.mjs`

检查：

- promptVersion；
- system/rules 非空；
- 输出 Schema 名称有效；
- 禁止在配置中出现 API Key；
- fixtures 存在；
- 规则模板覆盖五个剧本。

## 5.4 `check-secrets.mjs`

扫描：

- 常见 API Key 前缀；
- `.env`；
- 私钥头；
- Cookie Secret；
- 明文管理员密码；
- 测试 Token。

只是辅助门禁，不替代专业密钥扫描。

## 5.5 `smoke-pages.mjs`

启动临时静态服务，检查：

- 页面 HTTP 200；
- 主脚本和 CSS 200；
- 注册表页面存在；
- 关键 HTML 元素存在；
- 不做完整浏览器渲染时至少检查静态引用。

---

# 六、CI 流程

建议新增：

```text
.github/workflows/ci.yml
```

触发：

- pull_request；
- push main；
- 手工执行。

任务：

```text
checkout
→ setup node
→ npm ci
→ npm run build
→ npm run check
→ npm test
→ npm run smoke
→ 上传测试报告（可选）
```

数据库测试使用临时文件，测试完成删除。

比赛前 CI 可单 Ubuntu + Node 20，后续再增加 Windows/Node 22 矩阵，避免当前无关成本。

---

# 七、开发环境

## 7.1 启动

```bash
cp .env.example .env
npm ci
npm run build
npm run db:migrate
npm run admin:seed
npm run dev:api
```

另开静态服务：

```bash
npm run dev:static
```

## 7.2 开发数据库

默认：

```text
.var/dev.sqlite
```

`.var/` 加入 `.gitignore`。

测试数据库：

```text
.var/test-<pid>.sqlite
```

生产路径必须通过环境变量显式设置。

---

# 八、降级矩阵

## 8.1 AI

```text
AI Provider 不可用
→ 服务端 fallback-engine
→ 若 API 整体不可用，前端本地规则版
```

## 8.2 事件服务

```text
上传失败
→ 本机队列
→ 后续重试
→ 队列满按优先级丢弃
```

事件失败不弹阻断提示。

## 8.3 语音

```text
音频加载失败
→ 停止当前音频
→ 保留文字、头像和推进按钮
→ 可记录 resource_load_failed
```

## 8.4 图片

```text
图片失败
→ 默认背景/默认头像/卡牌占位
→ 不隐藏文字和主按钮
```

## 8.5 字体

第三方字体失败使用系统字体栈：

```css
font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
```

## 8.6 知识星系

```text
Three.js/D3/数据失败
→ 展示知识点列表
→ 保留点击查看知识详情
```

## 8.7 数据库

- ready 返回失败；
- 公开静态剧情仍可访问；
- AI 使用前端规则版；
- 反馈/许愿提示暂时无法提交；
- 管理后台不可用，不返回旧缓存敏感数据。

---

# 九、生产服务

## 9.1 Nginx

- 静态站 root 指向 current；
- `/api/` 反代 Node；
- `/shared/` 和点文件拒绝；
- 设置安全头和合理缓存；
- AI 路由读超时略高于普通接口；
- 请求体限制，反馈/愿望不超过 64 KB。

## 9.2 systemd

- 非 root 用户运行；
- Restart=on-failure；
- 环境变量独立文件；
- 工作目录指向 current；
- 日志进入 journald 或 shared/logs；
- 停止超时后强制结束。

## 9.3 SQLite

- shared/data；
- 每日备份；
- WAL；
- 磁盘空间监控；
- 发布目录切换不移动数据库。

---

# 十、发布脚本

建议：

```text
scripts/release.sh
scripts/rollback.sh
scripts/backup-db.sh
```

`release.sh`：

1. 校验 SHA；
2. 构建；
3. 测试；
4. 数据库备份；
5. 迁移检查/执行；
6. 创建 release 目录；
7. 链接 shared；
8. 原子切换 current；
9. 重启 API；
10. 健康检查；
11. 冒烟；
12. 失败自动切回旧 current。

脚本每一步 `set -euo pipefail`，日志带 releaseVersion。

---

# 十一、管理员健康页

`admin/system.html` 或总览卡片展示：

- releaseVersion；
- contentVersion；
- API live/ready；
- 数据库迁移版本；
- 数据库大小；
- 最近备份；
- 近一小时 5xx；
- AI Provider 状态（不显示密钥）；
- AI 降级率；
- 事件拒绝率；
- 本机/服务端时间差。

viewer 可查看，只有 owner 可触发高风险维护动作。比赛版不在 UI 提供直接迁移和恢复按钮。

---

# 十二、代码任务

| 任务 | 交付 | 验收 |
|---|---|---|
| OPS-ENG-01 | package scripts | 全新环境命令通过 |
| OPS-ENG-02 | CSS 输入和构建 | `dist/output.css` 可生成 |
| OPS-ENG-03 | manifest/version | 前后端版本一致 |
| OPS-ENG-04 | 配置 Schema | 错配置阻断 ready |
| OPS-ENG-05 | 校验脚本 | 内容/事件/Prompt/密钥覆盖 |
| OPS-ENG-06 | CI | PR 自动门禁 |
| OPS-ENG-07 | 降级实现 | 逐项故障不白屏 |
| OPS-ENG-08 | Nginx/systemd | 同域 API 可用 |
| OPS-ENG-09 | 发布回滚脚本 | 10 分钟回滚演练 |
| OPS-ENG-10 | 备份与健康 | 可恢复、可查看 |

---

# 十三、验收

1. 删除本机旧 dist 后仍可构建；
2. 新克隆 10 分钟内启动；
3. 配置引用失效会失败；
4. 缺 AI Key 服务可 ready，AI 返回规则版；
5. 缺 Cookie Secret 服务不可 ready；
6. 关闭事件服务剧情可运行；
7. 关闭 Three.js 显示知识列表；
8. 语音失败不阻断；
9. 发布脚本创建独立 release；
10. current 切换原子；
11. 数据库不进入 release；
12. 回滚不覆盖数据库；
13. 最新备份可恢复；
14. 日志不含密钥和正文；
15. 管理员健康页与实际版本一致。

---

# 十四、本期不做

- Kubernetes；
- Docker 编排平台；
- 多地区高可用；
- 消息队列；
- 专用数据仓库；
- 自动弹性扩容；
- 多环境配置中心；
- 后台在线执行数据库迁移。

这些能力在单机比赛 MVP 中增加的风险高于收益。