# 技术方案设计（OA 网页授权集成）

## 架构与技术选型
- 承载：云函数 HTTP 访问（Node.js 18），暴露 `/h5/oauth/start` 与 `/h5/oauth/callback` 两个 GET 接口。
- 数据库：沿用 `users` 集合，新增字段 `oaOpenid`（公众号场景 openid），保留 `openid`（小程序 openid）、`unionid`（优先打通）。
- 配置：通过云函数环境变量读取 `WX_OA_APPID`、`WX_OA_SECRET`、`OA_OAUTH_REDIRECT`（完整回调 URL）、`OA_OAUTH_SCOPE`（默认 `snsapi_base`）。
- 安全：`state` 采用随机字符串 + 过期校验，缓存在云数据库集合 `oauth_state` 或使用云函数内存 + 备用校验（无状态可接受但建议存储以防重放）。

## 接口设计
- GET `/h5/oauth/start?state=...`：
  - 校验/生成 `state`，构造授权链接：
    `https://open.weixin.qq.com/connect/oauth2/authorize?appid=APPID&redirect_uri=ENCODED_REDIRECT_URI&response_type=code&scope=SCOPE&state=STATE#wechat_redirect`
  - 302 跳转。

- GET `/h5/oauth/callback?code=...&state=...`：
  - 校验 `state`；若失败返回错误页（文本/JSON）。
  - 以 `code` 交换：`https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=APPSECRET&code=CODE&grant_type=authorization_code`。
  - 解析 `openid`、`unionid`（可能为空）。
  - 用户绑定逻辑：
    - 若含 `unionid`：按 `unionid` 查找用户并 upsert；写入/更新 `oaOpenid`、基础展示信息；不覆盖 `openid`。
    - 否则：按 `oaOpenid` 查找并 upsert；若完全不存在则新建最小用户记录。
  - 成功后返回：
    - JSON：`{ success: true, openid, unionid, userId: _id, state }`
    - 或 HTML：友好提示并附带 `state`，供前端路由。

## 数据库设计变更
- 集合：`users`
  - 新增字段：`oaOpenid: string`。
  - 索引建议：
    - `openid`（已存在）
    - `oaOpenid`（唯一索引，部分场景允许为空；唯一性仅对非空生效）
    - `unionid`（唯一索引）

## 错误处理
- 统一返回：`{ success: false, code, message }`；隐藏密钥。
- 常见错误：`invalid_env_config`、`exchange_failed`、`state_invalid`、`not_in_wechat_browser`、`domain_mismatch`。

## 测试策略
- 单元：授权 URL 生成、state 生成/校验、用户 upsert 合并。
- 集成：模拟回调 JSON；校验入库与返回结构。
- 手工：配置真实公众号“网页授权域名”，在微信内置浏览器访问 `/h5/oauth/start` 验证全链路。 