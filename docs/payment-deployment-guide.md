# 微信支付部署指南

## 🚀 快速部署步骤

### 1. 小程序AppID配置 ✅ 已完成
- 已更新为：`wx7a3e29b82bad702d`

### 2. 云函数部署

#### 方法一：使用微信开发者工具（推荐）

1. **打开微信开发者工具**
   - 导入项目：`D:\miniprogram-cloudbase-miniprogram-template`
   - 确保已登录微信开发者账号

2. **部署支付云函数**
   - 在微信开发者工具中，右键点击 `cloudfunctions/payment` 文件夹
   - 选择"上传并部署：云端安装依赖"
   - 等待部署完成

3. **部署支付回调云函数**
   - 右键点击 `cloudfunctions/payment-notify` 文件夹
   - 选择"上传并部署：云端安装依赖"
   - 等待部署完成

#### 方法二：使用命令行（如果PowerShell权限允许）

```bash
# 安装支付云函数依赖
cd cloudfunctions/payment
npm install

# 安装支付回调云函数依赖
cd ../payment-notify
npm install

# 使用微信开发者工具CLI部署
# 需要先安装微信开发者工具CLI
```

### 3. 微信商户平台配置

#### 3.1 配置支付回调域名

1. **登录微信商户平台**
   - 网址：https://pay.weixin.qq.com/
   - 使用商户号：1724647300

2. **配置回调域名**
   - 进入"产品中心" → "开发配置"
   - 添加支付回调域名：
   ```
   https://cloud1-2g899deedcc43a17-1317031037.tcloudbaseapp.com
   ```

#### 3.2 验证API证书

1. **检查证书文件**
   - 确保API证书已正确下载
   - 证书文件路径：`cloudfunctions/payment/apiclient_cert.p12`

2. **证书权限**
   - 确保云函数有权限读取证书文件

### 4. 订阅消息配置

#### 4.1 申请订阅消息模板

1. **登录微信公众平台**
   - 网址：https://mp.weixin.qq.com/
   - 使用小程序账号

2. **申请模板**
   - 进入"功能" → "订阅消息"
   - 申请"支付成功通知"模板
   - 记录模板ID

#### 4.2 更新模板ID

在 `cloudfunctions/payment-notify/index.js` 第89行替换：
```javascript
templateId: 'your_template_id', // 替换为实际的模板ID
```

### 5. 测试支付功能

#### 5.1 创建测试订单

1. **进入小程序**
   - 打开微信开发者工具
   - 预览或真机调试

2. **创建订单**
   - 进入服务页面
   - 选择服务项目
   - 创建订单

3. **测试支付**
   - 进入支付页面
   - 点击"立即支付"
   - 使用微信支付测试

#### 5.2 验证支付流程

- ✅ 统一下单接口调用
- ✅ 微信支付弹窗
- ✅ 支付回调处理
- ✅ 订单状态更新
- ✅ 通知发送

## 🔧 故障排除

### 常见问题

1. **云函数部署失败**
   - 检查网络连接
   - 确认微信开发者工具已登录
   - 检查云开发环境配置

2. **支付回调失败**
   - 确认回调域名配置正确
   - 检查云函数权限
   - 查看云函数日志

3. **证书读取失败**
   - 确认证书文件存在
   - 检查文件路径
   - 验证证书格式

### 调试方法

1. **查看云函数日志**
   - 在微信开发者工具中查看云函数日志
   - 检查错误信息

2. **测试接口**
   - 使用Postman测试统一下单接口
   - 验证签名算法

3. **检查数据库**
   - 确认订单数据正确保存
   - 验证支付状态更新

## 📞 技术支持

### 相关文档
- [微信支付开发文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [小程序支付API](https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestPayment.html)
- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)

### 联系方式
- 微信支付技术支持：400-100-0001
- 云开发技术支持：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html

## 🎯 部署检查清单

- [ ] 小程序AppID配置
- [ ] 支付云函数部署
- [ ] 支付回调云函数部署
- [ ] 支付回调域名配置
- [ ] 订阅消息模板申请
- [ ] 模板ID更新
- [ ] 支付功能测试
- [ ] 回调处理验证
- [ ] 通知发送测试

**当前进度：30%** - 小程序AppID已配置，需要完成云函数部署和商户平台配置 