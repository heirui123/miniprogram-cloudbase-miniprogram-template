// order/index.js
const app = getApp()

Page({
  data: {
    loading: false,
    selectedStatus: '',
    orderList: [],
    statusList: [
      { value: '', name: '全部' },
      { value: '待接单', name: '待接单' },
      { value: '进行中', name: '进行中' },
      { value: '已完成', name: '已完成' },
      { value: '已取消', name: '已取消' }
    ],
    page: 1,
    hasMore: true
  },

  onLoad: function() {
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
    this.loadOrders()
  },

  // 加载订单数据
  loadOrders: function() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    const query = {
      page: this.data.page,
      limit: 10
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
        const newOrders = res.result.data.map(order => {
          return {
            ...order,
            statusText: this.getStatusText(order.status),
            statusClass: this.mapStatusClass(order.status),
            createTimeText: this.formatTime(order.createTime)
          }
        })

        this.setData({
          orderList: this.data.page === 1 ? newOrders : [...this.data.orderList, ...newOrders],
          hasMore: newOrders.length === 10,
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
      '进行中': 'inprogress',
      '已完成': 'done',
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
    } else if (diff < 86400000) { // 24小时内
      return Math.floor(diff / 3600000) + '小时前'
    } else if (diff < 2592000000) { // 30天内
      return Math.floor(diff / 86400000) + '天前'
    } else {
      return date.toLocaleDateString()
    }
  },

  // 跳转到订单详情
  goToOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${orderId}`
    })
  },

  // 联系用户
  contactUser: function(e) {
    const order = e.currentTarget.dataset.order
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
    const phone = order.service.contactInfo?.phone
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
  addWechat: function(order) {
    const wechat = order.service.contactInfo?.wechat
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

  // 接单
  acceptOrder: function(e) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认接单',
      content: '确定要接这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(orderId, '进行中')
        }
      }
    })
  },

  // 完成订单
  completeOrder: function(e) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认完成',
      content: '确定要完成这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(orderId, '已完成')
        }
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

  // 下拉刷新
  onPullDownRefresh: function() {
    this.refreshData()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom: function() {
    this.loadOrders()
  }
}) 