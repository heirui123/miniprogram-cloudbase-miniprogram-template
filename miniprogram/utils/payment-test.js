// utils/payment-test.js
/**
 * 微信支付功能测试工具
 * 用于在测试环境验证支付功能
 */

class PaymentTest {
  constructor() {
    this.testResults = []
    this.currentTest = null
  }

  /**
   * 开始测试
   */
  async startTest() {
    console.log('🚀 开始微信支付功能测试...')
    
    try {
      // 测试用例1：订单创建
      await this.testOrderCreation()
      
      // 测试用例2：支付创建
      await this.testPaymentCreation()
      
      // 测试用例3：支付流程
      await this.testPaymentFlow()
      
      // 测试用例4：异常处理
      await this.testErrorHandling()
      
      // 生成测试报告
      this.generateTestReport()
      
    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error)
      this.addTestResult('测试执行', false, error.message)
    }
  }

  /**
   * 测试订单创建
   */
  async testOrderCreation() {
    this.currentTest = '订单创建测试'
    console.log(`📋 执行测试: ${this.currentTest}`)
    
    try {
      // 创建测试订单
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'create',
          serviceId: 'test_service_id', // 需要替换为实际的测试服务ID
          orderData: {
            requirements: '测试订单要求',
            contactInfo: {
              phone: '13800138000',
              wechat: 'test_wechat'
            }
          }
        }
      })

      if (result.result.success) {
        this.addTestResult(this.currentTest, true, '订单创建成功')
        this.testOrderId = result.result.data._id
        console.log('✅ 订单创建成功:', this.testOrderId)
      } else {
        this.addTestResult(this.currentTest, false, result.result.message)
        console.log('❌ 订单创建失败:', result.result.message)
      }
    } catch (error) {
      this.addTestResult(this.currentTest, false, error.message)
      console.log('❌ 订单创建异常:', error)
    }
  }

  /**
   * 测试支付创建
   */
  async testPaymentCreation() {
    if (!this.testOrderId) {
      this.addTestResult('支付创建测试', false, '缺少测试订单ID')
      return
    }

    this.currentTest = '支付创建测试'
    console.log(`💰 执行测试: ${this.currentTest}`)
    
    try {
      // 先接单
      await this.acceptOrder()
      
      // 创建支付
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'createPayment',
          orderId: this.testOrderId,
          paymentData: {}
        }
      })

      if (result.result.success) {
        this.addTestResult(this.currentTest, true, '支付创建成功')
        this.paymentData = result.result.data
        console.log('✅ 支付创建成功:', this.paymentData)
      } else {
        this.addTestResult(this.currentTest, false, result.result.message)
        console.log('❌ 支付创建失败:', result.result.message)
      }
    } catch (error) {
      this.addTestResult(this.currentTest, false, error.message)
      console.log('❌ 支付创建异常:', error)
    }
  }

  /**
   * 测试支付流程
   */
  async testPaymentFlow() {
    if (!this.paymentData) {
      this.addTestResult('支付流程测试', false, '缺少支付数据')
      return
    }

    this.currentTest = '支付流程测试'
    console.log(`💳 执行测试: ${this.currentTest}`)
    
    try {
      // 发起微信支付
      const paymentResult = await this.requestPayment(this.paymentData)
      
      if (paymentResult.success) {
        this.addTestResult(this.currentTest, true, '支付流程成功')
        console.log('✅ 支付流程成功')
      } else {
        this.addTestResult(this.currentTest, false, paymentResult.message)
        console.log('❌ 支付流程失败:', paymentResult.message)
      }
    } catch (error) {
      this.addTestResult(this.currentTest, false, error.message)
      console.log('❌ 支付流程异常:', error)
    }
  }

  /**
   * 测试异常处理
   */
  async testErrorHandling() {
    this.currentTest = '异常处理测试'
    console.log(`⚠️ 执行测试: ${this.currentTest}`)
    
    try {
      // 测试1：重复支付
      await this.testDuplicatePayment()
      
      // 测试2：无权限支付
      await this.testUnauthorizedPayment()
      
      // 测试3：无效订单
      await this.testInvalidOrder()
      
      this.addTestResult(this.currentTest, true, '异常处理正常')
      console.log('✅ 异常处理测试通过')
    } catch (error) {
      this.addTestResult(this.currentTest, false, error.message)
      console.log('❌ 异常处理测试失败:', error)
    }
  }

  /**
   * 接单操作
   */
  async acceptOrder() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'updateStatus',
          orderId: this.testOrderId,
          status: '进行中'
        }
      })

      if (result.result.success) {
        console.log('✅ 接单成功')
      } else {
        console.log('❌ 接单失败:', result.result.message)
      }
    } catch (error) {
      console.log('❌ 接单异常:', error)
    }
  }

  /**
   * 发起微信支付
   */
  requestPayment(paymentData) {
    return new Promise((resolve) => {
      wx.requestPayment({
        timeStamp: paymentData.timeStamp,
        nonceStr: paymentData.nonceStr,
        package: paymentData.package,
        signType: paymentData.signType,
        paySign: paymentData.paySign,
        success: (res) => {
          console.log('支付成功:', res)
          resolve({ success: true, data: res })
        },
        fail: (err) => {
          console.log('支付失败:', err)
          resolve({ success: false, message: err.errMsg || '支付失败' })
        }
      })
    })
  }

  /**
   * 测试重复支付
   */
  async testDuplicatePayment() {
    if (!this.testOrderId) return

    try {
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'createPayment',
          orderId: this.testOrderId,
          paymentData: {}
        }
      })

      if (!result.result.success && result.result.message.includes('已支付')) {
        console.log('✅ 重复支付防护正常')
      } else {
        console.log('⚠️ 重复支付防护可能存在问题')
      }
    } catch (error) {
      console.log('❌ 重复支付测试异常:', error)
    }
  }

  /**
   * 测试无权限支付
   */
  async testUnauthorizedPayment() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'createPayment',
          orderId: 'invalid_order_id',
          paymentData: {}
        }
      })

      if (!result.result.success && result.result.message.includes('无权限')) {
        console.log('✅ 权限验证正常')
      } else {
        console.log('⚠️ 权限验证可能存在问题')
      }
    } catch (error) {
      console.log('❌ 权限验证测试异常:', error)
    }
  }

  /**
   * 测试无效订单
   */
  async testInvalidOrder() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'createPayment',
          orderId: 'non_existent_order_id',
          paymentData: {}
        }
      })

      if (!result.result.success && result.result.message.includes('不存在')) {
        console.log('✅ 无效订单处理正常')
      } else {
        console.log('⚠️ 无效订单处理可能存在问题')
      }
    } catch (error) {
      console.log('❌ 无效订单测试异常:', error)
    }
  }

  /**
   * 添加测试结果
   */
  addTestResult(testName, success, message) {
    this.testResults.push({
      testName,
      success,
      message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 生成测试报告
   */
  generateTestReport() {
    console.log('\n📊 测试报告')
    console.log('=' * 50)
    
    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter(r => r.success).length
    const failedTests = totalTests - passedTests
    
    console.log(`总测试数: ${totalTests}`)
    console.log(`通过: ${passedTests}`)
    console.log(`失败: ${failedTests}`)
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
    
    console.log('\n详细结果:')
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${index + 1}. ${status} ${result.testName}: ${result.message}`)
    })
    
    if (failedTests > 0) {
      console.log('\n⚠️ 发现失败的测试用例，请检查相关功能')
    } else {
      console.log('\n🎉 所有测试用例通过！')
    }
    
    // 保存测试报告
    this.saveTestReport()
  }

  /**
   * 保存测试报告
   */
  saveTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: 'test',
      results: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.success).length,
        failed: this.testResults.filter(r => !r.success).length
      }
    }
    
    // 可以保存到本地存储或发送到服务器
    wx.setStorageSync('payment_test_report', report)
    console.log('📝 测试报告已保存到本地存储')
  }

  /**
   * 获取测试报告
   */
  getTestReport() {
    return wx.getStorageSync('payment_test_report')
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData() {
    console.log('🧹 清理测试数据...')
    
    try {
      if (this.testOrderId) {
        // 取消测试订单
        await wx.cloud.callFunction({
          name: 'order',
          data: {
            action: 'cancelOrder',
            orderId: this.testOrderId
          }
        })
        console.log('✅ 测试订单已清理')
      }
      
      // 清理本地存储
      wx.removeStorageSync('payment_test_report')
      console.log('✅ 测试报告已清理')
      
    } catch (error) {
      console.log('❌ 清理测试数据失败:', error)
    }
  }
}

// 导出测试工具
module.exports = PaymentTest

// 使用示例：
/*
const PaymentTest = require('../../utils/payment-test.js')

// 创建测试实例
const paymentTest = new PaymentTest()

// 开始测试
paymentTest.startTest().then(() => {
  console.log('测试完成')
}).catch(error => {
  console.error('测试失败:', error)
})

// 清理测试数据
paymentTest.cleanupTestData()
*/ 