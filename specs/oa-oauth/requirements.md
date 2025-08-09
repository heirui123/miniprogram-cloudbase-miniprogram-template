# 需求文档（OA 网页授权集成）

## 介绍

为微信公众号（服务号）场景接入 H5 网页授权流程，获取并打通公众号维度的 OpenID/UnionID，与现有小程序用户体系（openid/unionid）建立关联，支持后续在 H5 场景进行用户识别与业务跳转。

## 需求

### 需求 1 - 获取公众号 OpenID（静默）

**用户故事：** 作为在微信内置浏览器中访问项目 H5 页的用户，我打开页面时无需额外交互，系统自动进行网页授权并识别我的身份。

#### 验收标准

1. While 用户在微信内置浏览器中访问授权入口页, when 系统检测到无有效授权态, the 系统 shall 跳转至微信网页授权（`snsapi_base`）并在回调后拿到 `openid`。
2. While 授权回调携带 `code` 成功, when 系统向微信接口交换凭证, the 系统 shall 获取 `openid`（以及可用时的 `unionid`）。
3. While 成功获取到用户标识, when 系统在云数据库 `users` 集合中写入/更新, the 系统 shall 仅写入 `oaOpenid` 字段并在存在 `unionid` 时与既有用户合并，不覆盖小程序 `openid`。
4. While 授权失败或环境不满足（非微信内置浏览器/域名未备案/配置缺失）, when 系统处理异常, the 系统 shall 返回明确的错误提示页面或 JSON，便于排错。

### 需求 2 - 与小程序用户打通（优先使用 UnionID）

**用户故事：** 作为既有小程序用户，当我通过公众号 H5 授权时，系统能将我的 H5 身份与小程序身份自动关联，不产生重复账号。

#### 验收标准

1. While 回调结果含 `unionid`, when 数据库存在相同 `unionid` 的用户, the 系统 shall 绑定其 `oaOpenid` 至该用户记录。
2. While 回调结果不含 `unionid`, when 数据库存在相同 `oaOpenid` 的记录, the 系统 shall 使用该用户记录并不新建。
3. While 数据库未匹配到任何记录, when 本次仅有 `oaOpenid`, the 系统 shall 新建用户记录并写入 `oaOpenid` 与可用的基础信息（最少字段）。

### 需求 3 - 授权入口与回调 HTTP 能力

**用户故事：** 作为运营或前端同学，我需要稳定的授权入口和回调地址用于落地页/菜单配置。

#### 验收标准

1. While 访问授权入口 `GET /h5/oauth/start?state=...`, when 配置正确, the 系统 shall 302 重定向到微信授权链接。
2. While 微信回调至 `GET /h5/oauth/callback?code=...&state=...`, when 交换成功, the 系统 shall 完成入库并返回成功页面或 JSON。
3. While `state` 存在, when 回调到达, the 系统 shall 校验并原样透传回成功页用于业务路由或防 CSRF。

### 需求 4 - 配置与安全

**用户故事：** 作为运维，我需要可配置且安全的凭据管理方式。

#### 验收标准

1. While 需要调用公众号接口, when 系统读取配置, the 系统 shall 通过云函数环境变量读取 `WX_OA_APPID`、`WX_OA_SECRET`、`OA_OAUTH_REDIRECT`、`OA_OAUTH_SCOPE`（默认 `snsapi_base`）。
2. While 生产环境, when 输出日志, the 系统 shall 屏蔽敏感信息（如 `secret`、`access_token`）。
3. While 需要前端域名, when 构造 `redirect_uri`, the 系统 shall 使用已在公众号后台配置的“网页授权域名”。 