# 🔧 支付时获取订单详情失败修复说明

## 🐛 问题描述

用户反馈：支付时获取订单详情失败

## 🔍 问题分析

### 根本原因
1. **参数不匹配**：支付页面跳转到订单详情页面时使用 `orderNo` 参数，但订单详情页面期望 `id` 参数
2. **数据结构不一致**：支付页面期望通过 `orderNo` 字段查询订单，但实际订单数据结构中没有此字段
3. **云函数查询逻辑错误**：支付通知云函数试图通过不存在的 `orderNo` 字段更新订单

### 具体问题点

#### 1. 支付页面参数传递错误
```javascript
// 修复前：使用 orderNo 参数
url: `/pages/order-detail/index?orderNo=${this.data.orderInfo.orderNo}`

// 修复后：使用 id 参数
url: `/pages/order-detail/index?id=${this.data.orderInfo._id}`
```

#### 2. 支付页面订单查询逻辑错误
```javascript
// 修复前：通过 orderNo 字段查询（字段不存在）
const result = await db.collection('orders').where({
  orderNo: orderNo
}).get()

// 修复后：通过云函数获取订单详情
const result = await wx.cloud.callFunction({
  name: 'order',
  data: {
    action: 'getDetail',
    orderId: orderId
  }
})
```

#### 3. 支付通知云函数查询错误
```javascript
// 修复前：通过 orderNo 字段查询（字段不存在）
const orderResult = await db.collection('orders').where({
  orderNo: out_trade_no
}).update({...})

// 修复后：通过订单ID查询
const orderId = out_trade_no.split('_')[1]
const orderResult = await db.collection('orders').doc(orderId).update({...})
```

## ✅ 修复内容

### 1. 修复支付页面参数传递
**文件**：`miniprogram/pages/payment/index.js`
- 修改跳转链接，使用 `id` 参数而不是 `orderNo`
- 修改 `onLoad` 方法，接受 `id` 参数
- 修改 `loadOrderInfo` 方法，使用云函数获取订单详情

### 2. 修复支付页面模板
**文件**：`miniprogram/pages/payment/index.wxml`
- 修改字段引用，使用正确的订单数据结构
- `orderInfo.orderNo` → `orderInfo._id`
- `orderInfo.serviceTitle` → `orderInfo.service.title`
- `orderInfo.serviceTime` → `orderInfo.description`
- `orderInfo.serviceAddress` → `orderInfo.location.address`

### 3. 修复支付通知云函数
**文件**：`cloudfunctions/payment-notify/index.js`
- 修改订单查询逻辑，通过订单ID查询而不是 `orderNo`
- 修改订单状态更新，使用正确的状态值
- 修改服务状态更新，使用正确的状态值

### 4. 修复支付工具类
**文件**：`miniprogram/utils/payment.js`
- 确保 `outTradeNo` 格式正确：`ORDER_${orderId}_${Date.now()}`

## 🧪 测试步骤

### 1. 测试支付流程
1. 进入服务详情页面
2. 点击"接单"按钮
3. 确认接单
4. 点击"支付"按钮
5. 应该正常进入支付页面
6. 支付页面应该正确显示订单信息
7. 支付成功后应该正确跳转到订单详情页面

### 2. 测试订单详情页面
1. 进入订单列表
2. 点击任意订单进入详情页面
3. 应该正常加载订单详情
4. 点击"支付"按钮
5. 应该正常进入支付页面

### 3. 测试支付通知
1. 完成支付流程
2. 检查订单状态是否正确更新
3. 检查服务状态是否正确更新
4. 检查是否收到支付成功通知

## 🚀 部署状态

- ✅ **支付页面参数传递已修复**
- ✅ **支付页面订单查询已修复**
- ✅ **支付页面模板已修复**
- ✅ **支付通知云函数已修复**
- 🔄 **等待测试验证**

## 📝 技术说明

### 订单数据结构
```javascript
{
  _id: "订单ID",
  serviceId: "服务ID",
  service: {
    title: "服务标题",
    description: "服务描述"
  },
  price: 100, // 订单金额
  status: "待接单", // 订单状态
  paymentStatus: "未支付", // 支付状态
  // ... 其他字段
}
```

### 支付流程
1. **创建订单**：通过云函数 `order` 创建订单
2. **发起支付**：通过支付工具类发起微信支付
3. **支付回调**：微信支付成功后回调 `payment-notify` 云函数
4. **更新状态**：更新订单和服务状态
5. **跳转详情**：跳转到订单详情页面

### 关键修复点
1. **统一参数传递**：所有跳转都使用 `id` 参数
2. **统一数据查询**：使用云函数 `order` 的 `getDetail` 方法
3. **统一状态管理**：使用正确的状态值
4. **统一错误处理**：添加适当的错误提示

---

**测试结果**：请按照上述步骤测试，确认支付功能是否正常工作！ 