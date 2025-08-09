# 实施计划（OA 网页授权集成）

- [ ] 1. 配置与环境
  - 新增云函数环境变量：`WX_OA_APPID`、`WX_OA_SECRET`、`OA_OAUTH_REDIRECT`、`OA_OAUTH_SCOPE`
  - 校验运行环境与微信内置浏览器 UA 识别
  - _需求: 需求 4

- [ ] 2. 新增云函数 `oa-oauth`（HTTP 访问）
  - 暴露 `GET /h5/oauth/start`：生成并 302 跳转至授权链接
  - 暴露 `GET /h5/oauth/callback`：校验 `state`、用 `code` 换 `openid/unionid`、入库并返回 JSON/HTML
  - _需求: 需求 1、需求 3

- [ ] 3. 数据库与索引
  - 在 `users` 集合新增字段 `oaOpenid`
  - 为 `oaOpenid`、`unionid` 创建唯一索引（对空值不约束）
  - _需求: 需求 2

- [ ] 4. 合并逻辑（UnionID 优先）
  - 含 `unionid`：按 `unionid` 查找并更新 `oaOpenid`
  - 无 `unionid`：按 `oaOpenid` 查找；无则最小化创建用户
  - 保持不覆盖 `openid`（小程序）
  - _需求: 需求 2

- [ ] 5. 返回形态
  - JSON：`{ success, openid, unionid, userId, state }`
  - HTML：简单成功/失败页，带 `state` 透传（可选）
  - _需求: 需求 3

- [ ] 6. 文档与运维
  - 在 `README.md` 增补“公众号网页授权配置”章节
  - 提供测试指引与常见错误排查
  - _需求: 需求 3、需求 4 