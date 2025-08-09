# 社区服务小程序

一个基于微信小程序 + 云开发的社区服务平台，提供跑腿代办、二手闲置、宠物服务、好邻居互助、生活服务等核心功能。

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

## 🎯 项目特点

- 🏠 **温馨社区风格**：采用温暖的设计风格，营造邻里互助的社区氛围
- 📱 **微信小程序原生开发**：基于微信小程序原生框架，性能优异
- ☁️ **云开发架构**：集成腾讯云开发，提供完整的后端服务
- 🔐 **用户认证体系**：基于微信授权的用户登录和身份验证
- 💳 **会员制度**：支持会员等级和权益管理
- ⭐ **信用评分**：建立用户信用体系，促进社区信任
- 📋 **订单管理**：完整的订单生命周期管理
- 🎨 **UI组件库**：自定义组件库，提升开发效率

## 🚀 核心功能

### ✅ 已完成功能

#### 1. 用户认证与首页
- 微信授权登录
- 社区定位功能
- 分类入口（生活服务、跑腿、二手、宠物、互助）
- Banner轮播图
- 推荐服务和最新服务展示

#### 2. 生活服务模块（优先级最高）
- 服务分类展示（水电维修、家政保洁、搬家服务等）
- 服务列表浏览和搜索
- 服务详情查看
- 服务发布功能（包含图片上传、地址选择）
- 接单功能

#### 3. 订单管理系统
- 订单列表展示
- 订单状态筛选
- 订单详情页面
- 订单状态管理（接单、完成、取消）
- 订单时间线展示

#### 4. 个人中心
- 用户信息展示
- 我的服务管理
- 我的订单管理
- 会员中心入口
- 快捷操作（发布服务、扫码接单、邀请好友）

#### 5. 基础架构
- 数据库设计（用户、服务、订单、评价、会员表）
- 云函数开发（认证、服务、订单管理）
- 组件库（加载、空状态等）
- 温馨社区风格主题

### 🚧 开发中功能

#### 1. 其他服务模块
- 跑腿代办模块
- 二手闲置模块
- 宠物服务模块
- 好邻居互助模块

#### 2. 评价系统
- 订单评价功能
- 用户信用评分
- 评价展示

#### 3. 会员制度
- 会员等级管理
- 会员权益展示
- 会员升级功能

#### 4. 消息通知
- 订阅消息配置
- 订单状态通知
- 服务匹配通知

## 🛠️ 技术架构

### 前端技术栈
- **框架**: 微信小程序原生框架
- **UI组件**: 自定义组件 + WeUI
- **状态管理**: 小程序全局数据 + 页面数据
- **样式**: WXSS + 温馨社区风格设计

### 后端技术栈
- **云开发平台**: 腾讯云开发 CloudBase
- **数据库**: 云数据库（MongoDB风格）
- **云函数**: Node.js 18.15
- **云存储**: 文件存储服务
- **消息推送**: 订阅消息

### 数据库设计

#### 用户表 (users)
```javascript
{
  _id: "用户ID",
  openid: "微信openid",
  unionid: "微信unionid",
  nickName: "用户昵称",
  avatarUrl: "头像URL",
  phone: "手机号",
  location: { latitude, longitude, address },
  creditScore: "信用分数",
  memberLevel: "会员等级",
  memberExpireTime: "会员到期时间",
  createTime: "创建时间",
  updateTime: "更新时间"
}
```

#### 服务表 (services)
```javascript
{
  _id: "服务ID",
  userId: "发布者ID",
  type: "服务类型",
  category: "具体分类",
  title: "服务标题",
  description: "服务描述",
  price: "价格",
  images: ["图片URL数组"],
  contactInfo: { phone, wechat },
  location: { latitude, longitude, address },
  status: "状态",
  tags: ["标签数组"],
  createTime: "创建时间",
  updateTime: "更新时间"
}
```

