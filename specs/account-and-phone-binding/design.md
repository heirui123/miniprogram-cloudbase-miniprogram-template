# 技术方案设计：账号展示与手机号绑定

## 架构与改动范围
- 前端（小程序）
  - 页面：`miniprogram/pages/profile/index.wxml`、`miniprogram/pages/profile/index.js`
  - 新增 UI：
    - 展示“用户ID：XXXXXX”（取 `openid` 尾 6 位，大写）
    - 展示“手机号：138****5678”或“绑定手机号”按钮（`open-type="getPhoneNumber"`）
  - 逻辑：
    - 在 `loadUserInfo` 中计算并注入 `maskedUserId`、`maskedPhone`
    - 处理 `onGetPhoneNumber(e)` 事件，调云函数绑定手机号并刷新用户信息
- 后端（云函数）
  - 文件：`cloudfunctions/auth/index.js`
  - 新增 `action: 'bindPhone'`
    - 参数：`code`（来自按钮回调 `e.detail.code`）
    - 使用 `cloud.openapi.phonenumber.getPhoneNumber({ code })` 获取手机号
    - 更新 `users` 集合：`phoneNumber`、`phoneBindTime`
    - 返回更新后的用户文档

## 数据模型
- 集合：`users`
  - 已有：`openid`、`unionid`、`nickName`、`avatarUrl`、`creditScore`、`memberLevel`、`createTime`、`updateTime`
  - 新增：
    - `phoneNumber`: string
    - `phoneBindTime`: Date

## 接口设计
- 云函数：`auth`
  - `getUserInfo`
    - 入参：无
    - 出参：`{ success: boolean, data?: User }`
  - `login`
    - 入参：`{ userInfo: { nickName, avatarUrl } }`
    - 出参：`{ success: boolean, data?: User }`
  - `bindPhone`
    - 入参：`{ code: string }`
    - 处理：`cloud.openapi.phonenumber.getPhoneNumber({ code })`
    - 出参：`{ success: boolean, data?: User }`

### User（返回示例）
```
{
  _id: string,
  openid: string,
  nickName: string,
  avatarUrl: string,
  creditScore: number,
  memberLevel: string,
  phoneNumber?: string,
  createTime: Date,
  updateTime: Date,
  phoneBindTime?: Date
}
```

## 前端展示与交互
- 登录后：
  - 显示昵称
  - 显示“用户ID：XXXXXX”（`openid.slice(-6).toUpperCase()`）
  - 若已绑定手机号，显示掩码手机号 `maskPhone(phoneNumber)`；否则显示“绑定手机号”按钮
- 未登录：
  - 不显示用户ID与手机号，仅展示“立即登录”按钮

## 安全与合规
- 后端不打印完整手机号；如需日志仅记录掩码/错误码
- 前端仅展示掩码，不写入日志
- 云函数仅允许当前用户更新自己的 `users` 文档（依据 `OPENID`）

## 测试策略
- 单元：
  - 掩码函数：`maskPhone` 输入输出
  - `openid` 截取与大小写
- 集成：
  - 按钮授权成功/拒绝/异常
  - 绑定成功后页面刷新并隐藏按钮
  - 冷启动后从 `getUserInfo` 正确回显手机号与用户ID

## 回退方案
- 若 `bindPhone` 失败或不可用，前端保留按钮并提示“绑定失败，请重试”，不影响其他功能 