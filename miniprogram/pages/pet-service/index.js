// pet-service/index.js
const app = getApp()

Page({
  data: {
    loading: false,
    searchKeyword: '',
    selectedServiceType: '',
    selectedServiceTypeName: '',
    sortType: 'time',
    priceRange: '',
    selectedPriceRangeName: '',
    serviceList: [],
    serviceTypes: [
      { id: '', name: '全部' },
      { id: 'boarding', name: '寄养' },
      { id: 'walking', name: '遛狗' },
      { id: 'grooming', name: '洗护' },
      { id: 'training', name: '训练' },
      { id: 'medical', name: '医疗' },
      { id: 'other', name: '其他' }
    ],
    priceRanges: [
      { id: '', name: '全部价格' },
      { id: '0-50', name: '50元以下' },
      { id: '50-100', name: '50-100元' },
      { id: '100-200', name: '100-200元' },
      { id: '200-500', name: '200-500元' },
      { id: '500+', name: '500元以上' }
    ],
    searchHistory: [],
    searchSuggestions: [],
    showSearchHistory: false,
    showSuggestions: false,
    page: 1,
    hasMore: true
  },

  onLoad: function() {
    this.loadSearchHistory()
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

    if (this.data.priceRange) {
      query.priceRange = this.data.priceRange
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
            statusClass: this.getStatusClass(service.status),
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
    const keyword = e.detail.value
    this.setData({
      searchKeyword: keyword,
      showSearchHistory: false,
      showSuggestions: false
    })

    if (keyword.trim()) {
      this.generateSearchSuggestions(keyword)
    } else {
      this.setData({
        showSearchHistory: true,
        showSuggestions: false
      })
    }
  },

  // 搜索
  onSearch: function() {
    if (this.data.searchKeyword.trim()) {
      this.addSearchHistory(this.data.searchKeyword)
    }
    this.setData({
      showSearchHistory: false,
      showSuggestions: false
    })
    this.refreshData()
  },

  // 服务类型选择
  onServiceTypeSelect: function(e) {
    const serviceTypeId = e.currentTarget.dataset.id
    const serviceType = this.data.serviceTypes.find(item => item.id === serviceTypeId)
    this.setData({
      selectedServiceType: serviceTypeId,
      selectedServiceTypeName: serviceType ? serviceType.name : ''
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

  // 价格范围选择
  onPriceRangeSelect: function(e) {
    const priceRange = e.currentTarget.dataset.range
    const priceRangeItem = this.data.priceRanges.find(item => item.id === priceRange)
    this.setData({
      priceRange: priceRange,
      selectedPriceRangeName: priceRangeItem ? priceRangeItem.name : ''
    })
    this.refreshData()
  },

  // 重置筛选
  resetFilters: function() {
    this.setData({
      selectedServiceType: '',
      selectedServiceTypeName: '',
      priceRange: '',
      selectedPriceRangeName: '',
      searchKeyword: '',
      sortType: 'latest'
    })
    this.refreshData()
  },

  // 移除服务类型筛选
  removeServiceTypeFilter: function() {
    this.setData({
      selectedServiceType: '',
      selectedServiceTypeName: ''
    })
    this.refreshData()
  },

  // 移除价格筛选
  removePriceFilter: function() {
    this.setData({
      priceRange: '',
      selectedPriceRangeName: ''
    })
    this.refreshData()
  },

  // 移除搜索筛选
  removeSearchFilter: function() {
    this.setData({
      searchKeyword: ''
    })
    this.refreshData()
  },

  // 加载搜索历史
  loadSearchHistory: function() {
    const history = wx.getStorageSync('petServiceSearchHistory') || []
    this.setData({
      searchHistory: history
    })
  },

  // 添加搜索历史
  addSearchHistory: function(keyword) {
    let history = this.data.searchHistory
    // 移除重复项
    history = history.filter(item => item !== keyword)
    // 添加到开头
    history.unshift(keyword)
    // 限制数量
    if (history.length > 10) {
      history = history.slice(0, 10)
    }
    
    this.setData({
      searchHistory: history
    })
    wx.setStorageSync('petServiceSearchHistory', history)
  },

  // 清空搜索历史
  clearSearchHistory: function() {
    this.setData({
      searchHistory: []
    })
    wx.removeStorageSync('petServiceSearchHistory')
  },

  // 选择搜索历史
  selectSearchHistory: function(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({
      searchKeyword: keyword,
      showSearchHistory: false
    })
    this.onSearch()
  },

  // 生成搜索建议
  generateSearchSuggestions: function(keyword) {
    const suggestions = []
    
    // 基于服务类型的建议
    this.data.serviceTypes.forEach(serviceType => {
      if (serviceType.name.includes(keyword) && serviceType.id !== '') {
        suggestions.push({
          type: 'category',
          typeText: '分类',
          text: serviceType.name,
          value: serviceType.id
        })
      }
    })
    
    // 基于搜索历史的建议
    this.data.searchHistory.forEach(historyItem => {
      if (historyItem.includes(keyword) && !suggestions.find(s => s.text === historyItem)) {
        suggestions.push({
          type: 'history',
          typeText: '历史',
          text: historyItem,
          value: historyItem
        })
      }
    })
    
    // 通用建议
    const commonSuggestions = [
      '宠物寄养', '遛狗服务', '宠物洗护', '宠物训练',
      '宠物医疗', '宠物美容', '宠物摄影', '宠物托运'
    ]
    
    commonSuggestions.forEach(suggestion => {
      if (suggestion.includes(keyword) && !suggestions.find(s => s.text === suggestion)) {
        suggestions.push({
          type: 'common',
          typeText: '推荐',
          text: suggestion,
          value: suggestion
        })
      }
    })
    
    // 限制建议数量
    suggestions.splice(5)
    
    this.setData({
      searchSuggestions: suggestions,
      showSuggestions: suggestions.length > 0
    })
  },

  // 选择搜索建议
  selectSuggestion: function(e) {
    const suggestion = e.currentTarget.dataset.suggestion
    this.setData({
      searchKeyword: suggestion.text,
      showSuggestions: false,
      showSearchHistory: false
    })
    
    // 如果是分类建议，自动选择分类
    if (suggestion.type === 'category') {
      this.setData({
        selectedServiceType: suggestion.value
      })
    }
    
    // 执行搜索
    this.onSearch()
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

  // 获取状态样式类
  getStatusClass: function(status) {
    const statusClassMap = {
      '发布中': 'publishing',
      '已接单': 'accepted',
      '已完成': 'done',
      '已取消': 'canceled'
    }
    return statusClassMap[status] || ''
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
  },

  // 分享
  onShareAppMessage: function() {
    return {
      title: '宠物服务 - 专业宠物护理，贴心服务',
      path: '/pages/pet-service/index',
      imageUrl: '/images/default-service.png'
    }
  }
}) 