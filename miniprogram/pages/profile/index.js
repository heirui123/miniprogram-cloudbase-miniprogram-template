// profile/index.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    serviceCount: 0,
    orderCount: 0,
    loading: false
  },

  onLoad: function() {
    this.loadUserInfo()
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.loadUserInfo()
    this.loadCounts()
  },

  // 加载用户信息
  loadUserInfo: function() {
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
      content: '请先登录后再使用个人中心功能',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          this.login()
        }
      }
    })
  },

  // 登录
  login: function() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        wx.cloud.callFunction({
          name: 'auth',
          data: {
            action: 'login',
            userInfo: res.userInfo
          }
        }).then(result => {
          if (result.result.success) {
            this.setData({
              userInfo: result.result.data
            })
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            })
          } else {
            wx.showToast({
              title: '登录失败',
              icon: 'none'
            })
          }
        }).catch(err => {
          console.error('登录失败:', err)
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          })
        })
      },
      fail: (err) => {
        console.log('获取用户信息失败:', err)
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        })
      }
    })
  },

  // 加载统计数据
  loadCounts: function() {
    if (!this.data.userInfo) return

    // 加载服务数量
    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'getMyServices'
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          serviceCount: res.result.data.length
        })
      }
    }).catch(err => {
      console.error('获取服务数量失败:', err)
    })

    // 加载订单数量
    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getMyOrders'
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          orderCount: res.result.data.length
        })
      }
    }).catch(err => {
      console.error('获取订单数量失败:', err)
    })
  },

  // 跳转到用户信息页面
  goToUserInfo: function() {
    if (!this.data.userInfo) {
      this.login()
      return
    }
    wx.navigateTo({
      url: '/pages/user-info/index'
    })
  },

  // 跳转到我的服务
  goToMyServices: function() {
    if (!this.data.userInfo) {
      this.login()
      return
    }
    wx.navigateTo({
      url: '/pages/my-services/index'
    })
  },

  // 跳转到我的订单
  goToMyOrders: function() {
    if (!this.data.userInfo) {
      this.login()
      return
    }
    wx.switchTab({
      url: '/pages/order/index'
    })
  },

  // 跳转到会员中心
  goToMemberCenter: function() {
    if (!this.data.userInfo) {
      this.login()
      return
    }
    wx.navigateTo({
      url: '/pages/member-center/index'
    })
  },

  // 跳转到设置页面
  goToSettings: function() {
    wx.navigateTo({
      url: '/pages/settings/index'
    })
  },

  // 跳转到帮助中心
  goToHelp: function() {
    wx.navigateTo({
      url: '/pages/help/index'
    })
  },

  // 跳转到关于我们
  goToAbout: function() {
    wx.navigateTo({
      url: '/pages/about/index'
    })
  },

  // 跳转到发布服务
  goToPublish: function() {
    if (!this.data.userInfo) {
      this.login()
      return
    }
    wx.navigateTo({
      url: '/pages/publish-service/index?type=life-service'
    })
  },

  // 跳转到扫码接单
  goToScan: function() {
    if (!this.data.userInfo) {
      this.login()
      return
    }
    wx.scanCode({
      success: (res) => {
        // 处理扫码结果
        console.log('扫码结果:', res)
        wx.showToast({
          title: '扫码功能开发中',
          icon: 'none'
        })
      }
    })
  },

  // 跳转到邀请好友
  goToInvite: function() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    })
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            userInfo: null,
            serviceCount: 0,
            orderCount: 0
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
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