const app = getApp()

Page({
  data: {
    orderInfo: null,
    paymentAmount: 0,
    loading: false,
    paymentResult: null,
    outTradeNo: '' // 保存支付订单号
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.loadOrderInfo(id)
    } else {
      wx.showToast({
        title: '订单ID不能为空',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 加载订单信息
  async loadOrderInfo(orderId) {
    try {
      this.setData({ loading: true })
      
      // 使用云函数获取订单详情
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'getDetail',
          orderId: orderId
        }
      })
      
      if (result.result.success) {
        const orderInfo = result.result.data
        this.setData({
          orderInfo: orderInfo,
          paymentAmount: orderInfo.price || 0
        })
      } else {
        wx.showToast({
          title: result.result.message || '订单不存在',
          icon: 'error'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载订单信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 发起支付
  async handlePayment() {
    if (!this.data.orderInfo) {
      wx.showToast({
        title: '订单信息不完整',
        icon: 'error'
      })
      return
    }

    try {
      this.setData({ loading: true })
      
      // 获取用户openid
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenId'
      })
      
      if (!result.openid) {
        throw new Error('获取用户信息失败')
      }

      // 生成短订单号，确保不超过32字符
      const timestamp = Date.now().toString().slice(-8) // 取后8位
      const orderIdShort = this.data.orderInfo._id.slice(-8) // 取订单ID后8位
      const outTradeNo = `O${orderIdShort}${timestamp}`
      this.setData({ outTradeNo })
      
      // 调用统一下单
      const paymentResult = await wx.cloud.callFunction({
        name: 'payment',
        data: {
          action: 'unifiedOrder',
          data: {
            outTradeNo: outTradeNo,
            totalFee: this.data.paymentAmount * 100, // 转换为分
            body: this.data.orderInfo.service.title || '社区服务',
            openid: result.openid
          },
          useRealConfig: true // 使用真实配置
        }
      })

      if (!paymentResult.result.success) {
        throw new Error(paymentResult.result.error || '统一下单失败')
      }

      // 调用微信支付
      const payResult = await wx.requestPayment({
        ...paymentResult.result.data,
        success: (res) => {
          console.log('支付成功:', res)
          this.handlePaymentSuccess()
        },
        fail: (err) => {
          console.error('支付失败:', err)
          this.handlePaymentFail(err)
        }
      })

    } catch (error) {
      console.error('支付错误:', error)
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 支付成功处理
  async handlePaymentSuccess() {
    try {
      // 查询订单状态
      const result = await wx.cloud.callFunction({
        name: 'payment',
        data: {
          action: 'queryOrder',
          data: {
            outTradeNo: this.data.outTradeNo
          },
          useRealConfig: true // 使用真实配置
        }
      })

      if (result.result.success && result.result.data.trade_state === 'SUCCESS') {
        this.setData({
          paymentResult: {
            success: true,
            message: '支付成功'
          }
        })

        wx.showToast({
          title: '支付成功',
          icon: 'success'
        })

        // 延迟跳转到订单详情
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/order-detail/index?id=${this.data.orderInfo._id}`
          })
        }, 1500)
      } else {
        // 支付可能还在处理中，提示用户稍后查看
        wx.showModal({
          title: '支付处理中',
          content: '您的支付正在处理中，请稍后查看订单状态',
          showCancel: false,
          success: () => {
            wx.redirectTo({
              url: `/pages/order-detail/index?id=${this.data.orderInfo._id}`
            })
          }
        })
      }
    } catch (error) {
      console.error('查询支付状态失败:', error)
      wx.showToast({
        title: '支付状态查询失败',
        icon: 'error'
      })
    }
  },

  // 支付失败处理
  handlePaymentFail(err) {
    console.error('支付失败:', err)
    
    let message = '支付失败'
    if (err.errMsg) {
      if (err.errMsg.includes('cancel')) {
        message = '支付已取消'
      } else if (err.errMsg.includes('fail')) {
        message = '支付失败，请重试'
      }
    }

    this.setData({
      paymentResult: {
        success: false,
        message: message
      }
    })

    wx.showToast({
      title: message,
      icon: 'error'
    })
  },

  // 取消支付
  handleCancel() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消支付吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack()
        }
      }
    })
  },

  // 重新支付
  handleRetry() {
    this.setData({
      paymentResult: null
    })
    this.handlePayment()
  }
}) 