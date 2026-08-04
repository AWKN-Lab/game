# ENG-CMP-01｜账号与权限工程设计

> 对应 PRD：CMP-01 账号会员系统  
> 状态：已确认  
> 本期结论：学生、教师免注册；管理员正式登录。

---

# 一、工程边界

本组件负责：

- 学生/教师匿名身份；
- 管理员账号；
- 管理员 Session；
- 权限校验；
- CSRF 与 Origin 校验；
- 登录限流；
- 管理操作审计身份。

不负责：

- 学习进度内容；
- 剧本权限；
- AI 生成逻辑；
- 反馈和愿望业务状态机。

---

# 二、匿名身份

## 2.1 文件

新增：

```text
assets/js/identity-client.js
```

## 2.2 本机键

```text
tt_anonymous_id
tt_role
tt_analytics_enabled
tt_identity_version
```

## 2.3 API

```js
IdentityClient.getActorId()
IdentityClient.getSessionId()
IdentityClient.getRole()
IdentityClient.setRole('student' | 'teacher')
IdentityClient.isAnalyticsEnabled()
IdentityClient.setAnalyticsEnabled(boolean)
IdentityClient.reset()
```

规则：

- actorId 首次由 `crypto.randomUUID()` 生成；
- actorId 长期保存在当前浏览器；
- sessionId 每次新标签页或 30 分钟无活动后重建；
- 角色由入口设置，不代表正式权限；
- 不读取现有本地邮箱和密码作为身份；
- reset 后生成新 actorId，并清理待发送事件。

## 2.4 页面接入

- 首页学生入口：`setRole('student')`；
- 教师导学入口：`setRole('teacher')`；
- 直接访问剧本且角色未知：默认 `student`；
- 许愿池直接访问：保留现有角色，未知为 `unknown`。

---

# 三、管理员认证

## 3.1 目录

```text
server/modules/auth/
├─ auth.routes.js
├─ auth.schemas.js
├─ auth.service.js
├─ password.service.js
├─ session.service.js
└─ auth.repository.js
```

## 3.2 账号创建

命令：

```bash
ADMIN_USERNAME=admin \
ADMIN_DISPLAY_NAME=产品管理员 \
ADMIN_PASSWORD='...' \
ADMIN_ROLE=owner \
npm run admin:seed
```

要求：

- 命令行读取密码；
- 密码不出现在 shell 历史的推荐方式写入 README；
- 用户名冲突时默认拒绝，不覆盖；
- 初始化成功只输出 adminId 和 username；
- 密码哈希使用 Argon2id；
- 生产至少 12 位，建议使用密码管理器生成。

## 3.3 登录流程

```text
提交用户名和密码
→ 登录限流
→ 查找管理员
→ 检查 disabled/locked
→ Argon2id 校验
→ 失败累计次数
→ 成功重置失败次数
→ 创建随机 Session Token
→ 数据库存 Token 哈希
→ 设置 HttpOnly Cookie
→ 返回 CSRF Token 与管理员摘要
```

Cookie：

```text
name=tt_admin_session
HttpOnly=true
Secure=true（生产）
SameSite=Strict
Path=/
Max-Age=8h
```

Session Token 只在 Cookie 中出现一次，数据库只保存 SHA-256/HMAC 哈希。

## 3.4 锁定策略

- 5 次连续失败：锁定 15 分钟；
- 继续失败不延长到无限，按窗口重新计算；
- owner 可通过命令行解除；
- 登录错误统一提示“账号或密码错误”；
- disabled 账号返回同样提示；
- 所有失败写安全日志，但不写密码。

## 3.5 会话续期

- 绝对有效期 8 小时；
- 30 分钟无活动可要求重新登录；
- 敏感操作检查最近认证时间；
- 密码修改后撤销该账号全部 Session；
- 账号停用后立即撤销 Session。

---

# 四、权限模型

## 4.1 角色

### viewer

- 查看总览；
- 查看事件和匿名时间线；
- 查看反馈和愿望；
- 查看公开路线图；
- 查看审计摘要。

### editor

拥有 viewer 权限，并可：

- 分类反馈；
- 回复反馈；
- 审核愿望；
- 更新愿望状态；
- 合并重复愿望；
- 设置优先级、版本和负责人。

### owner

拥有全部权限，并可：

- 创建/停用管理员；
- 修改角色；
- 导出数据；
- 执行数据删除；
- 查看完整审计；
- 修改高风险系统配置。

## 4.2 权限中间件

