# 微信支付配置文档

## 📋 配置清单

### 已完成配置
- ✅ 商户号：1724647300
- ✅ API密钥：n9g9qy5ULSrnDsnLAMxKIzeQPqT92N1l
- ✅ API证书：已下载

### 待配置项目
- ⏳ 小程序AppID
- ⏳ 支付回调域名
- ⏳ 证书文件上传

## 🔧 配置步骤

### 1. 小程序AppID配置

请在以下文件中替换小程序AppID：

**文件：** `cloudfunctions/payment/index.js`
**行号：** 第12行
```javascript
appId: 'wx1234567890abcdef', // 需要替换为实际的小程序AppID
```

**获取AppID方法：**
1. 登录微信公众平台：https://mp.weixin.qq.com/
2. 进入"开发" → "开发管理" → "开发设置"
3. 复制AppID（小程序ID）

### 2. 支付回调域名配置

**当前回调地址：**
```
https://cloud1-2g899deedcc43a17-1317031037.tcloudbaseapp.com/payment/notify
```

**配置方法：**
1. 登录微信商户平台：https://pay.weixin.qq.com/
2. 进入"产品中心" → "开发配置"
3. 在"支付回调"中添加上述域名

### 3. 证书文件上传

**证书文件：** `apiclient_cert.p12`

**上传方法：**
1. 将证书文件上传到云存储
2. 更新云函数中的证书路径
3. 确保云函数可以访问证书文件

### 4. 订阅消息模板配置

**文件：** `cloudfunctions/payment-notify/index.js`
**行号：** 第89行
```javascript
templateId: 'your_template_id', // 需要替换为实际的模板ID
```

**配置方法：**
1. 登录微信公众平台
2. 进入"功能" → "订阅消息"
3. 申请支付成功通知模板
4. 复制模板ID并替换

## 🚀 部署步骤

### 1. 部署云函数
```bash
# 部署支付云函数
cloudbase functions:deploy payment

# 部署支付回调云函数
cloudbase functions:deploy payment-notify
```

### 2. 创建HTTP触发器
```bash
# 为支付回调创建HTTP触发器
cloudbase functions:trigger:create payment-notify --type http --name payment-notify
```

### 3. 测试支付功能
1. 在小程序中创建测试订单
2. 进入支付页面
3. 使用微信支付测试

## 🔒 安全配置

### 1. 环境变量配置
建议将敏感信息配置为环境变量：

```javascript
// 在云函数中使用环境变量
const WECHAT_PAY_CONFIG = {
  appId: process.env.WECHAT_APP_ID,
  mchId: process.env.WECHAT_MCH_ID,
  mchKey: process.env.WECHAT_MCH_KEY
}
```

### 2. 数据库权限配置
确保订单集合的读写权限正确配置：

```javascript
// 订单集合权限规则
{
  "read": "auth.openid != null",
  "write": "auth.openid != null && auth.openid == resource.data.userId"
}
```

## 📝 测试清单

- [ ] 统一下单接口测试
- [ ] 支付回调处理测试
- [ ] 订单状态更新测试
- [ ] 通知发送测试
- [ ] 支付失败处理测试
- [ ] 订单查询测试

## ⚠️ 注意事项

1. **证书安全**：证书文件包含敏感信息，请妥善保管
2. **回调验证**：支付回调必须验证签名，确保数据安全
3. **错误处理**：完善的错误处理机制，避免支付异常
4. **日志记录**：记录支付相关日志，便于问题排查
5. **测试环境**：先在测试环境验证，再部署到生产环境

## 📞 技术支持

如遇配置问题，请参考：
- [微信支付开发文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [小程序支付API](https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestPayment.html)
- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html) 