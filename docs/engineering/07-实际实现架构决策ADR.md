# ADR-001｜比赛 MVP 采用 Node 内置运行时

> 状态：已采纳  
> 日期：2026-08-04  
> 影响范围：服务端、数据库、管理员认证、部署与测试  
> 关联文档：`00-总工程设计.md`、`02-API与数据契约.md`、`03-数据库与迁移设计.md`

---

# 一、决策

比赛 MVP 的实际实现采用：

| 工程层 | PRD/初版工程建议 | 实际实现 |
|---|---|---|
| HTTP 服务 | Fastify | Node.js 内置 `node:http` |
| 数据校验 | Zod | 路由级显式白名单校验函数 |
| 数据库 | SQLite WAL | Node.js 内置 `node:sqlite`，WAL |
| 管理员密码 | Argon2id | Node.js `crypto.scryptSync` |
| 测试 | `node:test` | `node:test` |
| 前端 | 原生 HTML/CSS/JS | 保持不变 |

运行时不新增 npm 依赖。现有 `package-lock.json` 继续只维护 Tailwind 构建依赖。

---

# 二、为什么调整

当前仓库来自线上静态生产目录，核心资产是五个大型剧本页面、大量图片音视频、共享 `engine.js` 和本机学习数据。

比赛期主要风险包括：

- 新增依赖造成 `npm ci`、原生模块编译或服务器安装失败；
- 为了接入框架，大范围移动现有文件和路由；
- SQLite 驱动或密码库的系统依赖影响 Windows 与 Linux 一致性；
- 依赖安装问题挤压导学卡、复盘卡和演示闭环时间。

Node 22 已提供本项目所需的基础能力：

- HTTP 服务；
- Fetch；
- Web Crypto 与传统 Crypto；
- SQLite 同步接口；
- 原生测试运行器。

因此，本轮优先减少依赖面和部署变量。

---

# 三、产品能力没有缩减

调整技术实现后仍然保留：

- AI 密钥只在服务端；
- 请求和 AI 输出结构校验；
- AI 失败规则降级；
- SQLite WAL；
- 管理员 HttpOnly Session Cookie；
- 登录限流；
- 密码加盐和高成本派生；
- 事件 payload 白名单；
- 管理员敏感操作审计；
- 自动测试、部署和回滚。

---

# 四、安全说明

## 4.1 管理员密码

实际密码格式：

```text
scrypt$N$r$p$salt$derivedKey
```

参数由服务端固定，盐随机生成，校验使用常量时间比较。

管理员密码：

- 不进入 Git；
- 不进入数据库明文；
- 不返回前端；
- 仅通过 `npm run admin:seed` 初始化或更新。

## 4.2 会话

- 浏览器只持有随机 Session Token；
- Cookie 为 `HttpOnly`、`SameSite=Strict`；
- 数据库存储 Token 的 SHA-256 哈希；
- Session 有明确过期时间；
- 退出时删除服务端 Session。

## 4.3 输入校验

服务端不信任前端对象。

每个接口执行：

- 字段白名单；
- 字符长度限制；
- 枚举校验；
- 数字范围校验；
- 批量大小限制；
- 请求体字节上限；
- 频率限制。

事件 payload 按 `data/event_catalog.json` 二次过滤。

---

# 五、限制

内置实现适合单机比赛 MVP 和早期小规模试用。

当出现以下任一条件时，重新评估框架与基础设施：

- 多实例部署；
- 高频并发写入；
- 多学校组织和复杂权限；
- 需要 OpenAPI 自动生成；
- 管理员角色超过三类；
- 需要分布式 Session；
- 数据库迁移至 PostgreSQL；
- 安全审计要求指定 Argon2id。

---

# 六、未来迁移路径

当前路由和数据访问仍按边界拆分：

```text
HTTP Route
→ 输入清洗
→ Service
→ SQLite Repository / AI Provider
```

后续可以逐层替换：

- `node:http` → Fastify；
- 手工校验 → Zod；
- `node:sqlite` → PostgreSQL Repository；
- scrypt → Argon2id；
- 本机会话 → Redis Session。

公开 API 路径和前端客户端保持兼容。

---

# 七、结论

本次调整减少安装和部署风险，保留完整产品闭环。

比赛 MVP 的判断标准是：

```text
能够构建
→ 能够运行
→ AI 失败仍可用
→ 数据边界清楚
→ 可以回滚
```

框架升级进入比赛后的工程治理阶段。
