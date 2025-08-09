// review/index.js
const app = getApp()

Page({
  data: {
    showForm: false,
    loading: false,
    orderId: '',
    orderInfo: {},
    rating: 5,
    ratingText: '非常满意',
    reviewContent: '',
    reviewTags: [
      { id: 'professional', name: '专业', selected: false },
      { id: 'punctual', name: '准时', selected: false },
      { id: 'friendly', name: '友善', selected: false },
      { id: 'clean', name: '整洁', selected: false },
      { id: 'efficient', name: '高效', selected: false },
      { id: 'patient', name: '耐心', selected: false },
      { id: 'skilled', name: '技术好', selected: false },
      { id: 'reliable', name: '可靠', selected: false }
    ],
    canSubmit: false,
    filterType: 'all',
    reviewList: [],
    page: 1,
    hasMore: true
  },

  onLoad: function(options) {
    if (options.orderId) {
      this.setData({
        orderId: options.orderId,
        showForm: true
      })
      this.loadOrderInfo()
    } else {
      this.loadReviewList()
    }
  },

  // 加载订单信息
  loadOrderInfo: function() {
    wx.showLoading({
      title: '加载中...'
    })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getDetail',
        orderId: this.data.orderId
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          orderInfo: res.result.data
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载订单信息失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }).finally(() => {
      wx.hideLoading()
    })
  },

  // 星级评分
  onStarTap: function(e) {
    const index = e.currentTarget.dataset.index
    const rating = index + 1
    const ratingTexts = ['', '非常不满意', '不满意', '一般', '满意', '非常满意']
    
    this.setData({
      rating: rating,
      ratingText: ratingTexts[rating]
    })
    this.checkCanSubmit()
  },

  // 评价内容输入
  onContentInput: function(e) {
    this.setData({
      reviewContent: e.detail.value
    })
    this.checkCanSubmit()
  },

  // 标签选择
  onTagSelect: function(e) {
    const tagId = e.currentTarget.dataset.id
    const reviewTags = this.data.reviewTags.map(tag => {
      if (tag.id === tagId) {
        return { ...tag, selected: !tag.selected }
      }
      return tag
    })
    
    this.setData({
      reviewTags: reviewTags
    })
  },

  // 检查是否可以提交
  checkCanSubmit: function() {
    const canSubmit = this.data.rating > 0 && this.data.reviewContent.trim().length > 0
    this.setData({
      canSubmit: canSubmit
    })
  },

  // 取消评价
  cancelReview: function() {
    wx.navigateBack()
  },

  // 提交评价
  submitReview: function() {
    if (!this.data.canSubmit) return

    const selectedTags = this.data.reviewTags
      .filter(tag => tag.selected)
      .map(tag => tag.name)

    wx.showLoading({
      title: '提交中...'
    })

    wx.cloud.callFunction({
      name: 'review',
      data: {
        action: 'create',
        orderId: this.data.orderId,
        rating: this.data.rating,
        content: this.data.reviewContent,
        tags: selectedTags
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({
          title: '评价成功',
          icon: 'success'
        })
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.message || '评价失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('提交评价失败:', err)
      wx.showToast({
        title: '评价失败',
        icon: 'none'
      })
    }).finally(() => {
      wx.hideLoading()
    })
  },

  // 加载评价列表
  loadReviewList: function() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    const query = {
      page: this.data.page,
      limit: 10
    }

    if (this.data.filterType !== 'all') {
      query.filter = this.data.filterType
    }

    wx.cloud.callFunction({
      name: 'review',
      data: {
        action: 'getList',
        query: query
      }
    }).then(res => {
      if (res.result.success) {
        const newReviews = res.result.data.map(review => {
          return {
            ...review,
            createTimeText: this.formatTime(review.createTime)
          }
        })

        this.setData({
          reviewList: this.data.page === 1 ? newReviews : [...this.data.reviewList, ...newReviews],
          hasMore: newReviews.length === 10,
          page: this.data.page + 1
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载评价列表失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  // 筛选类型切换
  onFilterChange: function(e) {
    const filterType = e.currentTarget.dataset.type
    this.setData({
      filterType: filterType,
      page: 1,
      reviewList: [],
      hasMore: true
    })
    this.loadReviewList()
  },

  // 点赞评价
  likeReview: function(e) {
    const reviewId = e.currentTarget.dataset.id
    
    wx.cloud.callFunction({
      name: 'review',
      data: {
        action: 'like',
        reviewId: reviewId
      }
    }).then(res => {
      if (res.result.success) {
        // 更新本地数据
        const reviewList = this.data.reviewList.map(review => {
          if (review._id === reviewId) {
            return {
              ...review,
              likes: (review.likes || 0) + 1
            }
          }
          return review
        })
        
        this.setData({
          reviewList: reviewList
        })
        
        wx.showToast({
          title: '点赞成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: res.result.message || '点赞失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('点赞失败:', err)
      wx.showToast({
        title: '点赞失败',
        icon: 'none'
      })
    })
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
    this.setData({
      page: 1,
      reviewList: [],
      hasMore: true
    })
    this.loadReviewList()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom: function() {
    this.loadReviewList()
  }
}) 