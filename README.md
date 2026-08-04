# 时空剧场 AI 导学版

面向初中历史学习的互动剧本产品。本次升级保留五个现有剧本、共享剧情引擎、卡牌、知识测试和本机学习进度，新增：

- 教师导学卡：根据课时、学生基础、教学重点和使用方式，对已有剧本进行课堂编排；
- 学生学习复盘：根据当前设备上的真实完成、测试、错题和知识状态生成复盘；
- AI 异常规则降级：无密钥、超时、网络异常或输出格式错误时继续可用；
- 匿名互动事件：只采集事件白名单中的产品行为；
- 用户反馈与许愿池；
- 管理员安全登录、匿名用户时间线、反馈处理、愿望治理和审计日志。

## 技术边界

- 现有五个剧本和 `engine.js` 不整体重构；
- 完整学习进度继续保存在浏览器 `localStorage`；
- 服务端只接收白名单互动、AI运行记录、用户主动反馈和愿望；
- 不采集密码、屏幕录像、键盘输入过程、完整 localStorage 和站外行为；
- 学生和教师免注册，管理员使用服务端账号；
- 服务端使用 Node.js 内置 HTTP 与 `node:sqlite`，不新增运行时 npm 依赖。

## 环境要求

- Node.js `>= 22.5.0`
- npm
- 生产环境建议 Nginx + systemd

## 本地启动

```bash
npm ci
cp .env.example .env
npm run build
npm run check
npm run db:migrate
npm run start
```

打开：

- 原产品首页：`http://127.0.0.1:8787/`
- AI 导学版入口：`http://127.0.0.1:8787/ai-mvp.html`
- 教师导学卡：`http://127.0.0.1:8787/teacher-guide.html`
- 学习复盘：`http://127.0.0.1:8787/learning-review.html`
- 许愿池：`http://127.0.0.1:8787/wish-pool.html`
- 管理员登录：`http://127.0.0.1:8787/admin/login.html`

## 初始化管理员

先在 `.env` 中设置强密码：

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=至少十位的强密码
```

执行：

```bash
npm run admin:seed
```

该命令只在服务端运行，密码不会写入仓库。

## AI 配置

系统使用 OpenAI 兼容的 Chat Completions 接口。默认环境变量：

```bash
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
DASHSCOPE_API_KEY=
AI_TIMEOUT_MS=12000
AI_ENABLED=true
```

生产环境建议将 `AI_BASE_URL` 配置为阿里云百炼业务空间专属域名。密钥只保存在服务器 `.env`，严禁写入前端、数据库、日志或 Git。

没有配置密钥时，导学卡和复盘卡自动使用规则版。

## 一键验证

```bash
npm run verify
```

等价于：

```bash
npm run build
npm run check
npm run test
npm run smoke
```

验证内容：

- Tailwind CSS 能生成；
- 五个注册剧本页面存在；
- 教学元数据、提示词、规则模板和事件目录合法；
- 事件目录没有禁止采集字段；
- 规则版导学和复盘测试通过；
- API、SQLite、管理员登录、反馈和许愿池集成测试通过；
- 核心页面和运行文件存在。

## 目录

```text
assets/js/                 公共客户端、事件、AI与数据适配
assets/css/mvp.css         AI导学版共享样式
data/                      教学元数据、提示词、规则、事件目录、角色映射
server/                    HTTP API、SQLite、AI代理、认证
admin/                     管理员后台
tests/                     规则测试
server/tests/              API集成测试
scripts/                   校验、部署与回滚
deploy/                    Nginx与systemd样例
docs/prd/                  产品母文档、总PRD、组件PRD
docs/engineering/          总工程、组件工程、执行计划
```

## 生产发布

参考：

- `deploy/nginx/time-theater.conf`
- `deploy/systemd/time-theater.service`
- `scripts/deploy.sh`
- `scripts/rollback.sh`

建议目录：

```text
/www/wwwroot/awkn-lab/game/
├─ current -> releases/<version>
├─ releases/
└─ shared/
   ├─ .env
   ├─ data/time-theater.sqlite
   ├─ backups/
   └─ logs/
```

发布：

```bash
sudo DEPLOY_ROOT=/www/wwwroot/awkn-lab/game ./scripts/deploy.sh
```

回滚：

```bash
sudo ./scripts/rollback.sh <release-id>
```

## 文档入口

- [PRD 文档中心](docs/prd/README.md)
- [工程文档中心](docs/engineering/README.md)
- [执行总控计划](docs/engineering/06-执行总控计划.md)
