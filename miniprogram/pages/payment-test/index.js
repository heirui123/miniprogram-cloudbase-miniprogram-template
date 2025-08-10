// payment-test/index.js
const PaymentTest = require('../../utils/payment-test.js')

Page({
  data: {
    testResults: [],
    isTesting: false,
    testProgress: 0,
    currentTest: '',
    showReport: false,
    testReport: null,
    successRate: '0.0'
  },

  onLoad: function(options) {
    // 检查是否有历史测试报告
    const report = wx.getStorageSync('payment_test_report')
    if (report) {
      const successRate = report && report.summary ? 
        ((report.summary.passed / report.summary.total) * 100).toFixed(1) : '0.0'
      
      this.setData({
        testReport: report,
        showReport: true,
        successRate: successRate
      })
    }
  },

  // 开始测试
  startTest: function() {
    this.setData({
      isTesting: true,
      testResults: [],
      testProgress: 0,
      currentTest: '',
      showReport: false
    })

    const paymentTest = new PaymentTest()
    
    // 监听测试进度
    paymentTest.onProgress = (progress, testName) => {
      this.setData({
        testProgress: progress,
        currentTest: testName
      })
    }

    // 监听测试结果
    paymentTest.onResult = (result) => {
      const testResults = [...this.data.testResults, result]
      this.setData({ testResults })
    }

    paymentTest.startTest().then(() => {
      this.setData({
        isTesting: false,
        testProgress: 100,
        currentTest: '测试完成'
      })
      
      // 显示测试报告
      setTimeout(() => {
        const report = paymentTest.getTestReport()
        const successRate = report && report.summary ? 
          ((report.summary.passed / report.summary.total) * 100).toFixed(1) : '0.0'
        
        this.setData({
          testReport: report,
          showReport: true,
          successRate: successRate
        })
      }, 1000)
      
    }).catch(error => {
      console.error('测试失败:', error)
      this.setData({
        isTesting: false,
        currentTest: '测试失败'
      })
      
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      })
    })
  },

  // 清理测试数据
  cleanupTestData: function() {
    wx.showModal({
      title: '确认清理',
      content: '确定要清理测试数据吗？这将删除所有测试订单和报告。',
      success: (res) => {
        if (res.confirm) {
          const paymentTest = new PaymentTest()
          paymentTest.cleanupTestData().then(() => {
            this.setData({
              testResults: [],
              testReport: null,
              showReport: false
            })
            
            wx.showToast({
              title: '清理完成',
              icon: 'success'
            })
          })
        }
      }
    })
  },

  // 查看测试报告
  viewReport: function() {
    const report = wx.getStorageSync('payment_test_report')
    if (report) {
      const successRate = report && report.summary ? 
        ((report.summary.passed / report.summary.total) * 100).toFixed(1) : '0.0'
      
      this.setData({
        testReport: report,
        showReport: true,
        successRate: successRate
      })
    }
  },

  // 隐藏测试报告
  hideReport: function() {
    this.setData({
      showReport: false
    })
  },

  // 导出测试报告
  exportReport: function() {
    const report = this.data.testReport
    if (!report) {
      wx.showToast({
        title: '暂无测试报告',
        icon: 'none'
      })
      return
    }

    // 生成报告文本
    const reportText = this.generateReportText(report)
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: reportText,
      success: () => {
        wx.showToast({
          title: '报告已复制',
          icon: 'success'
        })
      }
    })
  },

  // 生成报告文本
  generateReportText: function(report) {
    const { timestamp, summary, results } = report
    
    let text = `微信支付功能测试报告\n`
    text += `测试时间: ${new Date(timestamp).toLocaleString()}\n`
    text += `环境: ${report.environment}\n`
    text += `总测试数: ${summary.total}\n`
    text += `通过: ${summary.passed}\n`
    text += `失败: ${summary.failed}\n`
    text += `成功率: ${((summary.passed / summary.total) * 100).toFixed(1)}%\n\n`
    
    text += `详细结果:\n`
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      text += `${index + 1}. ${status} ${result.testName}: ${result.message}\n`
    })
    
    return text
  },

  // 手动测试订单创建
  testOrderCreation: function() {
    wx.showModal({
      title: '手动测试',
      content: '确定要测试订单创建功能吗？',
      success: (res) => {
        if (res.confirm) {
          this.manualTestOrderCreation()
        }
      }
    })
  },

  // 手动测试支付创建
  testPaymentCreation: function() {
    wx.showModal({
      title: '手动测试',
      content: '确定要测试支付创建功能吗？需要先有测试订单。',
      success: (res) => {
        if (res.confirm) {
          this.manualTestPaymentCreation()
        }
      }
    })
  },

  // 手动测试订单创建
  async manualTestOrderCreation() {
    wx.showLoading({
      title: '测试中...'
    })

    try {
      // 先获取一个测试服务
      const serviceResult = await wx.cloud.callFunction({
        name: 'service',
        data: {
          action: 'getList',
          query: {
            status: '发布中',
            limit: 1
          }
        }
      })

      if (!serviceResult.result.success || serviceResult.result.data.length === 0) {
        wx.hideLoading()
        wx.showToast({
          title: '没有可用的测试服务',
          icon: 'none'
        })
        return
      }

      const testService = serviceResult.result.data[0]

      // 创建测试订单
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'create',
          serviceId: testService._id,
          orderData: {
            requirements: '手动测试订单要求',
            contactInfo: {
              phone: '13800138000',
              wechat: 'manual_test'
            }
          }
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        wx.showModal({
          title: '测试成功',
          content: `订单创建成功！\n订单ID: ${result.result.data._id}\n服务: ${testService.title}`,
          showCancel: false
        })
        
        // 保存测试订单ID
        wx.setStorageSync('test_order_id', result.result.data._id)
      } else {
        wx.showToast({
          title: result.result.message || '测试失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('手动测试失败:', error)
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      })
    }
  },

  // 手动测试支付创建
  async manualTestPaymentCreation() {
    const testOrderId = wx.getStorageSync('test_order_id')
    
    if (!testOrderId) {
      wx.showToast({
        title: '请先创建测试订单',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '测试中...'
    })

    try {
      // 先接单
      await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'updateStatus',
          orderId: testOrderId,
          status: '进行中'
        }
      })

      // 创建支付
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'createPayment',
          orderId: testOrderId,
          paymentData: {}
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        wx.showModal({
          title: '测试成功',
          content: '支付创建成功！是否要发起实际支付？',
          success: (res) => {
            if (res.confirm) {
              this.requestPayment(result.result.data)
            }
          }
        })
      } else {
        wx.showToast({
          title: result.result.message || '测试失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('手动测试失败:', error)
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      })
    }
  },

  // 发起支付
  requestPayment: function(paymentData) {
    wx.requestPayment({
      timeStamp: paymentData.timeStamp,
      nonceStr: paymentData.nonceStr,
      package: paymentData.package,
      signType: paymentData.signType,
      paySign: paymentData.paySign,
      success: (res) => {
        console.log('支付成功:', res)
        wx.showToast({
          title: '支付成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.log('支付失败:', err)
        wx.showToast({
          title: '支付失败',
          icon: 'none'
        })
      }
    })
  },

  // 查看云函数日志
  viewLogs: function() {
    wx.showModal({
      title: '查看日志',
      content: '请在云开发控制台查看云函数日志，或使用微信开发者工具的调试器查看网络请求。',
      showCancel: false
    })
  },

  // 分享测试报告
  onShareAppMessage: function() {
    const report = this.data.testReport
    if (report) {
      return {
        title: `支付功能测试报告 - 成功率${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`,
        path: '/pages/payment-test/index'
      }
    }
    return {
      title: '微信支付功能测试',
      path: '/pages/payment-test/index'
    }
  }
}) 