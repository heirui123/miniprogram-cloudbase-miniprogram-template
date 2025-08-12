// index.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    address: '',
    loading: true,
    banners: [
      {
        id: 1,
        image: '/images/banner1.jpg',
        title: '社区服务新上线',
        url: '/pages/life-service/index'
      },
      {
        id: 2,
        image: '/images/banner2.jpg',
        title: '邻里互助活动',
        url: '/pages/neighbor-help/index'
      },
      {
        id: 3,
        image: '/images/banner3.jpg',
        title: '宠物服务专区',
        url: '/pages/pet-service/index'
      }
    ],
    categories: [
      {
        id: 1,
        name: '生活服务',
        icon: '/images/category-life.png',
        type: 'life-service'
      },
      {
        id: 2,
        name: '跑腿代办',
        icon: '/images/category-errand.png',
        type: 'errand'
      },
      {
        id: 3,
        name: '二手闲置',
        icon: '/images/category-second.png',
        type: 'second-hand'
      },
      {
        id: 4,
        name: '宠物服务',
        icon: '/images/category-pet.png',
        type: 'pet-service'
      },
      {
        id: 5,
        name: '邻居互助',
        icon: '/images/category-neighbor.png',
        type: 'neighbor-help'
      }
    ],
    recommendServices: [],
    latestServices: []
  },

  onLoad: function() {
    this.initPage()
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.loadServices()
  },

  // 初始化页面
  initPage: function() {
    this.checkLogin()
    this.loadServices()
  },

  // 检查登录状态
  checkLogin: function() {
    app.checkLogin().then(userInfo => {
      this.setData({
        userInfo: userInfo
      })
    }).catch(err => {
      console.log('用户未登录:', err)
      // 引导用户登录
      this.showLoginModal()
    })
  },

  // 显示登录弹窗
  showLoginModal: function() {
    wx.showModal({
      title: '需要登录',
      content: '请先登录后再使用服务',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          this.goToProfile()
        }
      }
    })
  },

  // 加载服务数据
  loadServices: function() {
    this.setData({ loading: true })

    // 调用云函数获取推荐服务
    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'getList',
        query: {
          type: 'life-service',
          limit: 3
        }
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          recommendServices: res.result.data
        })
      }
    }).catch(err => {
      console.error('获取推荐服务失败:', err)
    })

    // 获取最新服务
    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'getList',
        query: {
          limit: 5
        }
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          latestServices: res.result.data
        })
      }
    }).catch(err => {
      console.error('获取最新服务失败:', err)
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  // Banner点击事件
  onBannerTap: function(e) {
    const item = e.currentTarget.dataset.item
    if (item.url) {
      wx.navigateTo({
        url: item.url
      })
    }
  },

  // 分类点击事件
  goToCategory: function(e) {
    const category = e.currentTarget.dataset.category
    const urlMap = {
      'life-service': '/pages/life-service/index',
      'errand': '/pages/errand/index',
      'second-hand': '/pages/second-hand/index',
      'pet-service': '/pages/pet-service/index',
      'neighbor-help': '/pages/neighbor-help/index'
    }
    
    const url = urlMap[category.type]
    if (url) {
      wx.navigateTo({
        url: url
      })
    }
  },

  // 跳转到生活服务
  goToLifeService: function() {
    wx.switchTab({
      url: '/pages/life-service/index'
    })
  },

  // 跳转到服务详情
  goToServiceDetail: function(e) {
    const serviceId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/service-detail/index?id=${serviceId}`
    })
  },

  // 跳转到个人中心
  goToProfile: function() {
    wx.switchTab({
      url: '/pages/profile/index'
    })
  },

  // 跳转到支付测试页面
  goToPaymentTest: function() {
    wx.navigateTo({
      url: '/pages/payment-test/index'
    })
  },

  // 跳转到支付集成示例页面
  goToPaymentIntegrationDemo: function() {
    wx.navigateTo({
      url: '/pages/payment-integration-demo/index'
    })
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadServices()
    wx.stopPullDownRefresh()
  },

  // 分享
  onShareAppMessage: function() {
    return {
      title: '社区服务 - 邻里互助，温暖社区',
      path: '/pages/index/index',
      imageUrl: '/images/share.jpg'
    }
  }
})