# 技术设计文档：跑腿代办服务完善

## 架构设计

### 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   小程序前端     │    │   云函数后端     │    │   云数据库      │
│                 │    │                 │    │                 │
│ - 任务列表       │◄──►│ - service云函数   │◄──►│ - services集合   │
│ - 任务发布       │    │ - 任务管理       │    │ - orders集合     │
│ - 任务详情       │    │ - 订单管理       │    │ - users集合      │
│ - 接单功能       │    │ - 通知系统       │    │ - notifications  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈
- **前端**：微信小程序原生开发
- **后端**：云函数 + 云数据库
- **存储**：云数据库集合
- **地图**：微信小程序地图API
- **通知**：微信订阅消息

## 数据库设计

### services 集合扩展
```javascript
{
  _id: "服务ID",
  type: "errand", // 服务类型：errand=跑腿代办
  category: "delivery", // 任务分类：delivery=快递代取, shopping=代购, queue=排队, other=其他
  title: "任务标题",
  description: "任务详细描述",
  location: {
    address: "任务地点",
    latitude: 39.9042,
    longitude: 116.4074
  },
  price: 20, // 任务报酬
  deadline: "截止时间",
  contactInfo: {
    phone: "联系电话",
    wechat: "微信号"
  },
  publisher: {
    openid: "发布者OpenID",
    nickName: "发布者昵称",
    avatarUrl: "发布者头像"
  },
  status: "发布中", // 发布中、已接单、已完成、已取消
  createTime: "创建时间",
  updateTime: "更新时间"
}
```

### orders 集合扩展
```javascript
{
  _id: "订单ID",
  serviceId: "服务ID",
  serviceType: "errand",
  userId: "发布者OpenID",
  providerId: "接单者OpenID",
  status: "已接单", // 已接单、进行中、已完成、已取消
  acceptTime: "接单时间",
  completeTime: "完成时间",
  createTime: "创建时间",
  updateTime: "更新时间"
}
```

### notifications 集合
```javascript
{
  _id: "通知ID",
  userId: "接收者OpenID",
  type: "task_accepted", // 通知类型
  title: "通知标题",
  content: "通知内容",
  data: {
    serviceId: "相关服务ID",
    orderId: "相关订单ID"
  },
  isRead: false,
  createTime: "创建时间"
}
```

## 接口设计

### 服务云函数接口

#### 1. 获取跑腿任务列表
```javascript
// 请求参数
{
  action: 'getList',
  query: {
    type: 'errand',
    category: 'delivery', // 可选
    keyword: '搜索关键词', // 可选
    sort: 'latest', // latest=最新, price=价格, distance=距离
    page: 1,
    limit: 10
  }
}

// 响应结果
{
  success: true,
  data: [任务列表],
  total: 总数
}
```

#### 2. 创建跑腿任务
```javascript
// 请求参数
{
  action: 'create',
  serviceData: {
    type: 'errand',
    category: 'delivery',
    title: '任务标题',
    description: '任务描述',
    location: {
      address: '任务地点',
      latitude: 39.9042,
      longitude: 116.4074
    },
    price: 20,
    deadline: '截止时间',
    contactInfo: {
      phone: '联系电话',
      wechat: '微信号'
    }
  }
}

// 响应结果
{
  success: true,
  message: '发布成功',
  data: {
    serviceId: '服务ID'
  }
}
```

#### 3. 获取任务详情
```javascript
// 请求参数
{
  action: 'getDetail',
  serviceId: '服务ID'
}

// 响应结果
{
  success: true,
  data: {
    serviceInfo: {},
    publisherInfo: {},
    orderInfo: {} // 如果已接单
  }
}
```

### 订单云函数接口

#### 1. 接单
```javascript
// 请求参数
{
  action: 'create',
  serviceId: '服务ID'
}

// 响应结果
{
  success: true,
  message: '接单成功',
  data: {
    orderId: '订单ID'
  }
}
```

#### 2. 更新订单状态
```javascript
// 请求参数
{
  action: 'updateStatus',
  orderId: '订单ID',
  status: '进行中'
}

// 响应结果
{
  success: true,
  message: '状态更新成功'
}
```

## 页面设计

### 任务列表页 (pages/errand/index)
- **功能**：任务浏览、搜索、筛选、排序
- **交互**：下拉刷新、上拉加载、点击接单

### 任务发布页 (pages/publish-service/index)
- **功能**：任务信息填写、地图选点、价格设置
- **交互**：表单验证、图片上传、地址选择

### 任务详情页 (pages/task-detail/index)
- **功能**：任务详情展示、接单操作、联系发布者
- **交互**：地图显示、状态更新、沟通功能

### 订单管理页 (pages/order/index)
- **功能**：订单列表、状态跟踪、操作管理
- **交互**：状态更新、进度查看、评价功能

## 安全设计

### 权限控制
- 只有登录用户才能发布和接单
- 信用分数限制接单权限
- 防止重复接单

### 数据验证
- 任务信息完整性验证
- 价格范围限制
- 地址信息验证

### 防刷机制
- 发布频率限制
- 接单频率限制
- 异常行为检测

## 性能优化

### 数据库优化
- 任务列表分页查询
- 索引优化（type, category, status, createTime）
- 地理位置查询优化

### 前端优化
- 任务列表懒加载
- 图片压缩和CDN
- 本地状态管理

## 测试策略

### 功能测试
- 任务发布流程
- 接单流程
- 订单管理流程
- 通知功能

### 性能测试
- 大量任务数据加载
- 并发接单测试
- 地图服务性能

### 安全测试
- 权限验证
- 数据验证
- 防刷机制 