```js
requireAdmin()
requireRole('viewer')
requireRole('editor')
requireRole('owner')
requirePermission('wish:update')
```

路由使用权限名，不在业务代码散落角色判断。

权限表：

```js
const ROLE_PERMISSIONS = {
  viewer: ['dashboard:read', 'event:read', 'feedback:read', 'wish:read'],
  editor: ['...', 'feedback:update', 'wish:update', 'wish:merge'],
  owner: ['*']
};
```

---

# 五、CSRF 与请求来源

管理员所有非 GET 请求：

1. 必须有有效 Session；
2. 必须携带 `X-CSRF-Token`；
3. 必须匹配 Session 中的 CSRF Secret；
4. 必须校验 Origin 等于 `PUBLIC_ORIGIN`；
5. JSON Content-Type 必须正确。

登录接口不依赖既有 Session，但校验 Origin 并限流。

---

# 六、管理员前端

## 6.1 页面

```text
admin/login.html
admin/index.html
```

`admin/admin.js` 提供：

```js
AdminApi.login()
AdminApi.logout()
AdminApi.me()
AdminApi.request()
AdminGuard.requireAuth()
AdminGuard.requirePermission()
```

## 6.2 页面加载

```text
打开管理页
→ GET /admin/auth/me
→ 401 跳转 login.html
→ 成功缓存管理员摘要和 CSRF
→ 加载当前页面数据
```

前端缓存不作为权限来源，服务端每次请求继续校验。

## 6.3 空闲退出

- 前端 25 分钟无操作提示；
- 30 分钟自动退出或由服务端 Session 策略决定；
- 退出后清理内存中的 CSRF 和管理数据；
- 浏览器后退不能重新展示敏感数据，管理页设置 no-store。

---

# 七、数据库与 Repository

```js
AdminRepository.create(input)
AdminRepository.findByUsername(username)
AdminRepository.findById(id)
AdminRepository.updateStatus(id, status)
AdminRepository.updateRole(id, role)
AdminRepository.updatePassword(id, hash)

AdminSessionRepository.create(input)
AdminSessionRepository.findByTokenHash(hash)
AdminSessionRepository.touch(id)
AdminSessionRepository.revoke(id)
AdminSessionRepository.revokeAllForAdmin(adminId)
AdminSessionRepository.deleteExpired(now)
```

认证查询必须使用精确字段，不使用 `SELECT *` 返回密码哈希到路由层。

---

# 八、审计事件

必须审计：

- admin.login.success；
- admin.login.failed；
- admin.logout；
- admin.password.changed；
- admin.created；
- admin.disabled；
- admin.role.changed；
- feedback.updated；
- wish.updated；
- wish.merged；
- data.exported；
- actor.deleted。

登录失败属于安全日志，可与业务审计表分开或统一 action。

---

# 九、代码任务

| 任务 | 文件 | 验收 |
|---|---|---|
| ACC-ENG-01 | `identity-client.js` | 匿名 ID 和开关稳定 |
| ACC-ENG-02 | auth 表迁移 | 空库可迁移 |
| ACC-ENG-03 | password/session service | 哈希与 Session 测试通过 |
| ACC-ENG-04 | auth routes | 登录/退出/me 通过 |
| ACC-ENG-05 | permission middleware | viewer/editor/owner 隔离 |
| ACC-ENG-06 | admin login page | 失效跳转与错误态正常 |
| ACC-ENG-07 | seed command | 不泄漏密码 |
| ACC-ENG-08 | auth audit | 敏感操作可追踪 |

---

# 十、测试

1. 首次访问生成匿名 ID；
2. 刷新保留 actorId；
3. 新会话生成 sessionId；
4. 匿名身份不能访问管理员 API；
5. 正确密码登录成功；
6. 错误密码五次触发锁定；
7. disabled 管理员不能登录；
8. Cookie 不可被 JavaScript 读取；
9. 缺 CSRF 的写请求返回 403；
10. 错 Origin 返回 403；
11. viewer 不能修改愿望；
12. editor 不能创建管理员；
13. owner 能停用 editor；
14. Session 过期返回 401；
15. 修改密码撤销旧 Session；
16. 日志不包含密码和 Session Token。

---

# 十一、回滚

- 匿名身份客户端可从页面脚本中移除，原本机进度不受影响；
- 管理员认证代码回滚时保留数据库表；
- 不删除已有管理员和审计数据；
- API 故障时临时关闭 `/admin/` 外网访问；
- 严重权限漏洞立即撤销全部 Session、轮换 Cookie Secret、回滚代码。