// pet-service/index.js
const app = getApp()

Page({
  data: {
    loading: false,
    searchKeyword: '',
    selectedServiceType: '',
    sortType: 'latest',
    serviceList: [],
    serviceTypes: [
      { id: '', name: '全部', icon: '/images/pet-all.png' },
      { id: 'boarding', name: '寄养', icon: '/images/pet-boarding.png' },
      { id: 'walking', name: '遛狗', icon: '/images/pet-walking.png' },
      { id: 'grooming', name: '洗护', icon: '/images/pet-grooming.png' },
      { id: 'training', name: '训练', icon: '/images/pet-training.png' },
      { id: 'medical', name: '医疗', icon: '/images/pet-medical.png' },
      { id: 'other', name: '其他', icon: '/images/pet-other.png' }
    ],
    page: 1,
    hasMore: true
  },

  onLoad: function() {
    this.loadServices()
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.refreshData()
  },

  // 刷新数据
  refreshData: function() {
    this.setData({
      page: 1,
      serviceList: [],
      hasMore: true
    })
    this.loadServices()
  },

  // 加载服务数据
  loadServices: function() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    const query = {
      type: 'pet-service',
      page: this.data.page,
      limit: 10
    }

    // 添加筛选条件
    if (this.data.selectedServiceType) {
      query.category = this.data.selectedServiceType
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
        const newServices = res.result.data.map(service => {
          return {
            ...service,
            statusText: this.getStatusText(service.status),
            createTimeText: this.formatTime(service.createTime)
          }
        })

        this.setData({
          serviceList: this.data.page === 1 ? newServices : [...this.data.serviceList, ...newServices],
          hasMore: newServices.length === 10,
          page: this.data.page + 1
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载服务失败:', err)
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

  // 服务类型选择
  onServiceTypeSelect: function(e) {
    const serviceTypeId = e.currentTarget.dataset.id
    this.setData({
      selectedServiceType: serviceTypeId
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
      '发布中': '可预约',
      '已预约': '已预约',
      '已完成': '已完成',
      '已取消': '已取消'
    }
    return statusMap[status] || status
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

  // 跳转到服务详情
  goToServiceDetail: function(e) {
    const serviceId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/service-detail/index?id=${serviceId}`
    })
  },

  // 联系服务提供者
  contactProvider: function(e) {
    const service = e.currentTarget.dataset.service
    wx.showActionSheet({
      itemList: ['拨打电话', '添加微信', '发送消息'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.makeCall(service)
            break
          case 1:
            this.addWechat(service)
            break
          case 2:
            this.sendMessage(service)
            break
        }
      }
    })
  },

  // 拨打电话
  makeCall: function(service) {
    const phone = service.contactInfo?.phone
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
  addWechat: function(service) {
    const wechat = service.contactInfo?.wechat
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
  sendMessage: function(service) {
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    })
  },

  // 预约服务
  bookService: function(e) {
    const serviceId = e.currentTarget.dataset.id
    
    // 检查登录状态
    app.checkLogin().then(userInfo => {
      wx.showModal({
        title: '确认预约',
        content: '确定要预约这个服务吗？',
        success: (res) => {
          if (res.confirm) {
            this.submitBooking(serviceId)
          }
        }
      })
    }).catch(() => {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再预约服务',
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

  // 提交预约
  submitBooking: function(serviceId) {
    wx.showLoading({
      title: '正在预约...'
    })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'create',
        serviceId: serviceId
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({
          title: '预约成功',
          icon: 'success'
        })
        // 刷新服务列表
        this.refreshData()
      } else {
        wx.showToast({
          title: res.result.message || '预约失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('预约失败:', err)
      wx.showToast({
        title: '预约失败',
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
        url: '/pages/publish-service/index?type=pet-service'
      })
    }).catch(() => {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再发布服务',
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
    this.loadServices()
  }
}) 