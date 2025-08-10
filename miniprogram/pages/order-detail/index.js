// order-detail/index.js
const app = getApp()

Page({
  data: {
    orderId: '',
    order: {},
    timeline: [],
    loading: true,
    userInfo: null
  },

  onLoad: function(options) {
    this.setData({
      orderId: options.id
    })
    this.loadUserInfo()
    this.loadOrderDetail()
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.loadOrderDetail()
  },

  // 加载用户信息
  loadUserInfo: function() {
    app.getUserInfo().then(userInfo => {
      this.setData({
        userInfo: userInfo
      })
    }).catch(err => {
      console.error('获取用户信息失败:', err)
    })
  },

  // 加载订单详情
  loadOrderDetail: function() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getDetail',
        orderId: this.data.orderId
      }
    }).then(res => {
      if (res.result.success) {
        const order = res.result.data
        order.statusText = this.getStatusText(order.status)
        order.statusDesc = this.getStatusDesc(order.status)
        order.createTimeText = this.formatTime(order.createTime)
        order.updateTimeText = this.formatTime(order.updateTime)
        order.paymentTimeText = order.paymentTime ? this.formatTime(order.paymentTime) : ''
        
        // 生成时间线
        const timeline = this.generateTimeline(order)
        
        this.setData({
          order: order,
          timeline: timeline
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载订单详情失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  // 获取状态文本
  getStatusText: function(status) {
    const statusMap = {
      '待接单': '等待接单',
      '进行中': '服务进行中',
      '已完成': '服务已完成',
      '已取消': '订单已取消'
    }
    return statusMap[status] || status
  },

  // 获取状态描述
  getStatusDesc: function(status) {
    const descMap = {
      '待接单': '等待服务提供者接单',
      '进行中': '服务正在进行中，请耐心等待',
      '已完成': '服务已完成，可以评价',
      '已取消': '订单已取消'
    }
    return descMap[status] || ''
  },

  // 格式化时间
  formatTime: function(timestamp) {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) { // 1分钟内
      return '刚刚'
    } else if (diff < 3600000) { // 1小时内
      return Math.floor(diff / 60000) + '分钟前'
    } else if (diff < 86400000) { // 1天内
      return Math.floor(diff / 3600000) + '小时前'
    } else if (diff < 2592000000) { // 30天内
      return Math.floor(diff / 86400000) + '天前'
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    }
  },

  // 生成时间线
  generateTimeline: function(order) {
    const timeline = []
    
    if (order.timeline && order.timeline.length > 0) {
      order.timeline.forEach((item, index) => {
        timeline.push({
          status: item.status,
          title: this.getTimelineTitle(item.status),
          desc: item.description,
          time: this.formatTime(item.time),
          active: index === order.timeline.length - 1
        })
      })
    } else {
      // 默认时间线
      timeline.push({
        status: '待接单',
        title: '订单创建',
        desc: '订单已创建，等待接单',
        time: this.formatTime(order.createTime),
        active: order.status === '待接单'
      })
      
      if (order.status !== '待接单') {
        timeline.push({
          status: '进行中',
          title: '订单接单',
          desc: '订单已被接单，服务进行中',
          time: this.formatTime(order.updateTime),
          active: order.status === '进行中'
        })
      }
      
      if (order.status === '已完成') {
        timeline.push({
          status: '已完成',
          title: '服务完成',
          desc: '服务已完成',
          time: this.formatTime(order.updateTime),
          active: true
        })
      }
      
      if (order.status === '已取消') {
        timeline.push({
          status: '已取消',
          title: '订单取消',
          desc: '订单已取消',
          time: this.formatTime(order.updateTime),
          active: true
        })
      }
    }
    
    return timeline
  },

  // 获取时间线标题
  getTimelineTitle: function(status) {
    const titleMap = {
      '待接单': '订单创建',
      '进行中': '订单接单',
      '已完成': '服务完成',
      '已取消': '订单取消'
    }
    return titleMap[status] || status
  },

  // 接单
  acceptOrder: function() {
    if (!this.checkPermission('receiver')) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认接单',
      content: `确定要接单"${this.data.order.service.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus('进行中')
        }
      }
    })
  },

  // 完成订单
  completeOrder: function() {
    if (!this.checkPermission('publisher')) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认完成',
      content: `确定要完成订单"${this.data.order.service.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus('已完成')
        }
      }
    })
  },

  // 取消订单
  cancelOrder: function() {
    wx.showModal({
      title: '确认取消',
      content: `确定要取消订单"${this.data.order.service.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus('已取消')
        }
      }
    })
  },

  // 支付订单
  payOrder: function() {
    if (!this.checkPermission('receiver')) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认支付',
      content: `确定要支付 ¥${this.data.order.price} 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.createPayment()
        }
      }
    })
  },

  // 评价订单
  reviewOrder: function() {
    wx.navigateTo({
      url: `/pages/review/index?orderId=${this.data.orderId}`
    })
  },

  // 更新订单状态
  updateOrderStatus: function(status) {
    wx.showLoading({
      title: '处理中...'
    })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'updateStatus',
        orderId: this.data.orderId,
        status: status
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({
          title: '操作成功',
          icon: 'success'
        })
        // 刷新订单详情
        this.loadOrderDetail()
      } else {
        wx.showToast({
          title: res.result.message || '操作失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('更新订单状态失败:', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }).finally(() => {
      wx.hideLoading()
    })
  },

  // 创建支付
  createPayment: function() {
    wx.showLoading({
      title: '创建支付...'
    })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'createPayment',
        orderId: this.data.orderId,
        paymentData: {}
      }
    }).then(res => {
      if (res.result.success) {
        // 调用微信支付
        this.requestPayment(res.result.data)
      } else {
        wx.showToast({
          title: res.result.message || '创建支付失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('创建支付失败:', err)
      wx.showToast({
        title: '创建支付失败',
        icon: 'none'
      })
    }).finally(() => {
      wx.hideLoading()
    })
  },

  // 请求支付
  requestPayment: function(paymentData) {
    wx.requestPayment({
      timeStamp: paymentData.timeStamp,
      nonceStr: paymentData.nonceStr,
      package: paymentData.package,
      signType: paymentData.signType,
      paySign: paymentData.paySign,
      success: (res) => {
        console.log('支付成功:', res)
        wx.showToast({
          title: '支付成功',
          icon: 'success'
        })
        // 刷新订单详情
        this.loadOrderDetail()
      },
      fail: (err) => {
        console.error('支付失败:', err)
        wx.showToast({
          title: '支付失败',
          icon: 'none'
        })
      }
    })
  },

  // 联系用户
  contactUser: function() {
    const order = this.data.order
    const isPublisher = this.data.userInfo && order.publisherOpenId === this.data.userInfo.openid
    
    wx.showActionSheet({
      itemList: ['拨打电话', '添加微信', '发送消息'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.makeCall(order, isPublisher)
            break
          case 1:
            this.addWechat(order, isPublisher)
            break
          case 2:
            this.sendMessage(order, isPublisher)
            break
        }
      }
    })
  },

  // 拨打电话
  makeCall: function(order, isPublisher) {
    const contactInfo = isPublisher ? order.receiver : order.publisher
    const phone = contactInfo?.phone || order.contactInfo?.phone
    
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone
      })
    } else {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none'
      })
    }
  },

  // 添加微信
  addWechat: function(order, isPublisher) {
    const contactInfo = isPublisher ? order.receiver : order.publisher
    const wechat = contactInfo?.wechat || order.contactInfo?.wechat
    
    if (wechat) {
      wx.setClipboardData({
        data: wechat,
        success: () => {
          wx.showToast({
            title: '微信号已复制',
            icon: 'success'
          })
        }
      })
    } else {
      wx.showToast({
        title: '暂无微信号',
        icon: 'none'
      })
    }
  },

  // 发送消息
  sendMessage: function(order, isPublisher) {
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    })
  },

  // 检查权限
  checkPermission: function(type) {
    if (!this.data.userInfo) return false
    
    const order = this.data.order
    if (type === 'publisher') {
      return order.publisherOpenId === this.data.userInfo.openid
    } else if (type === 'receiver') {
      return order.receiverId === this.data.userInfo.openid
    }
    return false
  },

  // 分享订单
  onShareAppMessage: function() {
    return {
      title: `订单详情 - ${this.data.order.service.title}`,
      path: `/pages/order-detail/index?id=${this.data.orderId}`
    }
  }
}) 