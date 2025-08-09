// neighbor-help/index.js
const app = getApp()

Page({
  data: {
    loading: false,
    searchKeyword: '',
    selectedHelpType: '',
    sortType: 'latest',
    helpList: [],
    helpTypes: [
      { id: '', name: '全部', icon: '/images/help-all.png' },
      { id: 'tools', name: '借工具', icon: '/images/help-tools.png' },
      { id: 'delivery', name: '代取快递', icon: '/images/help-delivery.png' },
      { id: 'care', name: '照看老人', icon: '/images/help-care.png' },
      { id: 'repair', name: '维修帮助', icon: '/images/help-repair.png' },
      { id: 'education', name: '教育辅导', icon: '/images/help-education.png' },
      { id: 'other', name: '其他', icon: '/images/help-other.png' }
    ],
    page: 1,
    hasMore: true
  },

  onLoad: function() {
    this.loadHelpList()
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.refreshData()
  },

  // 刷新数据
  refreshData: function() {
    this.setData({
      page: 1,
      helpList: [],
      hasMore: true
    })
    this.loadHelpList()
  },

  // 加载互助列表
  loadHelpList: function() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    const query = {
      type: 'neighbor-help',
      page: this.data.page,
      limit: 10
    }

    // 添加筛选条件
    if (this.data.selectedHelpType) {
      query.category = this.data.selectedHelpType
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
        const newHelpList = res.result.data.map(help => {
          return {
            ...help,
            statusText: this.getStatusText(help.status),
            statusClass: this.mapStatusClass(help.status),
            createTimeText: this.formatTime(help.createTime),
            urgencyText: this.getUrgencyText(help.urgency)
          }
        })

        this.setData({
          helpList: this.data.page === 1 ? newHelpList : [...this.data.helpList, ...newHelpList],
          hasMore: newHelpList.length === 10,
          page: this.data.page + 1
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载互助列表失败:', err)
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

  // 互助类型选择
  onHelpTypeSelect: function(e) {
    const helpTypeId = e.currentTarget.dataset.id
    this.setData({
      selectedHelpType: helpTypeId
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
      '求助中': '需要帮助',
      '已有人帮忙': '已有人帮忙',
      '已完成': '已完成',
      '已取消': '已取消'
    }
    return statusMap[status] || status
  },

  // 将状态映射为 ASCII 安全的 class 名
    mapStatusClass: function(status) {
    const classMap = {
      '求助中': 'requesting',
      '已有人帮忙': 'helping',
      '已完成': 'done',
      '已取消': 'canceled'
    }
    return classMap[status] || ''
  },
 
   // 获取紧急程度文本
  getUrgencyText: function(urgency) {
    const urgencyMap = {
      'low': '普通',
      'medium': '较急',
      'high': '紧急',
      'urgent': '非常紧急'
    }
    return urgencyMap[urgency] || '普通'
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

  // 跳转到互助详情
  goToHelpDetail: function(e) {
    const helpId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/service-detail/index?id=${helpId}`
    })
  },

  // 联系求助者
  contactRequester: function(e) {
    const help = e.currentTarget.dataset.help
    wx.showActionSheet({
      itemList: ['拨打电话', '添加微信', '发送消息'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.makeCall(help)
            break
          case 1:
            this.addWechat(help)
            break
          case 2:
            this.sendMessage(help)
            break
        }
      }
    })
  },

  // 拨打电话
  makeCall: function(help) {
    const phone = help.contactInfo?.phone
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
  addWechat: function(help) {
    const wechat = help.contactInfo?.wechat
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
  sendMessage: function(help) {
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    })
  },

  // 提供帮助
  offerHelp: function(e) {
    const helpId = e.currentTarget.dataset.id
    
    // 检查登录状态
    app.checkLogin().then(userInfo => {
      wx.showModal({
        title: '确认帮忙',
        content: '确定要为这个邻居提供帮助吗？',
        success: (res) => {
          if (res.confirm) {
            this.submitHelpOffer(helpId)
          }
        }
      })
    }).catch(() => {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再提供帮助',
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

  // 提交帮助申请
  submitHelpOffer: function(helpId) {
    wx.showLoading({
      title: '正在提交...'
    })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'create',
        serviceId: helpId
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({
          title: '申请成功',
          icon: 'success'
        })
        // 刷新互助列表
        this.refreshData()
      } else {
        wx.showToast({
          title: res.result.message || '申请失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('申请失败:', err)
      wx.showToast({
        title: '申请失败',
        icon: 'none'
      })
    }).finally(() => {
      wx.hideLoading()
    })
  },

  // 跳转到发布页面
  goToPublish: function() {
    app.checkLogin().then(userInfo => {
      wx.navigateTo({
        url: '/pages/publish-service/index?type=neighbor-help'
      })
    }).catch(() => {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再发布求助',
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
    this.loadHelpList()
  }
}) 