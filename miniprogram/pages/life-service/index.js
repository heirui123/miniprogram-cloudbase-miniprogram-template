// life-service/index.js
const app = getApp()

Page({
  data: {
    loading: false,
    searchKeyword: '',
    selectedCategory: '',
    sortType: 'time',
    serviceList: [],
    categories: [
      { id: '', name: '全部' },
      { id: 'repair', name: '水电维修' },
      { id: 'cleaning', name: '家政保洁' },
      { id: 'moving', name: '搬家服务' },
      { id: 'decoration', name: '装修装饰' },
      { id: 'other', name: '其他服务' }
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
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 搜索确认
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
  }
}) 