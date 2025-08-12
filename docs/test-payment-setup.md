# 🧪 微信支付测试环境设置指南

## 📋 申请测试商户号步骤

### 1. 访问微信支付测试平台
- 网址：https://pay.weixin.qq.com/wiki/doc/apiv3/wechatpay/wechatpay4_0.shtml
- 或者直接访问：https://pay.weixin.qq.com/index.php/core/cert/api_cert

### 2. 申请测试商户号
1. 点击 **"申请测试商户号"**
2. 填写申请信息：
   - 联系人姓名
   - 联系电话
   - 邮箱地址
   - 申请用途（选择"开发测试"）
3. 提交申请

### 3. 获取测试配置信息
申请成功后，您将获得：
- **测试商户号**（通常以 `1900000109` 开头）
- **测试API密钥**（32位随机字符串）
- **测试证书文件**

## 🔧 更新云函数配置

### 1. 更新payment云函数配置
将测试商户号信息更新到云函数中：

```javascript
// 测试环境配置
const config = {
  appId: 'wx7a3e29b82bad702d',  // 您的小程序AppID
  mchId: '1900000109',          // 测试商户号（需要替换）
  apiKey: 'test_api_key_32',    // 测试API密钥（需要替换）
  notifyUrl: 'https://your-env.tcloudbaseapp.com/payment-notify'
};
```

### 2. 更新payment-notify云函数配置
同样更新通知云函数的配置。

## 🎯 测试支付流程

### 1. 测试统一下单
```json
{
  "action": "unifiedOrder",
  "orderData": {
    "outTradeNo": "TEST_" + Date.now(),
    "totalFee": 0.01,
    "body": "测试支付",
    "openid": "test_openid"
  }
}
```

### 2. 测试查询订单
```json
{
  "action": "queryOrder",
  "orderData": {
    "outTradeNo": "TEST_1733827200000"
  }
}
```

## ⚠️ 重要注意事项

### 1. 测试环境限制
- 测试商户号只能用于开发测试
- 不能用于正式生产环境
- 测试金额通常限制在1分钱

### 2. 测试用户
- 需要使用测试用户的openid
- 可以通过微信开发者工具获取测试openid

### 3. 证书文件
- 测试环境也需要证书文件
- 证书文件需要上传到云函数

## 🚀 快速开始

### 1. 立即申请
点击链接申请测试商户号：
https://pay.weixin.qq.com/index.php/core/cert/api_cert

### 2. 获取配置后
联系我更新云函数配置，然后就可以开始测试了！

## 📞 技术支持

如果申请过程中遇到问题：
- 微信支付技术支持：400-100-0001
- 商户平台客服：https://pay.weixin.qq.com/index.php/core/help/help_center 