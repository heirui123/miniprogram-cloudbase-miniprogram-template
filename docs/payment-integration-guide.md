# 🎯 微信支付功能集成指南

## 📋 功能概述

您的微信支付功能已经完全配置完成，包含以下核心功能：

- ✅ **统一下单** - 创建支付订单
- ✅ **订单查询** - 查询支付状态  
- ✅ **支付回调** - 处理支付结果
- ✅ **真实配置** - 使用真实商户信息

## 🚀 快速开始

### 1. 测试支付功能

访问支付测试页面：
```
pages/payment-test/index
```

**测试步骤**：
1. 输入测试金额（建议0.01元）
2. 点击"发起测试支付"
3. 完成微信支付流程
4. 查看支付结果和订单历史

### 2. 在业务页面中集成支付

#### 基本调用方式

```javascript
// 1. 获取用户openid
const { result } = await wx.cloud.callFunction({
  name: 'getOpenId'
})

// 2. 调用统一下单
const paymentResult = await wx.cloud.callFunction({
  name: 'payment',
  data: {
    action: 'unifiedOrder',
    data: {
      outTradeNo: 'ORDER_' + Date.now(), // 订单号
      totalFee: 100, // 金额（分）
      body: '商品描述',
      openid: result.openid
    },
    useRealConfig: true // 使用真实配置
  }
})

// 3. 调用微信支付
if (paymentResult.result.success) {
  await wx.requestPayment({
    ...paymentResult.result.data,
    success: (res) => {
      console.log('支付成功:', res)
      // 处理支付成功逻辑
    },
    fail: (err) => {
      console.error('支付失败:', err)
      // 处理支付失败逻辑
    }
  })
}
```

#### 完整示例

```javascript
Page({
  data: {
    orderInfo: null,
    loading: false
  },

  // 发起支付
  async handlePayment() {
    if (!this.data.orderInfo) {
      wx.showToast({
        title: '订单信息不完整',
        icon: 'error'
      })
      return
    }

    try {
      this.setData({ loading: true })
      
      // 获取用户openid
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenId'
      })
      
      if (!result.openid) {
        throw new Error('获取用户信息失败')
      }

      // 调用统一下单
      const paymentResult = await wx.cloud.callFunction({
        name: 'payment',
        data: {
          action: 'unifiedOrder',
          data: {
            outTradeNo: this.data.orderInfo.orderNo,
            totalFee: this.data.orderInfo.totalFee * 100, // 转换为分
            body: this.data.orderInfo.serviceTitle || '社区服务',
            openid: result.openid
          },
          useRealConfig: true
        }
      })

      if (!paymentResult.result.success) {
        throw new Error(paymentResult.result.error || '统一下单失败')
      }

      // 调用微信支付
      await wx.requestPayment({
        ...paymentResult.result.data,
        success: (res) => {
          console.log('支付成功:', res)
          this.handlePaymentSuccess()
        },
        fail: (err) => {
          console.error('支付失败:', err)
          this.handlePaymentFail(err)
        }
      })

    } catch (error) {
      console.error('支付错误:', error)
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 支付成功处理
  async handlePaymentSuccess() {
    wx.showToast({
      title: '支付成功',
      icon: 'success'
    })
    
    // 跳转到订单详情页
    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/order-detail/index?orderNo=${this.data.orderInfo.orderNo}`
      })
    }, 1500)
  },

  // 支付失败处理
  handlePaymentFail(err) {
    let message = '支付失败'
    if (err.errMsg) {
      if (err.errMsg.includes('cancel')) {
        message = '支付已取消'
      } else if (err.errMsg.includes('fail')) {
        message = '支付失败，请重试'
      }
    }

    wx.showToast({
      title: message,
      icon: 'error'
    })
  }
})
```

## 📝 重要参数说明

### 统一下单参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| outTradeNo | String | 是 | 商户订单号，必须唯一 |
| totalFee | Number | 是 | 订单金额，单位：分 |
| body | String | 是 | 商品描述 |
| openid | String | 是 | 用户的openid |

### 注意事项

1. **金额单位**：totalFee参数的单位是分（1元 = 100分）
2. **订单号唯一**：outTradeNo必须唯一，建议使用时间戳
3. **openid真实**：必须使用真实用户的openid
4. **商品描述**：body参数不能为空

## 🔧 配置信息

### 当前配置

- **商户号**: `1724647300`
- **小程序AppID**: `wx7a3e29b82bad702d`
- **API密钥**: `z8K5G2Y1M9H3T7L4C6B0R8X2N5Q3W711`
- **云函数地址**: `https://cloud1-2g899deedcc43a17-1317031037.tcloudbaseapp.com`

### 配置文件位置

- 云函数配置: `cloudfunctions/payment/production-config.js`
- 小程序页面: `miniprogram/pages/payment/`
- 测试页面: `miniprogram/pages/payment-test/`

## 🧪 测试建议

### 开发阶段测试

1. **使用小额测试**：建议使用0.01元进行测试
2. **测试各种场景**：
   - 支付成功
   - 支付取消
   - 支付失败
   - 网络异常
3. **验证回调处理**：确认支付回调正常工作

### 生产环境测试

1. **真实用户测试**：使用真实用户的openid
2. **完整流程测试**：从下单到支付完成的完整流程
3. **异常处理测试**：测试各种异常情况的处理

## 📞 常见问题

### Q: 支付时提示"无效的openid"
A: 确保使用的是真实用户的openid，不能使用测试值

### Q: 支付金额显示错误
A: 检查totalFee参数，确保单位是分（1元 = 100分）

### Q: 订单查询失败
A: 确认订单号正确，且已调用过统一下单接口

### Q: 支付回调不工作
A: 检查云函数配置和回调地址设置

## 🎉 恭喜！

您的微信支付功能已经完全集成完成，可以正常使用了！

**下一步建议**：
1. 在业务页面中集成支付功能
2. 测试完整的支付流程
3. 配置支付成功后的业务逻辑
4. 监控支付状态和异常情况

---

**技术支持**: 如有问题，请查看云函数日志或联系技术支持。 