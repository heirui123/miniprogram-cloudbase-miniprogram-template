// service-detail/index.js
const app = getApp()

Page({
  data: {
    serviceId: '',
    service: {},
    reviews: [],
    reviewStats: null,
    serviceStats: null,
    relatedServices: [],
    isCollected: false,
    hasMoreReviews: false,
    reviewPage: 1,
    reviewLimit: 10,
    loading: true
  },

  onLoad: function(options) {
    this.setData({
      serviceId: options.id
    })
    this.loadServiceDetail()
    this.checkCollectionStatus()
  },

  onShow: function() {
    // 页面显示时刷新收藏状态
    this.checkCollectionStatus()
  },

  // 加载服务详情
  loadServiceDetail: function() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'getDetail',
        serviceId: this.data.serviceId
      }
    }).then(res => {
      if (res.result.success) {
        const service = res.result.data
        service.statusText = this.getStatusText(service.status)
        service.statusClass = this.mapStatusClass(service.status)
        service.createTimeText = this.formatTime(service.createTime)
        service.validTimeText = service.validTime ? this.formatTime(service.validTime) : ''
        
        this.setData({
          service: service,
          reviews: service.reviews || [],
          serviceStats: service.stats || null
        })

        // 加载评价统计
        this.loadReviewStats()
        // 加载相关推荐
        this.loadRelatedServices()
        // 记录浏览记录
        this.recordView()
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('加载服务详情失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  // 加载评价统计
  loadReviewStats: function() {
    wx.cloud.callFunction({
      name: 'review',
      data: {
        action: 'getStats',
        serviceId: this.data.serviceId
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          reviewStats: res.result.data
        })
      }
    }).catch(err => {
      console.error('加载评价统计失败:', err)
    })
  },

  // 加载相关推荐
  loadRelatedServices: function() {
    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'getRelated',
        serviceId: this.data.serviceId,
        category: this.data.service.category,
        limit: 3
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          relatedServices: res.result.data
        })
      }
    }).catch(err => {
      console.error('加载相关推荐失败:', err)
    })
  },

  // 记录浏览记录
  recordView: function() {
    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'recordView',
        serviceId: this.data.serviceId
      }
    }).catch(err => {
      console.error('记录浏览失败:', err)
    })
  },

  // 检查收藏状态
  checkCollectionStatus: function() {
    if (!app.globalData.userInfo) return

    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'checkCollection',
        serviceId: this.data.serviceId
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          isCollected: res.result.data.isCollected
        })
      }
    }).catch(err => {
      console.error('检查收藏状态失败:', err)
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
    } else if (diff < 86400000) { // 1天内
      return Math.floor(diff / 3600000) + '小时前'
    } else if (diff < 2592000000) { // 30天内
      return Math.floor(diff / 86400000) + '天前'
    } else {
      return date.toLocaleDateString()
    }
  },

  // 预览图片
  previewImage: function(e) {
    const current = e.currentTarget.dataset.url
    const urls = this.data.service.images || []
    
    wx.previewImage({
      current: current,
      urls: urls
    })
  },

  // 查看发布者资料
  viewPublisherProfile: function() {
    wx.navigateTo({
      url: `/pages/publisher-profile/index?userId=${this.data.service.userId}`
    })
  },

  // 拨打电话
  makeCall: function() {
    const phone = this.data.service.contactInfo?.phone
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
  addWechat: function() {
    const wechat = this.data.service.contactInfo?.wechat
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

  // 收藏服务
  collectService: function() {
    if (!app.globalData.userInfo) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再收藏',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/index'
            })
          }
        }
      })
      return
    }

    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'collect',
        serviceId: this.data.serviceId
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({ isCollected: true })
        wx.showToast({
          title: '收藏成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: res.result.message || '收藏失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('收藏失败:', err)
      wx.showToast({
        title: '收藏失败',
        icon: 'none'
      })
    })
  },

  // 取消收藏
  uncollectService: function() {
    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'uncollect',
        serviceId: this.data.serviceId
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({ isCollected: false })
        wx.showToast({
          title: '已取消收藏',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: res.result.message || '操作失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('取消收藏失败:', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    })
  },

  // 分享服务
  shareService: function() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 创建订单
  createOrder: function() {
    // 检查登录状态
    app.checkLogin().then(userInfo => {
      // 检查是否是自己的服务，如果是则显示特殊提示
      const isOwnService = this.data.service.openid === userInfo.openid
      const modalTitle = isOwnService ? '确认接自己的单' : '确认接单'
      const modalContent = isOwnService ? 
        '您确定要接自己发布的服务吗？' : 
        '确定要接这个服务吗？'

      wx.showModal({
        title: modalTitle,
        content: modalContent,
        success: (res) => {
          if (res.confirm) {
            this.submitOrder()
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

  // 提交订单
  submitOrder: function() {
    wx.showLoading({
      title: '正在接单...'
    })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'create',
        serviceId: this.data.serviceId
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({
          title: '接单成功',
          icon: 'success'
        })
        
        // 接单成功后，询问是否立即支付
        wx.showModal({
          title: '接单成功',
          content: `是否立即支付服务费用 ¥${this.data.service.price}？`,
          confirmText: '立即支付',
          cancelText: '稍后支付',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 跳转到订单详情页面进行支付
              wx.redirectTo({
                url: `/pages/order-detail/index?id=${res.result.data._id}`
              })
            } else {
              // 跳转到订单列表页面
              wx.switchTab({
                url: '/pages/order/index'
              })
            }
          }
        })
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
  contactPublisher: function() {
    wx.showActionSheet({
      itemList: ['拨打电话', '添加微信', '发送消息'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.makeCall()
            break
          case 1:
            this.addWechat()
            break
          case 2:
            this.sendMessage()
            break
        }
      }
    })
  },

  // 发送消息
  sendMessage: function() {
    // 检查是否已登录
    if (!getApp().globalData.userInfo) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再发送消息',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/index'
            })
          }
        }
      })
      return
    }

    // 跳转到聊天页面或显示联系方式
    wx.showActionSheet({
      itemList: ['复制微信号', '拨打电话'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 复制微信号
          wx.setClipboardData({
            data: this.data.service.contactInfo.wechat || '暂无微信号',
            success: () => {
              wx.showToast({
                title: '微信号已复制',
                icon: 'success'
              })
            }
          })
        } else if (res.tapIndex === 1) {
          // 拨打电话
          if (this.data.service.contactInfo.phone) {
            wx.makePhoneCall({
              phoneNumber: this.data.service.contactInfo.phone
            })
          } else {
            wx.showToast({
              title: '暂无联系电话',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 显示评价筛选
  showReviewFilter: function() {
    wx.showActionSheet({
      itemList: ['全部评价', '好评(4-5星)', '中评(3星)', '差评(1-2星)', '有图评价'],
      success: (res) => {
        this.filterReviews(res.tapIndex)
      }
    })
  },

  // 筛选评价
  filterReviews: function(filterType) {
    // 这里可以根据筛选类型重新加载评价
    console.log('筛选评价:', filterType)
    // 实际实现需要调用云函数进行筛选
  },

  // 点赞评价
  likeReview: function(e) {
    const reviewId = e.currentTarget.dataset.id
    const reviews = this.data.reviews
    const review = reviews.find(r => r._id === reviewId)
    
    if (!review) return

    wx.cloud.callFunction({
      name: 'review',
      data: {
        action: 'like',
        reviewId: reviewId
      }
    }).then(res => {
      if (res.result.success) {
        // 更新本地数据
        review.isLiked = !review.isLiked
        review.likeCount = review.isLiked ? (review.likeCount || 0) + 1 : (review.likeCount || 1) - 1
        
        this.setData({ reviews: reviews })
      }
    }).catch(err => {
      console.error('点赞失败:', err)
    })
  },

  // 回复评价
  replyReview: function(e) {
    const reviewId = e.currentTarget.dataset.id
    wx.showModal({
      title: '回复评价',
      editable: true,
      placeholderText: '请输入回复内容',
      success: (res) => {
        if (res.confirm && res.content) {
          this.submitReply(reviewId, res.content)
        }
      }
    })
  },

  // 提交回复
  submitReply: function(reviewId, content) {
    wx.cloud.callFunction({
      name: 'review',
      data: {
        action: 'reply',
        reviewId: reviewId,
        content: content
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({
          title: '回复成功',
          icon: 'success'
        })
        // 刷新评价列表
        this.loadReviews()
      } else {
        wx.showToast({
          title: res.result.message || '回复失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('回复失败:', err)
      wx.showToast({
        title: '回复失败',
        icon: 'none'
      })
    })
  },

  // 加载更多评价
  loadMoreReviews: function() {
    this.setData({
      reviewPage: this.data.reviewPage + 1
    })
    this.loadReviews()
  },

  // 加载评价列表
  loadReviews: function() {
    wx.cloud.callFunction({
      name: 'review',
      data: {
        action: 'getServiceReviews',
        serviceId: this.data.serviceId,
        page: this.data.reviewPage,
        limit: this.data.reviewLimit
      }
    }).then(res => {
      if (res.result.success) {
        const newReviews = res.result.data.reviews || []
        const reviews = this.data.reviewPage === 1 ? newReviews : [...this.data.reviews, ...newReviews]
        
        this.setData({
          reviews: reviews,
          hasMoreReviews: newReviews.length === this.data.reviewLimit
        })
      }
    }).catch(err => {
      console.error('加载评价失败:', err)
    })
  },

  // 跳转到服务详情
  goToServiceDetail: function(e) {
    const serviceId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/service-detail/index?id=${serviceId}`
    })
  },

  // 分享
  onShareAppMessage: function() {
    return {
      title: this.data.service.title,
      path: `/pages/service-detail/index?id=${this.data.serviceId}`,
      imageUrl: this.data.service.images?.[0] || '/images/share-default.jpg'
    }
  },

  onShareTimeline: function() {
    return {
      title: this.data.service.title,
      imageUrl: this.data.service.images?.[0] || '/images/share-default.jpg'
    }
  }
}) 