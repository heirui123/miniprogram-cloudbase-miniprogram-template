// order-detail/index.js
const app = getApp()

Page({
  data: {
    orderId: '',
    order: {},
    timeline: [],
    loading: true
  },

  onLoad: function(options) {
    this.setData({
      orderId: options.id
    })
    this.loadOrderDetail()
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  },

  // 生成时间线
  generateTimeline: function(order) {
    const timeline = [
      {
        status: '待接单',
        title: '订单创建',
        desc: '订单已创建，等待接单',
        time: this.formatTime(order.createTime),
        active: true
      }
    ]

    if (order.timeline && order.timeline.length > 0) {
      order.timeline.forEach(item => {
        timeline.push({
          status: item.status,
          title: this.getTimelineTitle(item.status),
          desc: this.getTimelineDesc(item.status),
          time: this.formatTime(item.time),
          active: true
        })
      })
    }

    // 根据当前状态设置激活项
    timeline.forEach((item, index) => {
      if (item.status === order.status) {
        item.active = true
      } else if (this.getStatusOrder(item.status) < this.getStatusOrder(order.status)) {
        item.active = true
      } else {
        item.active = false
      }
    })

    return timeline
  },

  // 获取状态顺序
  getStatusOrder: function(status) {
    const orderMap = {
      '待接单': 1,
      '进行中': 2,
      '已完成': 3,
      '已取消': 4
    }
    return orderMap[status] || 0
  },

  // 获取时间线标题
  getTimelineTitle: function(status) {
    const titleMap = {
      '进行中': '订单已接单',
      '已完成': '服务已完成',
      '已取消': '订单已取消'
    }
    return titleMap[status] || status
  },

  // 获取时间线描述
  getTimelineDesc: function(status) {
    const descMap = {
      '进行中': '服务提供者已接单，开始提供服务',
      '已完成': '服务已完成，感谢您的使用',
      '已取消': '订单已取消'
    }
    return descMap[status] || ''
  },

  // 联系用户
  contactUser: function() {
    wx.showActionSheet({
      itemList: ['拨打电话', '添加微信', '发送消息'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.makeCall()
            break
          case 1:
            this.addWechat()
            break
          case 2:
            this.sendMessage()
            break
        }
      }
    })
  },

  // 拨打电话
  makeCall: function() {
    const phone = this.data.order.contactInfo?.phone
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone,
        success: () => {
          console.log('拨打电话成功')
        },
        fail: (err) => {
          console.error('拨打电话失败:', err)
          wx.showToast({
            title: '拨打电话失败',
            icon: 'none'
          })
        }
      })
    } else {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none'
      })
    }
  },

  // 添加微信
  addWechat: function() {
    const wechat = this.data.order.contactInfo?.wechat
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
  sendMessage: function() {
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    })
  },

  // 接单
  acceptOrder: function() {
    wx.showModal({
      title: '确认接单',
      content: '确定要接这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus('进行中')
        }
      }
    })
  },

  // 完成订单
  completeOrder: function() {
    wx.showModal({
      title: '确认完成',
      content: '确定要完成这个订单吗？',
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
      content: '确定要取消这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus('已取消')
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
  }
}) 