#### 订单表 (orders)
```javascript
{
  _id: "订单ID",
  serviceId: "服务ID",
  publisherId: "发布者ID",
  receiverId: "接单者ID",
  status: "订单状态",
  price: "订单金额",
  description: "订单描述",
  contactInfo: { phone, wechat },
  location: { latitude, longitude, address },
  timeline: [{ status, time, description }],
  createTime: "创建时间",
  updateTime: "更新时间"
}
```

## 📁 项目结构

```
miniprogram-cloudbase-miniprogram-template/
├── cloudfunctions/           # 云函数
│   ├── auth/                # 用户认证云函数
│   ├── service/             # 服务管理云函数
│   ├── order/               # 订单管理云函数
│   ├── review/              # 评价管理云函数
│   ├── message/             # 消息推送云函数
│   └── member/              # 会员管理云函数
├── miniprogram/             # 小程序前端
│   ├── components/          # 自定义组件
│   │   ├── loading/         # 加载组件
│   │   └── empty/           # 空状态组件
│   ├── pages/               # 页面
│   │   ├── index/           # 首页
│   │   ├── life-service/    # 生活服务
│   │   ├── service-detail/  # 服务详情
│   │   ├── publish-service/ # 发布服务
│   │   ├── order/           # 订单管理
│   │   ├── order-detail/    # 订单详情
│   │   └── profile/         # 个人中心
│   ├── app.js               # 应用入口
│   ├── app.json             # 应用配置
│   └── app.wxss             # 全局样式
├── specs/                   # 项目规范文档
│   └── community-service/   # 社区服务项目规范
└── README.md               # 项目说明
```

## 🚀 快速开始

### 前提条件
- 安装微信开发者工具
- 拥有腾讯云开发账号
- 配置云开发环境

### 安装步骤

1. **克隆项目**
```bash
git clone [项目地址]
cd miniprogram-cloudbase-miniprogram-template
```

2. **配置云开发环境**
在 `miniprogram/app.js` 中修改环境 ID：
```javascript
wx.cloud.init({
  env: 'your-env-id', // 替换为你的云开发环境 ID
  traceUser: true,
});
```

3. **部署云函数**
在微信开发者工具中，右键点击 `cloudfunctions` 目录下的云函数，选择"上传并部署"。

4. **运行项目**
在微信开发者工具中导入项目，点击预览即可查看效果。

## 📋 开发计划

### 第一阶段：基础架构 ✅
- [x] 项目初始化配置
- [x] 数据库集合创建
- [x] 云函数开发
- [x] 用户认证模块
- [x] 首页模块开发
- [x] 导航与布局

### 第二阶段：核心功能 ✅
- [x] 生活服务列表页
- [x] 生活服务详情页
- [x] 发布生活服务
- [x] 订单创建流程
- [x] 订单管理页面
- [x] 个人中心页面

### 第三阶段：完善功能 🚧
- [ ] 其他服务模块开发
- [ ] 评价系统完善
- [ ] 会员制度实现
- [ ] 消息通知功能
- [ ] 性能优化
- [ ] 测试与部署

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 📄 许可证

本项目基于 MIT 许可证开源。

## 📞 联系我们

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件至：[邮箱地址]

---

**社区服务小程序** - 让邻里互助更简单，让社区生活更温暖！ 🏠✨

## 📜 素材来源与许可

- 图标：优先使用开源图标库（MIT 许可）：
  - Lucide（MIT）：`https://lucide.dev`
  - Tabler Icons（MIT）：`https://tabler-icons.io`
  - Heroicons（MIT）：`https://heroicons.com`
- Banner：自制渐变背景与几何元素（无需授权）。可选使用 `https://www.svgbackgrounds.com/` 免费授权资源作为纹理点缀（遵循其授权条款）。
- 生成脚本：`scripts/gen-images.js` 用于生成/覆盖 `miniprogram/images/` 下的占位与统一风格图片。所有图片仅作为占位示例，可在后续替换为正式设计图。
- 版权保留：`miniprogram/images/powered-by-cloudbase-badge.svg` 保留并遵循原始许可。

> 注：如替换为第三方正式素材，请更新本段落，标注来源与许可，确保可商用或等价开源许可。