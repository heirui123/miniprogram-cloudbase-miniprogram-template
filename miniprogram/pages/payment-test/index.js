const app = getApp()

Page({
  data: {
    testAmount: 0.01, // 测试金额，1分钱
    loading: false,
    paymentResult: null,
    orderHistory: []
  },

  onLoad() {
    this.loadOrderHistory()
  },

  // 加载订单历史
  async loadOrderHistory() {
    try {
      const db = wx.cloud.database()
      const result = await db.collection('orders')
        .where({
          _openid: app.globalData.openid
        })
        .orderBy('createTime', 'desc')
        .limit(10)
        .get()
      
      this.setData({
        orderHistory: result.data
      })
    } catch (error) {
      console.error('加载订单历史失败:', error)
    }
  },

  // 输入金额变化
  onAmountInput(e) {
    const amount = parseFloat(e.detail.value) || 0
    this.setData({
      testAmount: amount
    })
  },

  // 发起测试支付
  async handleTestPayment() {
    if (this.data.testAmount <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'error'
      })
      return
    }

    try {
      this.setData({ 
        loading: true,
        paymentResult: null
      })
      
      // 获取用户openid
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenId'
      })
      
      if (!result.openid) {
        throw new Error('获取用户信息失败')
      }

      // 生成测试订单号
      const orderNo = 'TEST_' + Date.now()
      
      // 创建测试订单
      const db = wx.cloud.database()
      const orderData = {
        orderNo: orderNo,
        serviceTitle: '支付功能测试',
        serviceTime: new Date().toLocaleString(),
        serviceAddress: '测试地址',
        totalFee: this.data.testAmount,
        status: 'pending',
        createTime: new Date(),
        _openid: app.globalData.openid
      }
      
      await db.collection('orders').add({
        data: orderData
      })

      // 调用统一下单
      const paymentResult = await wx.cloud.callFunction({
        name: 'payment',
        data: {
          action: 'unifiedOrder',
          data: {
            outTradeNo: orderNo,
            totalFee: Math.round(this.data.testAmount * 100), // 转换为分
            body: '支付功能测试',
            openid: result.openid
          },
          useRealConfig: true // 使用真实配置
        }
      })

      console.log('统一下单结果:', paymentResult)

      if (!paymentResult.result.success) {
        throw new Error(paymentResult.result.error || '统一下单失败')
      }

      // 调用微信支付
      await wx.requestPayment({
        ...paymentResult.result.data,
        success: (res) => {
          console.log('支付成功:', res)
          this.handlePaymentSuccess(orderNo)
        },
        fail: (err) => {
          console.error('支付失败:', err)
          this.handlePaymentFail(err, orderNo)
        }
      })

    } catch (error) {
      console.error('支付错误:', error)
      this.setData({
        paymentResult: {
          success: false,
          message: error.message || '支付失败'
        }
      })
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 支付成功处理
  async handlePaymentSuccess(orderNo) {
    try {
      // 更新订单状态
      const db = wx.cloud.database()
      await db.collection('orders').where({
        orderNo: orderNo
      }).update({
        data: {
          status: 'paid',
          payTime: new Date()
        }
      })

      this.setData({
        paymentResult: {
          success: true,
          message: '支付成功！'
        }
      })

      wx.showToast({
        title: '支付成功',
        icon: 'success'
      })

      // 刷新订单历史
      this.loadOrderHistory()

    } catch (error) {
      console.error('更新订单状态失败:', error)
    }
  },

  // 支付失败处理
  async handlePaymentFail(err, orderNo) {
    console.error('支付失败:', err)
    
    let message = '支付失败'
    if (err.errMsg) {
      if (err.errMsg.includes('cancel')) {
        message = '支付已取消'
      } else if (err.errMsg.includes('fail')) {
        message = '支付失败，请重试'
      }
    }

    // 更新订单状态
    try {
      const db = wx.cloud.database()
      await db.collection('orders').where({
        orderNo: orderNo
      }).update({
        data: {
          status: 'failed',
          failReason: message
        }
      })
    } catch (error) {
      console.error('更新订单状态失败:', error)
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

  // 查询订单状态
  async queryOrderStatus(orderNo) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'payment',
        data: {
          action: 'queryOrder',
          data: {
            outTradeNo: orderNo
          },
          useRealConfig: true
        }
      })

      console.log('订单查询结果:', result)
      
      if (result.result.success) {
        const orderData = result.result.data
        wx.showModal({
          title: '订单状态',
          content: `订单号: ${orderNo}\n状态: ${orderData.trade_state || '未知'}\n金额: ${orderData.total_fee ? orderData.total_fee / 100 + '元' : '未知'}`,
          showCancel: false
        })
      } else {
        wx.showToast({
          title: '查询失败',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('查询订单状态失败:', error)
      wx.showToast({
        title: '查询失败',
        icon: 'error'
      })
    }
  },

  // 重新测试
  handleRetry() {
    this.setData({
      paymentResult: null
    })
  }
}) 