// service-detail/index.js
const app = getApp()

Page({
  data: {
    serviceId: '',
    service: {},
    reviews: [],
    loading: true
  },

  onLoad: function(options) {
    this.setData({
      serviceId: options.id
    })
    this.loadServiceDetail()
  },

  // 加载服务详情
  loadServiceDetail: function() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'getDetail',
        serviceId: this.data.serviceId
      }
    }).then(res => {
      if (res.result.success) {
        const service = res.result.data
        service.statusText = this.getStatusText(service.status)
        service.statusClass = this.mapStatusClass(service.status)
        service.createTimeText = this.formatTime(service.createTime)
        
        this.setData({
          service: service,
          reviews: service.reviews || []
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载服务详情失败:', err)
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
      '发布中': '可接单',
      '已接单': '进行中',
      '已完成': '已完成',
      '已取消': '已取消'
    }
    return statusMap[status] || status
  },

  // 将状态映射为 ASCII 安全的 class 名
    mapStatusClass: function(status) {
    const classMap = {
      '发布中': 'publishing',
      '已接单': 'accepted',
      '已完成': 'done',
      '已取消': 'canceled'
    }
    return classMap[status] || ''
  },
 
   // 格式化时间
  formatTime: function(timestamp) {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  },

  // 拨打电话
  makeCall: function() {
    const phone = this.data.service.contactInfo?.phone
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
    const wechat = this.data.service.contactInfo?.wechat
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

  // 分享服务
  shareService: function() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 创建订单
  createOrder: function() {
    // 检查登录状态
    app.checkLogin().then(userInfo => {
      // 检查是否是自己的服务
      if (this.data.service.userId === userInfo._id) {
        wx.showToast({
          title: '不能接自己的单',
          icon: 'none'
        })
        return
      }

      wx.showModal({
        title: '确认接单',
        content: '确定要接这个服务吗？',
        success: (res) => {
          if (res.confirm) {
            this.submitOrder()
          }
        }
      })
    }).catch(() => {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再接单',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/index'
            })
          }
        }
      })
    })
  },

  // 提交订单
  submitOrder: function() {
    wx.showLoading({
      title: '正在接单...'
    })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'create',
        serviceId: this.data.serviceId
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({
          title: '接单成功',
          icon: 'success'
        })
        // 刷新服务状态
        this.loadServiceDetail()
      } else {
        wx.showToast({
          title: res.result.message || '接单失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('接单失败:', err)
      wx.showToast({
        title: '接单失败',
        icon: 'none'
      })
    }).finally(() => {
      wx.hideLoading()
    })
  },

  // 联系发布者
  contactPublisher: function() {
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

  // 发送消息
  sendMessage: function() {
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    })
  },

  // 分享
  onShareAppMessage: function() {
    return {
      title: this.data.service.title,
      path: `/pages/service-detail/index?id=${this.data.serviceId}`,
      imageUrl: this.data.service.images?.[0] || '/images/share-default.jpg'
    }
  },

  onShareTimeline: function() {
    return {
      title: this.data.service.title,
      imageUrl: this.data.service.images?.[0] || '/images/share-default.jpg'
    }
  }
}) 