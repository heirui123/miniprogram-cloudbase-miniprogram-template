// payment-integration-demo/index.js
const PaymentUtil = require('../../utils/payment.js')

Page({
  data: {
    demoServices: [
      {
        id: 1,
        title: '家政保洁服务',
        price: 88,
        description: '专业家政保洁，2小时服务',
        image: '/images/demo-service1.jpg'
      },
      {
        id: 2,
        title: '宠物寄养服务',
        price: 120,
        description: '专业宠物寄养，24小时照顾',
        image: '/images/demo-service2.jpg'
      },
      {
        id: 3,
        title: '跑腿代办服务',
        price: 30,
        description: '快速跑腿代办，1小时内完成',
        image: '/images/demo-service3.jpg'
      }
    ],
    selectedService: null,
    customAmount: '',
    paymentHistory: []
  },

  onLoad: function() {
    this.loadPaymentHistory()
  },

  // 选择服务
  selectService: function(e) {
    const serviceId = e.currentTarget.dataset.id
    const service = this.data.demoServices.find(s => s.id === serviceId)
    this.setData({
      selectedService: service
    })
  },

  // 输入自定义金额
  onAmountInput: function(e) {
    this.setData({
      customAmount: e.detail.value
    })
  },

  // 支付选中的服务
  paySelectedService: function() {
    if (!this.data.selectedService) {
      wx.showToast({
        title: '请先选择服务',
        icon: 'none'
      })
      return
    }

    const service = this.data.selectedService
    PaymentUtil.showPaymentConfirm({
      amount: service.price,
      title: service.title,
      onConfirm: () => {
        this.payService(service)
      }
    })
  },

  // 支付自定义金额
  payCustomAmount: function() {
    const amount = parseFloat(this.data.customAmount)
    if (!amount || amount <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      })
      return
    }

    PaymentUtil.showPaymentConfirm({
      amount: amount,
      title: '自定义支付',
      onConfirm: () => {
        this.payCustom(amount)
      }
    })
  },

  // 支付服务
  payService: function(service) {
    PaymentUtil.payService(service,
      // 支付成功回调
      (res) => {
        console.log('服务支付成功:', res)
        this.addPaymentRecord({
          type: 'service',
          title: service.title,
          amount: service.price,
          time: new Date().toLocaleString()
        })
      },
      // 支付失败回调
      (err) => {
        console.error('服务支付失败:', err)
      }
    )
  },

  // 支付自定义金额
  payCustom: function(amount) {
    PaymentUtil.pay({
      orderId: `CUSTOM_${Date.now()}`,
      amount: amount,
      title: '自定义支付',
      description: '自定义金额支付',
      onSuccess: (res) => {
        console.log('自定义支付成功:', res)
        this.addPaymentRecord({
          type: 'custom',
          title: '自定义支付',
          amount: amount,
          time: new Date().toLocaleString()
        })
      },
      onFail: (err) => {
        console.error('自定义支付失败:', err)
      }
    })
  },

  // 添加支付记录
  addPaymentRecord: function(record) {
    const history = [record, ...this.data.paymentHistory]
    this.setData({
      paymentHistory: history.slice(0, 10) // 只保留最近10条记录
    })
    
    // 保存到本地存储
    wx.setStorageSync('payment_history', history)
  },

  // 加载支付历史
  loadPaymentHistory: function() {
    const history = wx.getStorageSync('payment_history') || []
    this.setData({
      paymentHistory: history
    })
  },

  // 清空支付历史
  clearPaymentHistory: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空支付历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            paymentHistory: []
          })
          wx.removeStorageSync('payment_history')
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  // 复制支付代码示例
  copyCodeExample: function() {
    const codeExample = `// 支付工具类使用示例
const PaymentUtil = require('../../utils/payment.js')

// 1. 支付订单
PaymentUtil.payOrder(order, 
  (res) => {
    // 支付成功回调
    console.log('支付成功:', res)
  },
  (err) => {
    // 支付失败回调
    console.error('支付失败:', err)
  }
)

// 2. 支付服务
PaymentUtil.payService(service,
  (res) => {
    // 支付成功回调
    console.log('支付成功:', res)
  },
  (err) => {
    // 支付失败回调
    console.error('支付失败:', err)
  }
)

// 3. 自定义支付
PaymentUtil.pay({
  orderId: 'ORDER_123',
  amount: 100,
  title: '商品标题',
  description: '商品描述',
  onSuccess: (res) => {
    // 支付成功回调
  },
  onFail: (err) => {
    // 支付失败回调
  }
})`

    wx.setClipboardData({
      data: codeExample,
      success: () => {
        wx.showToast({
          title: '代码已复制',
          icon: 'success'
        })
      }
    })
  }
}) 