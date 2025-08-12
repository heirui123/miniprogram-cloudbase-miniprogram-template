# 微信支付云函数

## 功能说明

本云函数提供微信支付的核心功能，支持统一下单、查询订单、关闭订单等操作。

## 环境配置

### 1. 测试环境 (test-config.js)
- 使用测试数据，仅用于功能验证
- 商户号：1234567890
- API密钥：test_api_key_123456789
- 适用于开发测试阶段

### 2. 沙箱环境 (sandbox-config.js)
- 使用微信支付沙箱环境
- 商户号：1900000109（固定值）
- API密钥：8934e7d15453e97507ef794cf7b0519d（固定值）
- 适用于沙箱测试

### 3. 正式环境 (production-config.js)
- 使用真实的微信支付配置
- 需要替换为您的真实商户号和API密钥
- 适用于生产环境

## 使用方法

### 1. 统一下单
```javascript
const result = await wx.cloud.callFunction({
  name: 'payment',
  data: {
    action: 'unifiedOrder',
    envType: 'test', // 或 'sandbox', 'production'
    orderData: {
      outTradeNo: 'ORDER_123456',
      totalFee: 0.01,
      body: '商品描述',
      openid: '用户的OpenID'
    }
  }
})
```

### 2. 查询订单
```javascript
const result = await wx.cloud.callFunction({
  name: 'payment',
  data: {
    action: 'queryOrder',
    envType: 'test',
    outTradeNo: 'ORDER_123456'
  }
})
```

### 3. 关闭订单
```javascript
const result = await wx.cloud.callFunction({
  name: 'payment',
  data: {
    action: 'closeOrder',
    envType: 'test',
    outTradeNo: 'ORDER_123456'
  }
})
```

## 配置说明

### 测试环境配置
- 使用模拟数据，不会产生真实交易
- 适合开发阶段测试支付流程
- 返回签名错误是正常的（因为使用测试数据）

### 沙箱环境配置
- 使用微信官方沙箱环境
- 需要先获取沙箱密钥
- 不会产生真实交易

### 正式环境配置
- 需要真实的微信支付商户号
- 需要真实的API密钥
- 会产生真实的交易

## 注意事项

1. **环境选择**: 根据实际需求选择合适的环境
2. **配置安全**: 正式环境的配置信息需要妥善保管
3. **测试数据**: 测试环境使用模拟数据，返回错误是正常的
4. **沙箱环境**: 沙箱环境可能需要特殊配置和权限

## 错误处理

- **签名错误**: 通常是因为API密钥不正确或参数格式错误
- **网络错误**: 检查网络连接和API地址
- **参数错误**: 检查传入的参数格式和必填字段

## 开发建议

1. 开发阶段使用测试环境
2. 测试阶段使用沙箱环境
3. 生产环境使用正式环境
4. 定期检查配置的有效性 