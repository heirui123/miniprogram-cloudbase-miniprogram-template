// second-hand/index.js
const app = getApp()

Page({
  data: {
    loading: false,
    searchKeyword: '',
    selectedCategory: '',
    sortType: 'latest',
    itemList: [],
    categories: [
      { id: '', name: '全部', icon: '/images/category-all.png' },
      { id: 'furniture', name: '家具', icon: '/images/category-furniture.png' },
      { id: 'electronics', name: '电器', icon: '/images/category-electronics.png' },
      { id: 'clothing', name: '服装', icon: '/images/category-clothing.png' },
      { id: 'books', name: '图书', icon: '/images/category-books.png' },
      { id: 'sports', name: '运动', icon: '/images/category-sports.png' },
      { id: 'other', name: '其他', icon: '/images/category-other.png' }
    ],
    page: 1,
    hasMore: true
  },

  onLoad: function() {
    this.loadItems()
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.refreshData()
  },

  // 刷新数据
  refreshData: function() {
    this.setData({
      page: 1,
      itemList: [],
      hasMore: true
    })
    this.loadItems()
  },

  // 加载物品数据
  loadItems: function() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    const query = {
      type: 'second-hand',
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
        const newItems = res.result.data.map(item => {
          return {
            ...item,
            statusText: this.getStatusText(item.status),
            statusClass: this.mapStatusClass(item.status),
            createTimeText: this.formatTime(item.createTime)
          }
        })

        this.setData({
          itemList: this.data.page === 1 ? newItems : [...this.data.itemList, ...newItems],
          hasMore: newItems.length === 10,
          page: this.data.page + 1
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载物品失败:', err)
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
      '发布中': '在售',
      '已售出': '已售',
      '已下架': '下架'
    }
    return statusMap[status] || status
  },

  // 将状态映射为 ASCII 安全的 class 名
    mapStatusClass: function(status) {
    const classMap = {
      '发布中': 'publishing',
      '已售出': 'sold',
      '已下架': 'off'
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

  // 跳转到物品详情
  goToItemDetail: function(e) {
    const itemId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/item-detail/index?id=${itemId}`
    })
  },

  // 跳转到发布页面
  goToPublish: function() {
    app.checkLogin().then(userInfo => {
      wx.navigateTo({
        url: '/pages/publish-service/index?type=second-hand'
      })
    }).catch(() => {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再发布物品',
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
    this.loadItems()
  }
}) 