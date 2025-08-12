// utils/payment.js - 支付工具类

/**
 * 支付工具类
 * 提供统一的支付接口，方便在业务页面中集成
 */
class PaymentUtil {
  
  /**
   * 发起支付
   * @param {Object} options 支付参数
   * @param {string} options.orderId 订单ID
   * @param {number} options.amount 支付金额（元）
   * @param {string} options.title 商品标题
   * @param {string} options.description 商品描述
   * @param {Function} options.onSuccess 支付成功回调
   * @param {Function} options.onFail 支付失败回调
   * @param {Function} options.onCancel 支付取消回调
   */
  static async pay(options) {
    const {
      orderId,
      amount,
      title,
      description,
      onSuccess,
      onFail,
      onCancel
    } = options

    try {
      wx.showLoading({
        title: '创建支付...'
      })

      // 1. 获取用户openid
      const openidRes = await wx.cloud.callFunction({
        name: 'getOpenId'
      })
      const openid = openidRes.result.openid

      // 2. 调用统一下单
      // 生成短订单号，确保不超过32字符
      const timestamp = Date.now().toString().slice(-8) // 取后8位
      const orderIdShort = orderId.slice(-8) // 取订单ID后8位
      const outTradeNo = `O${orderIdShort}${timestamp}`
      const paymentRes = await wx.cloud.callFunction({
        name: 'payment',
        data: {
          action: 'unifiedOrder',
          data: {
            outTradeNo: outTradeNo,
            totalFee: Math.round(amount * 100), // 转换为分
            body: description || `支付 - ${title}`,
            openid: openid
          },
          useRealConfig: true
        }
      })

      if (!paymentRes.result.success) {
        throw new Error(paymentRes.result.message || '创建支付失败')
      }

      // 3. 调用微信支付
      await wx.requestPayment({
        timeStamp: paymentRes.result.data.timeStamp,
        nonceStr: paymentRes.result.data.nonceStr,
        package: paymentRes.result.data.package,
        signType: paymentRes.result.data.signType,
        paySign: paymentRes.result.data.paySign,
        success: async (res) => {
          console.log('支付成功:', res)
          wx.hideLoading()
          
          // 查询支付状态
          try {
            const queryResult = await wx.cloud.callFunction({
              name: 'payment',
              data: {
                action: 'queryOrder',
                data: {
                  outTradeNo: outTradeNo
                },
                useRealConfig: true
              }
            })
            
            if (queryResult.result.success && queryResult.result.data.trade_state === 'SUCCESS') {
              if (onSuccess) {
                onSuccess(res)
              }
            } else {
              // 支付可能还在处理中，提示用户稍后查看
              wx.showModal({
                title: '支付处理中',
                content: '您的支付正在处理中，请稍后查看订单状态',
                showCancel: false
              })
              if (onSuccess) {
                onSuccess(res)
              }
            }
          } catch (queryError) {
            console.error('查询支付状态失败:', queryError)
            // 即使查询失败，也认为支付成功
            if (onSuccess) {
              onSuccess(res)
            }
          }
        },
        fail: (err) => {
          console.error('支付失败:', err)
          wx.hideLoading()
          
          if (err.errMsg.includes('cancel')) {
            // 用户取消支付
            if (onCancel) {
              onCancel(err)
            }
          } else {
            // 支付失败
            if (onFail) {
              onFail(err)
            }
          }
        }
      })

    } catch (error) {
      console.error('支付异常:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'none'
      })
      if (onFail) {
        onFail(error)
      }
    }
  }

  /**
   * 支付订单
   * @param {Object} order 订单信息
   * @param {Function} onSuccess 支付成功回调
   * @param {Function} onFail 支付失败回调
   */
  static async payOrder(order, onSuccess, onFail) {
    return this.pay({
      orderId: order._id,
      amount: order.price,
      title: order.service.title,
      description: `服务费用 - ${order.service.title}`,
      onSuccess: onSuccess,
      onFail: onFail
    })
  }

  /**
   * 支付服务
   * @param {Object} service 服务信息
   * @param {Function} onSuccess 支付成功回调
   * @param {Function} onFail 支付失败回调
   */
  static async payService(service, onSuccess, onFail) {
    return this.pay({
      orderId: `SERVICE_${service._id}_${Date.now()}`,
      amount: service.price,
      title: service.title,
      description: `服务费用 - ${service.title}`,
      onSuccess: onSuccess,
      onFail: onFail
    })
  }

  /**
   * 显示支付确认弹窗
   * @param {Object} options 支付信息
   * @param {Function} onConfirm 确认支付回调
   */
  static showPaymentConfirm(options) {
    const { amount, title } = options
    
    wx.showModal({
      title: '确认支付',
      content: `确定要支付 ¥${amount} 购买"${title}"吗？`,
      confirmText: '立即支付',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && options.onConfirm) {
          options.onConfirm()
        }
      }
    })
  }

  /**
   * 显示支付成功提示
   * @param {string} message 提示信息
   */
  static showPaymentSuccess(message = '支付成功') {
    wx.showToast({
      title: message,
      icon: 'success'
    })
  }

  /**
   * 显示支付失败提示
   * @param {string} message 提示信息
   */
  static showPaymentFail(message = '支付失败') {
    wx.showToast({
      title: message,
      icon: 'none'
    })
  }

  /**
   * 更新订单支付状态
   * @param {string} orderId 订单ID
   * @param {string} status 订单状态
   * @param {string} paymentStatus 支付状态
   */
  static async updateOrderPaymentStatus(orderId, status = '进行中', paymentStatus = '已支付') {
    try {
      wx.showLoading({
        title: '更新订单状态...'
      })

      const res = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'updateStatus',
          orderId: orderId,
          status: status,
          paymentStatus: paymentStatus
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        this.showPaymentSuccess()
        return true
      } else {
        this.showPaymentFail(res.result.message || '更新订单状态失败')
        return false
      }
    } catch (error) {
      console.error('更新订单状态失败:', error)
      wx.hideLoading()
      this.showPaymentFail('更新订单状态失败')
      return false
    }
  }
}

module.exports = PaymentUtil 