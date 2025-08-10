// life-service/index.js
const app = getApp()

Page({
  data: {
    loading: false,
    searchKeyword: '',
    selectedCategory: '',
    selectedCategoryName: '',
    sortType: 'time',
    priceRange: '',
    selectedPriceRangeName: '',
    serviceList: [],
    searchHistory: [],
    showSearchHistory: false,
    searchSuggestions: [],
    showSuggestions: false,
    categories: [
      { id: '', name: '全部' },
      { id: 'repair', name: '水电维修' },
      { id: 'cleaning', name: '家政保洁' },
      { id: 'moving', name: '搬家服务' },
      { id: 'decoration', name: '装修装饰' },
      { id: 'other', name: '其他服务' }
    ],
    priceRanges: [
      { id: '', name: '全部价格' },
      { id: '0-50', name: '50元以下' },
      { id: '50-100', name: '50-100元' },
      { id: '100-200', name: '100-200元' },
      { id: '200-500', name: '200-500元' },
      { id: '500+', name: '500元以上' }
    ],
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
      type: 'life-service',
      page: this.data.page,
      limit: 10
    }

    // 添加分类筛选
    if (this.data.selectedCategory) {
      query.category = this.data.selectedCategory
    }

    // 添加搜索关键词
    if (this.data.searchKeyword) {
      query.keyword = this.data.searchKeyword
    }

    // 添加排序
    query.sort = this.data.sortType

    // 添加价格筛选
    if (this.data.priceRange) {
      query.priceRange = this.data.priceRange
    }

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
            statusClass: this.mapStatusClass(service.status),
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
      showSearchHistory: keyword.length > 0
    })
    
    // 生成搜索建议
    if (keyword.length > 0) {
      this.generateSearchSuggestions(keyword)
    } else {
      this.setData({
        showSuggestions: false,
        searchSuggestions: []
      })
    }
  },

  // 执行搜索
  onSearch: function() {
    if (!this.data.searchKeyword.trim()) {
      this.setData({
        showSearchHistory: false
      })
      return
    }
    
    // 保存搜索历史
    this.saveSearchHistory(this.data.searchKeyword)
    
    // 隐藏搜索历史
    this.setData({
      showSearchHistory: false
    })
    
    // 刷新数据
    this.refreshData()
  },

  // 分类选择
  onCategorySelect: function(e) {
    const categoryId = e.currentTarget.dataset.id
    const category = this.data.categories.find(c => c.id === categoryId)
    this.setData({
      selectedCategory: categoryId,
      selectedCategoryName: category ? category.name : ''
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

  // 价格筛选
  onPriceRangeSelect: function(e) {
    const priceRange = e.currentTarget.dataset.range
    const priceRangeObj = this.data.priceRanges.find(p => p.id === priceRange)
    this.setData({
      priceRange: priceRange,
      selectedPriceRangeName: priceRangeObj ? priceRangeObj.name : ''
    })
    this.refreshData()
  },

  // 重置筛选
  resetFilters: function() {
    this.setData({
      selectedCategory: '',
      selectedCategoryName: '',
      sortType: 'time',
      priceRange: '',
      selectedPriceRangeName: '',
      searchKeyword: ''
    })
    this.refreshData()
  },

  // 移除分类筛选
  removeCategoryFilter: function() {
    this.setData({
      selectedCategory: '',
      selectedCategoryName: ''
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

  // 跳转到服务详情
  goToServiceDetail: function(e) {
    const serviceId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/service-detail/index?id=${serviceId}`
    })
  },

  // 跳转到发布页面
  goToPublish: function() {
    // 检查登录状态
    app.checkLogin().then(() => {
      wx.navigateTo({
        url: '/pages/publish-service/index?type=life-service'
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
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
    if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前'
    
    return date.toLocaleDateString()
  },

  // 加载搜索历史
  loadSearchHistory: function() {
    try {
      const history = wx.getStorageSync('searchHistory') || []
      this.setData({
        searchHistory: history
      })
    } catch (e) {
      console.error('加载搜索历史失败:', e)
    }
  },

  // 保存搜索历史
  saveSearchHistory: function(keyword) {
    if (!keyword.trim()) return
    
    try {
      let history = wx.getStorageSync('searchHistory') || []
      // 移除重复项
      history = history.filter(item => item !== keyword)
      // 添加到开头
      history.unshift(keyword)
      // 限制历史记录数量
      if (history.length > 10) {
        history = history.slice(0, 10)
      }
      
      wx.setStorageSync('searchHistory', history)
      this.setData({
        searchHistory: history
      })
    } catch (e) {
      console.error('保存搜索历史失败:', e)
    }
  },

  // 清空搜索历史
  clearSearchHistory: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('searchHistory')
            this.setData({
              searchHistory: []
            })
            wx.showToast({
              title: '已清空',
              icon: 'success'
            })
          } catch (e) {
            console.error('清空搜索历史失败:', e)
          }
        }
      }
    })
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
      title: '生活服务 - 专业服务，贴心到家',
      path: '/pages/life-service/index',
      imageUrl: '/images/default-service.png'
    }
  },

  // 生成搜索建议
  generateSearchSuggestions: function(keyword) {
    const suggestions = []
    
    // 基于分类的建议
    this.data.categories.forEach(category => {
      if (category.name.includes(keyword) && category.id !== '') {
        suggestions.push({
          type: 'category',
          typeText: '分类',
          text: category.name,
          value: category.id
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
      '水电维修', '家政保洁', '搬家服务', '装修装饰',
      '空调清洗', '管道疏通', '电器维修', '家具安装'
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
        selectedCategory: suggestion.value
      })
    }
    
    // 执行搜索
    this.onSearch()
  }
}) 