# 实施计划

- [x] 1. 方案评审与确认
  - 需求与设计评审，确认后进入实现
  - _需求: 1, 2, 3

- [ ] 2. 后端云函数改造
  - 在 `cloudfunctions/auth/index.js` 中新增 `action: 'bindPhone'`
  - 接入 `cloud.openapi.phonenumber.getPhoneNumber`，参数为前端 `e.detail.code`
  - 更新 `users` 文档：`phoneNumber`、`phoneBindTime`、`updateTime`
  - 返回更新后的用户文档
  - _需求: 2, 3

- [ ] 3. 前端页面改造（个人中心）
  - 在 `miniprogram/pages/profile/index.wxml` 增加账号区块：展示“用户ID：XXXXXX”、手机号或“绑定手机号”按钮
  - 在 `miniprogram/pages/profile/index.js` 计算并注入 `maskedUserId`、`maskedPhone`
  - 新增 `onGetPhoneNumber(e)` 处理云函数绑定与回显
  - 样式适配 `miniprogram/pages/profile/index.wxss`
  - _需求: 1, 2

- [ ] 4. 测试与验证
  - 成功授权绑定：按钮隐藏、显示掩码手机号
  - 拒绝授权：提示并保持原状
  - 网络/云函数异常：提示非阻塞
  - `openid` 异常：隐藏用户ID行
  - _需求: 1, 2, 3

- [ ] 5. 文档与部署
  - 更新 README 使用说明（可选）
  - 在开发者工具中上传并部署 `auth` 云函数
  - 预览小程序进行回归验证
  - _需求: 2, 3 