# 时空剧场工程文档中心

> 产品：时空剧场 AI 导学版  
> 文档状态：代码已完成，待生产部署  
> 工程版本：ENG V1.3  
> 更新日期：2026-08-04  
> 对应 PRD：[`docs/prd/`](../prd/README.md)

---

# 1. 当前状态

PRD、工程设计和比赛 MVP 代码已经形成完整链路：

```text
产品 PRD
→ 组件 PRD
→ 组件工程设计
→ 工程任务
→ 代码提交
→ 自动测试
→ 合并 main
→ 待生产部署与手工验收
```

主实现 PR：[#2](https://github.com/AWKN-Lab/game/pull/2)

当前状态：

- 代码已合并 `main`；
- GitHub Actions 全部通过；
- 规则导学、规则复盘、SQLite、事件、反馈、许愿和管理员 API 已完成自动测试；
- 百炼真实调用、生产部署、五剧本浏览器全流程和回滚演练需要服务器权限完成。

实施结果与上线清单见：

- [ENG-08 MVP 实施结果与上线清单](./08-MVP实施结果与上线清单.md)

---

# 2. 实际工程决策

1. 保留现有静态 HTML、共享 JavaScript 和五个剧本页面；
2. 新增 Node.js API 服务，承载 AI 代理、事件、管理员登录、反馈和许愿池；
3. MVP 使用 Node.js 内置 `node:sqlite`，启用 WAL；
4. HTTP 服务使用 Node.js 内置 `node:http`；
5. 管理员密码使用 scrypt 加盐派生；
6. 管理员后台继续使用原生 HTML、CSS、JavaScript；
7. 学生和教师保持免注册，使用随机匿名 ID；
8. 学习进度继续保存在本机；
9. 服务端只接收白名单产品事件、AI 运行记录、用户主动反馈和愿望；
10. AI 输出经过结构校验，失败时使用规则版；
11. 新能力通过旁路适配层接入，五个原剧本保持独立运行；
12. Nginx 生产默认入口指向 `ai-mvp.html`。

初版工程建议与实际实现差异见：

- [ADR-001 实际实现架构决策](./07-实际实现架构决策ADR.md)

---

# 3. 文档目录

## 总体设计与执行

- [ENG-00 总工程设计](./00-总工程设计.md)
- [ENG-01 实施路线图与任务分解](./01-实施路线图与任务分解.md)
- [ENG-02 API 与数据契约](./02-API与数据契约.md)
- [ENG-03 数据库与迁移设计](./03-数据库与迁移设计.md)
- [ENG-04 事件埋点与隐私设计](./04-事件埋点与隐私设计.md)
- [ENG-05 测试、部署与回滚](./05-测试部署与回滚.md)
- [ENG-06 执行总控计划](./06-执行总控计划.md)
- [ADR-001 实际实现架构决策](./07-实际实现架构决策ADR.md)
- [ENG-08 MVP 实施结果与上线清单](./08-MVP实施结果与上线清单.md)

## 组件工程设计

- [ENG-CMP-01 账号与权限](./components/ENG-CMP-01-账号与权限工程设计.md)
- [ENG-CMP-02 剧本内容](./components/ENG-CMP-02-剧本内容工程设计.md)
- [ENG-CMP-03 互动剧情引擎](./components/ENG-CMP-03-互动剧情引擎工程设计.md)
- [ENG-CMP-04 卡牌系统](./components/ENG-CMP-04-卡牌系统工程设计.md)
- [ENG-CMP-05 AI 教学助手](./components/ENG-CMP-05-AI教学助手工程设计.md)
- [ENG-CMP-06 学习数据与评估](./components/ENG-CMP-06-学习数据与评估工程设计.md)
- [ENG-CMP-07 运营交付](./components/ENG-CMP-07-运营交付工程设计.md)
- [ENG-CMP-08 用户互动与许愿池](./components/ENG-CMP-08-用户互动与许愿池工程设计.md)

---

# 4. PRD 与实际代码映射

| PRD 组件 | 主要实现文件 |
|---|---|
| CMP-01 账号会员系统 | `assets/js/identity-client.js`、`server/lib/security.js`、`server/db/seed-admin.js`、`admin/login.html` |
| CMP-02 剧本内容系统 | `script-registry.js`、`data/teaching_metadata.json`、`data/character_aliases.json`、内容校验脚本 |
| CMP-03 互动剧情引擎 | 原 `engine.js`、`ai-mvp.html`、`assets/js/shell-runtime.js` |
| CMP-04 卡牌系统 | 原卡牌文件、旁路事件识别 |
| CMP-05 AI 教学助手 | `teacher-guide.html`、`learning-review.html`、`assets/js/ai-teaching-assistant.js`、`server/services/ai-service.js` |
| CMP-06 学习数据与评估 | 原 `data-store.js`、`assets/js/learning-data-adapter.js` |
| CMP-07 运营交付系统 | `package.json`、`.github/workflows/mvp-ci.yml`、`deploy/`、`scripts/deploy.sh`、`scripts/rollback.sh` |
| CMP-08 用户互动与许愿池 | `assets/js/event-client.js`、`wish-pool.html`、`server/app.js`、`admin/` |

---

# 5. 工程状态规则

- `待开发`：工程设计完成，尚未开始代码；
- `开发中`：已有对应分支或提交；
- `联调中`：前后端接口已接通；
- `待验收`：代码和自动测试完成，等待生产与手工验收；
- `已上线`：生产环境验证通过；
- `已回滚`：上线后撤回，保留问题记录。

当前整体状态：

> 待验收

完成“已上线”需要满足 `ENG-08` 中的十项放行条件。

---

# 6. 变更纪律

后续实现发现 PRD 或工程文档与代码冲突时：

1. 记录冲突和实际风险；
2. 更新 ADR；
3. 回写对应组件 PRD；
4. 更新工程设计；
5. 修改代码和测试；
6. 重新通过 CI；
7. 更新实施结果文档。

不得通过隐藏默认值改变产品规则或数据采集范围。
