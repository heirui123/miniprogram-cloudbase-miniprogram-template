// errand/index.js
const app = getApp()

Page({
  data: {
    loading: false,
    searchKeyword: '',
    selectedCategory: '',
    sortType: 'latest',
    taskList: [],
    categories: [
      { id: '', name: '全部' },
      { id: 'delivery', name: '快递代取' },
      { id: 'shopping', name: '代购' },
      { id: 'queue', name: '排队' },
      { id: 'other', name: '其他' }
    ],
    page: 1,
    hasMore: true
  },

  onLoad: function() {
    this.loadTasks()
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.refreshData()
  },

  // 刷新数据
  refreshData: function() {
    this.setData({
      page: 1,
      taskList: [],
      hasMore: true
    })
    this.loadTasks()
  },

  // 加载任务数据
  loadTasks: function() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    const query = {
      type: 'errand',
      page: this.data.page,
      limit: 10
    }

    // 添加筛选条件
    if (this.data.selectedCategory) {
      query.category = this.data.selectedCategory
    }

    if (this.data.searchKeyword) {
      query.keyword = this.data.searchKeyword
    }

    // 添加排序
    query.sort = this.data.sortType

    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'getList',
        query: query
      }
    }).then(res => {
      if (res.result.success) {
        const newTasks = res.result.data.map(task => {
          return {
            ...task,
            statusText: this.getStatusText(task.status),
            statusClass: this.mapStatusClass(task.status),
            createTimeText: this.formatTime(task.createTime)
          }
        })

        this.setData({
          taskList: this.data.page === 1 ? newTasks : [...this.data.taskList, ...newTasks],
          hasMore: newTasks.length === 10,
          page: this.data.page + 1
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载任务失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 搜索
  onSearch: function() {
    this.refreshData()
  },

  // 分类选择
  onCategorySelect: function(e) {
    const categoryId = e.currentTarget.dataset.id
    this.setData({
      selectedCategory: categoryId
    })
    this.refreshData()
  },

  // 排序选择
  onSortSelect: function(e) {
    const sortType = e.currentTarget.dataset.type
    this.setData({
      sortType: sortType
    })
    this.refreshData()
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

  // 跳转到任务详情
  goToTaskDetail: function(e) {
    const taskId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/task-detail/index?id=${taskId}`
    })
  },

  // 接单
  acceptTask: function(e) {
    const taskId = e.currentTarget.dataset.id
    
    // 检查登录状态
    app.checkLogin().then(userInfo => {
      wx.showModal({
        title: '确认接单',
        content: '确定要接这个任务吗？',
        success: (res) => {
          if (res.confirm) {
            this.submitAcceptTask(taskId)
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

  // 提交接单
  submitAcceptTask: function(taskId) {
    wx.showLoading({
      title: '正在接单...'
    })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'create',
        serviceId: taskId
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({
          title: '接单成功',
          icon: 'success'
        })
        // 刷新任务列表
        this.refreshData()
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
  contactPublisher: function(e) {
    const task = e.currentTarget.dataset.task
    wx.showActionSheet({
      itemList: ['拨打电话', '添加微信', '发送消息'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.makeCall(task)
            break
          case 1:
            this.addWechat(task)
            break
          case 2:
            this.sendMessage(task)
            break
        }
      }
    })
  },

  // 拨打电话
  makeCall: function(task) {
    const phone = task.contactInfo?.phone
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
  addWechat: function(task) {
    const wechat = task.contactInfo?.wechat
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
  sendMessage: function(task) {
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    })
  },

  // 跳转到发布页面
  goToPublish: function() {
    app.checkLogin().then(userInfo => {
      wx.navigateTo({
        url: '/pages/publish-service/index?type=errand'
      })
    }).catch(() => {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再发布任务',
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

  // 下拉刷新
  onPullDownRefresh: function() {
    this.refreshData()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom: function() {
    this.loadTasks()
  }
}) 