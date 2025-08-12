// order/index.js
const app = getApp()
const PaymentUtil = require('../../utils/payment.js')

Page({
  data: {
    loading: false,
    selectedStatus: '',
    selectedType: 'all',
    orderList: [],
    orderStats: null,
    statusList: [
      { value: '', name: '全部' },
      { value: '待接单', name: '待接单' },
      { value: '进行中', name: '进行中' },
      { value: '已完成', name: '已完成' },
      { value: '已取消', name: '已取消' }
    ],
    typeList: [
      { value: 'all', name: '全部订单' },
      { value: 'publish', name: '我发布的' },
      { value: 'receive', name: '我接的' }
    ],
    page: 1,
    hasMore: true
  },

  onLoad: function() {
    this.loadOrderStats()
    this.loadOrders()
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.refreshData()
  },

  // 刷新数据
  refreshData: function() {
    this.setData({
      page: 1,
      orderList: [],
      hasMore: true
    })
    this.loadOrderStats()
    this.loadOrders()
  },

  // 加载订单统计
  loadOrderStats: function() {
    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getOrderStats'
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          orderStats: res.result.data
        })
      }
    }).catch(err => {
      console.error('加载订单统计失败:', err)
    })
  },

  // 加载订单数据
  loadOrders: function() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    const query = {
      page: this.data.page,
      limit: 10,
      type: this.data.selectedType
    }

    // 添加状态筛选
    if (this.data.selectedStatus) {
      query.status = this.data.selectedStatus
    }

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getList',
        query: query
      }
    }).then(res => {
      if (res.result.success) {
        const newOrders = res.result.data.orders.map(order => {
          return {
            ...order,
            statusText: this.getStatusText(order.status),
            statusClass: this.mapStatusClass(order.status),
            createTimeText: this.formatTime(order.createTime)
          }
        })

        this.setData({
          orderList: this.data.page === 1 ? newOrders : [...this.data.orderList, ...newOrders],
          hasMore: res.result.data.hasMore,
          page: this.data.page + 1
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载订单失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  // 状态选择
  onStatusSelect: function(e) {
    const status = e.currentTarget.dataset.status
    this.setData({
      selectedStatus: status
    })
    this.refreshData()
  },

  // 类型选择
  onTypeSelect: function(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      selectedType: type
    })
    this.refreshData()
  },

  // 点击订单
  onOrderTap: function(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  },

  // 接单
  onAcceptOrder: function(e) {
    const orderId = e.currentTarget.dataset.id
    const order = this.data.orderList.find(o => o._id === orderId)
    
    if (!order) return

    wx.showModal({
      title: '确认接单',
      content: `确定要接单"${order.service.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(orderId, '进行中')
        }
      }
    })
  },

  // 完成订单
  onCompleteOrder: function(e) {
    const orderId = e.currentTarget.dataset.id
    const order = this.data.orderList.find(o => o._id === orderId)
    
    if (!order) return

    wx.showModal({
      title: '确认完成',
      content: `确定要完成订单"${order.service.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(orderId, '已完成')
        }
      }
    })
  },

  // 取消订单
  onCancelOrder: function(e) {
    const orderId = e.currentTarget.dataset.id
    const order = this.data.orderList.find(o => o._id === orderId)
    
    if (!order) return

    wx.showModal({
      title: '确认取消',
      content: `确定要取消订单"${order.service.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(orderId, '已取消')
        }
      }
    })
  },

  // 支付订单
  onPayOrder: function(e) {
    const orderId = e.currentTarget.dataset.id
    const order = this.data.orderList.find(o => o._id === orderId)
    
    if (!order) return

    // 使用支付工具类显示确认弹窗
    PaymentUtil.showPaymentConfirm({
      amount: order.price,
      title: order.service.title,
      onConfirm: () => {
        this.createPayment(orderId)
      }
    })
  },

  // 更新订单状态
  updateOrderStatus: function(orderId, status) {
    wx.showLoading({
      title: '处理中...'
    })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'updateStatus',
        orderId: orderId,
        status: status
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({
          title: '操作成功',
          icon: 'success'
        })
        // 刷新订单列表
        this.refreshData()
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
  createPayment: function(orderId) {
    // 获取订单信息
    const order = this.data.orderList.find(o => o._id === orderId)
    if (!order) {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      })
      return
    }

    // 使用支付工具类发起支付
    PaymentUtil.payOrder(order, 
      // 支付成功回调
      (res) => {
        // 支付成功后更新订单状态
        this.updateOrderPaymentStatus(orderId)
      },
      // 支付失败回调
      (err) => {
        console.error('支付失败:', err)
      }
    )
  },

  // 更新订单支付状态
  updateOrderPaymentStatus: function(orderId) {
    // 使用支付工具类更新订单状态
    PaymentUtil.updateOrderPaymentStatus(orderId).then(success => {
      if (success) {
        // 刷新订单列表
        this.refreshData()
      }
    })
  },

  // 联系用户
  onContactUser: function(e) {
    const orderId = e.currentTarget.dataset.id
    const order = this.data.orderList.find(o => o._id === orderId)
    
    if (!order) return

    wx.showActionSheet({
      itemList: ['拨打电话', '添加微信', '发送消息'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.makeCall(order)
            break
          case 1:
            this.addWechat(order)
            break
          case 2:
            this.sendMessage(order)
            break
        }
      }
    })
  },

  // 拨打电话
  makeCall: function(order) {
    const phone = order.contactInfo?.phone
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
  addWechat: function(order) {
    const wechat = order.contactInfo?.wechat
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
  sendMessage: function(order) {
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    })
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.refreshData()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom: function() {
    this.loadOrders()
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

  // 将状态映射为 ASCII 安全的 class 名
  mapStatusClass: function(status) {
    const classMap = {
      '待接单': 'pending',
      '进行中': 'in-progress',
      '已完成': 'completed',
      '已取消': 'canceled'
    }
    return classMap[status] || ''
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
      return date.toLocaleDateString()
    }
  }
}) 