# 测试环境配置指南

## 1. 环境准备

### 1.1 创建测试环境
```bash
# 登录云开发控制台
# 创建新的测试环境
# 环境名称: test-env
# 环境ID: cloud1-2g899deedcc43a17
```

✅ **已完成**：
- 环境别名已更新为：`test-env`
- 环境ID：`cloud1-2g899deedcc43a17`
- 环境状态：正常运行

### 1.2 数据库集合配置

✅ **已创建的集合**：
- `orders` - 订单数据
- `payments` - 支付记录
- `payment_logs` - 支付日志
- `test_results` - 测试结果
- `users` - 用户数据
- `goodsList` - 商品列表
- `services` - 服务数据

### 1.3 云函数配置

✅ **已部署的云函数**：
- `order` - 订单管理（包含支付功能）
- `paymentCallback` - 支付回调处理
- `auth` - 用户认证
- `service` - 服务管理
- `notification` - 通知服务

## 2. 微信支付配置

### 2.1 微信支付参数配置

在云开发控制台中配置以下参数：

1. **登录云开发控制台**
   - 访问：https://console.cloud.tencent.com/tcb
   - 选择环境：`test-env`

2. **配置微信支付参数**
   - 进入"设置" → "环境设置"
   - 找到"微信支付"配置项
   - 填入以下参数：

```json
{
  "mchId": "您的商户号",
  "mchKey": "您的商户密钥",
  "notifyUrl": "https://您的域名/paymentCallback",
  "certPath": "/path/to/cert/apiclient_cert.p12"
}
```

### 2.2 测试商户号配置

对于测试环境，可以使用以下配置：

```json
{
  "mchId": "test_mch_id",
  "mchKey": "test_mch_key",
  "notifyUrl": "https://cloud1-2g899deedcc43a17-1317031037.tcloudbaseapp.com/paymentCallback",
  "isTest": true
}
```

## 3. 小程序配置

### 3.1 小程序AppID配置

确保 `miniprogram/app.js` 中的环境ID正确：

```javascript
// app.js
wx.cloud.init({
  env: 'cloud1-2g899deedcc43a17', // 测试环境ID
  traceUser: true
})
```

### 3.2 支付权限配置

在 `miniprogram/app.json` 中确保已配置支付权限：

```json
{
  "permission": {
    "scope.userLocation": {
      "desc": "您的位置信息将用于小程序位置接口的效果展示"
    }
  }
}
```

## 4. 测试数据准备

### 4.1 测试商品数据

在 `goodsList` 集合中添加测试商品：

```json
{
  "id": "test_goods_001",
  "name": "测试商品",
  "price": 0.01,
  "description": "用于支付测试的商品",
  "image": "测试图片URL",
  "category": "测试分类",
  "status": "active"
}
```

### 4.2 测试服务数据

在 `services` 集合中添加测试服务：

```json
{
  "id": "test_service_001",
  "name": "测试服务",
  "price": 0.01,
  "description": "用于支付测试的服务",
  "duration": "30分钟",
  "status": "active"
}
```

## 5. 环境验证

### 5.1 基础功能测试

1. **数据库连接测试**
   - 验证数据库集合访问权限
   - 测试数据读写操作

2. **云函数调用测试**
   - 测试云函数部署状态
   - 验证函数调用权限

3. **支付功能测试**
   - 使用支付测试页面
   - 验证支付流程完整性

### 5.2 测试工具使用

使用项目中的支付测试页面进行功能验证：

1. 打开小程序
2. 进入"支付测试"页面
3. 点击"开始完整测试"
4. 查看测试报告

## 6. 注意事项

### 6.1 安全配置

- 确保测试环境与生产环境隔离
- 定期清理测试数据
- 监控支付日志和错误信息

### 6.2 成本控制

- 测试环境使用免费额度
- 避免产生实际费用
- 及时清理无用资源

### 6.3 数据备份

- 定期备份重要测试数据
- 保存测试报告和日志
- 记录配置变更历史

## 7. 故障排除

### 7.1 常见问题

1. **支付创建失败**
   - 检查微信支付参数配置
   - 验证商户号和密钥正确性
   - 确认回调URL可访问

2. **云函数调用失败**
   - 检查云函数部署状态
   - 验证函数权限配置
   - 查看函数执行日志

3. **数据库操作失败**
   - 检查数据库权限设置
   - 验证集合访问权限
   - 确认数据格式正确

### 7.2 日志查看

- 云函数日志：云开发控制台 → 云函数 → 日志
- 支付日志：`payment_logs` 集合
- 测试日志：`test_results` 集合

## 8. 下一步操作

✅ **环境配置完成**，现在可以：

1. **开始支付功能测试**
2. **配置微信支付参数**
3. **添加测试数据**
4. **运行自动化测试**

如需帮助，请参考项目文档或联系技术支持。 