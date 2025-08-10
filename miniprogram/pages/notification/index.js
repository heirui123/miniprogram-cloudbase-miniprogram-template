// notification/index.js
const app = getApp()

Page({
  data: {
    loading: false,
    notificationList: [],
    page: 1,
    hasMore: true
  },

  onLoad: function() {
    this.loadNotifications()
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.refreshData()
  },

  // 刷新数据
  refreshData: function() {
    this.setData({
      page: 1,
      notificationList: [],
      hasMore: true
    })
    this.loadNotifications()
  },

  // 加载通知数据
  loadNotifications: function() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    const query = {
      page: this.data.page,
      limit: 20
    }

    wx.cloud.callFunction({
      name: 'notification',
      data: {
        action: 'getList',
        query: query
      }
    }).then(res => {
      if (res.result.success) {
        const newNotifications = res.result.data

        this.setData({
          notificationList: this.data.page === 1 ? newNotifications : [...this.data.notificationList, ...newNotifications],
          hasMore: newNotifications.length === 20,
          page: this.data.page + 1
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载通知失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  // 获取通知图标
  getNotificationIcon: function(type) {
    const iconMap = {
      'task_accepted': '✅',
      'task_completed': '🎉',
      'task_canceled': '❌',
      'order_created': '📋',
      'order_updated': '🔄',
      'review_received': '⭐',
      'system_notice': '📢',
      'default': '📱'
    }
    return iconMap[type] || iconMap.default
  },

  // 点击通知
  onNotificationTap: function(e) {
    const notification = e.currentTarget.dataset.item
    
    // 标记为已读
    if (!notification.isRead) {
      this.markAsRead(notification._id)
    }

    // 根据通知类型跳转到相应页面
    this.handleNotificationAction(notification)
  },

  // 处理通知动作
  handleNotificationAction: function(notification) {
    const { type, data } = notification

    switch (type) {
      case 'task_accepted':
      case 'task_completed':
      case 'task_canceled':
        if (data.serviceId) {
          wx.navigateTo({
            url: `/pages/service-detail/index?id=${data.serviceId}`
          })
        }
        break
      case 'order_created':
      case 'order_updated':
        if (data.orderId) {
          wx.navigateTo({
            url: `/pages/order-detail/index?id=${data.orderId}`
          })
        }
        break
      case 'review_received':
        if (data.serviceId) {
          wx.navigateTo({
            url: `/pages/review/index?serviceId=${data.serviceId}`
          })
        }
        break
      default:
        // 默认不跳转
        break
    }
  },

  // 标记为已读
  markAsRead: function(notificationId) {
    wx.cloud.callFunction({
      name: 'notification',
      data: {
        action: 'markAsRead',
        notificationId: notificationId
      }
    }).then(res => {
      if (res.result.success) {
        // 更新本地数据
        const notificationList = this.data.notificationList.map(item => {
          if (item._id === notificationId) {
            return { ...item, isRead: true }
          }
          return item
        })
        
        this.setData({
          notificationList: notificationList
        })
      }
    }).catch(err => {
      console.error('标记已读失败:', err)
    })
  },

  // 全部标记为已读
  markAllAsRead: function() {
    wx.showModal({
      title: '确认操作',
      content: '确定要将所有通知标记为已读吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中...'
          })

          wx.cloud.callFunction({
            name: 'notification',
            data: {
              action: 'markAllAsRead'
            }
          }).then(res => {
            if (res.result.success) {
              // 更新本地数据
              const notificationList = this.data.notificationList.map(item => {
                return { ...item, isRead: true }
              })
              
              this.setData({
                notificationList: notificationList
              })
              
              wx.showToast({
                title: '操作成功',
                icon: 'success'
              })
            } else {
              wx.showToast({
                title: res.result.message || '操作失败',
                icon: 'none'
              })
            }
          }).catch(err => {
            console.error('全部标记已读失败:', err)
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            })
          }).finally(() => {
            wx.hideLoading()
          })
        }
      }
    })
  },

  // 删除通知
  deleteNotification: function(e) {
    const notificationId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'notification',
            data: {
              action: 'delete',
              notificationId: notificationId
            }
          }).then(res => {
            if (res.result.success) {
              // 从本地列表中移除
              const notificationList = this.data.notificationList.filter(item => {
                return item._id !== notificationId
              })
              
              this.setData({
                notificationList: notificationList
              })
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
            } else {
              wx.showToast({
                title: res.result.message || '删除失败',
                icon: 'none'
              })
            }
          }).catch(err => {
            console.error('删除通知失败:', err)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          })
        }
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.refreshData()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom: function() {
    this.loadNotifications()
  }
}) 