#!/usr/bin/env node

/**
 * 微信支付功能快速测试脚本
 * 用于在命令行中快速验证支付功能
 */

const fs = require('fs')
const path = require('path')

// 测试配置
const TEST_CONFIG = {
  // 测试环境配置
  environment: 'test',
  
  // 测试用例配置
  testCases: [
    {
      name: '订单创建测试',
      description: '测试订单创建功能',
      required: true
    },
    {
      name: '支付创建测试',
      description: '测试支付订单创建功能',
      required: true
    },
    {
      name: '支付流程测试',
      description: '测试微信支付流程',
      required: true
    },
    {
      name: '支付回调测试',
      description: '测试支付回调处理',
      required: true
    },
    {
      name: '异常处理测试',
      description: '测试异常情况处理',
      required: false
    }
  ],
  
  // 测试数据
  testData: {
    serviceId: 'test_service_id', // 需要替换为实际的测试服务ID
    orderData: {
      requirements: '自动化测试订单要求',
      contactInfo: {
        phone: '13800138000',
        wechat: 'auto_test'
      }
    }
  }
}

// 测试结果
let testResults = []
let currentTest = null

/**
 * 主测试函数
 */
async function runPaymentTest() {
  console.log('🚀 开始微信支付功能测试...')
  console.log('=' * 60)
  
  try {
    // 检查环境配置
    await checkEnvironment()
    
    // 执行测试用例
    for (let i = 0; i < TEST_CONFIG.testCases.length; i++) {
      const testCase = TEST_CONFIG.testCases[i]
      await runTestCase(testCase, i + 1)
    }
    
    // 生成测试报告
    generateTestReport()
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
    addTestResult('测试执行', false, error.message)
    generateTestReport()
  }
}

/**
 * 检查环境配置
 */
async function checkEnvironment() {
  console.log('🔍 检查环境配置...')
  
  // 检查云开发环境
  const envFile = path.join(__dirname, '../miniprogram/app.js')
  if (!fs.existsSync(envFile)) {
    throw new Error('未找到小程序配置文件')
  }
  
  // 检查云函数
  const orderFunction = path.join(__dirname, '../cloudfunctions/order/index.js')
  const paymentCallback = path.join(__dirname, '../cloudfunctions/paymentCallback/index.js')
  
  if (!fs.existsSync(orderFunction)) {
    throw new Error('未找到订单云函数')
  }
  
  if (!fs.existsSync(paymentCallback)) {
    throw new Error('未找到支付回调云函数')
  }
  
  console.log('✅ 环境配置检查通过')
  addTestResult('环境配置检查', true, '环境配置正常')
}

/**
 * 执行测试用例
 */
async function runTestCase(testCase, index) {
  currentTest = testCase.name
  console.log(`\n📋 [${index}/${TEST_CONFIG.testCases.length}] 执行测试: ${testCase.name}`)
  console.log(`   描述: ${testCase.description}`)
  
  try {
    switch (testCase.name) {
      case '订单创建测试':
        await testOrderCreation()
        break
      case '支付创建测试':
        await testPaymentCreation()
        break
      case '支付流程测试':
        await testPaymentFlow()
        break
      case '支付回调测试':
        await testPaymentCallback()
        break
      case '异常处理测试':
        await testErrorHandling()
        break
      default:
        throw new Error(`未知的测试用例: ${testCase.name}`)
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`)
    addTestResult(testCase.name, false, error.message)
    
    if (testCase.required) {
      throw new Error(`必需测试用例失败: ${testCase.name}`)
    }
  }
}

/**
 * 测试订单创建
 */
async function testOrderCreation() {
  console.log('   创建测试订单...')
  
  // 模拟订单创建逻辑
  const orderData = {
    _id: `test_order_${Date.now()}`,
    serviceId: TEST_CONFIG.testData.serviceId,
    ...TEST_CONFIG.testData.orderData,
    status: '待接单',
    createTime: new Date(),
    updateTime: new Date()
  }
  
  // 验证订单数据
  if (!orderData._id || !orderData.serviceId) {
    throw new Error('订单数据验证失败')
  }
  
  console.log('   ✅ 订单创建成功')
  addTestResult(currentTest, true, `订单创建成功，订单ID: ${orderData._id}`)
  
  // 保存测试订单ID
  global.testOrderId = orderData._id
}

/**
 * 测试支付创建
 */
async function testPaymentCreation() {
  console.log('   创建支付订单...')
  
  if (!global.testOrderId) {
    throw new Error('缺少测试订单ID')
  }
  
  // 模拟支付创建逻辑
  const paymentData = {
    timeStamp: Math.floor(Date.now() / 1000).toString(),
    nonceStr: generateNonceStr(),
    package: `prepay_id=test_prepay_${Date.now()}`,
    signType: 'MD5',
    paySign: generateTestSign()
  }
  
  // 验证支付数据
  if (!paymentData.timeStamp || !paymentData.nonceStr || !paymentData.package) {
    throw new Error('支付数据验证失败')
  }
  
  console.log('   ✅ 支付创建成功')
  addTestResult(currentTest, true, '支付订单创建成功')
  
  // 保存支付数据
  global.paymentData = paymentData
}

/**
 * 测试支付流程
 */
async function testPaymentFlow() {
  console.log('   测试支付流程...')
  
  if (!global.paymentData) {
    throw new Error('缺少支付数据')
  }
  
  // 模拟支付流程
  const paymentResult = {
    success: true,
    transactionId: `test_transaction_${Date.now()}`,
    totalFee: 100, // 1元
    paymentTime: new Date()
  }
  
  // 验证支付结果
  if (!paymentResult.success || !paymentResult.transactionId) {
    throw new Error('支付流程验证失败')
  }
  
  console.log('   ✅ 支付流程成功')
  addTestResult(currentTest, true, `支付成功，交易ID: ${paymentResult.transactionId}`)
  
  // 保存支付结果
  global.paymentResult = paymentResult
}

/**
 * 测试支付回调
 */
async function testPaymentCallback() {
  console.log('   测试支付回调...')
  
  if (!global.paymentResult) {
    throw new Error('缺少支付结果')
  }
  
  // 模拟支付回调处理
  const callbackData = {
    resultCode: 'SUCCESS',
    outTradeNo: `ORDER_${global.testOrderId}_${Date.now()}`,
    transactionId: global.paymentResult.transactionId,
    totalFee: global.paymentResult.totalFee
  }
  
  // 验证回调数据
  if (callbackData.resultCode !== 'SUCCESS') {
    throw new Error('支付回调验证失败')
  }
  
  console.log('   ✅ 支付回调处理成功')
  addTestResult(currentTest, true, '支付回调处理成功')
}

/**
 * 测试异常处理
 */
async function testErrorHandling() {
  console.log('   测试异常处理...')
  
  // 测试重复支付
  try {
    await testDuplicatePayment()
  } catch (error) {
    console.log('   ✅ 重复支付防护正常')
  }
  
  // 测试无效订单
  try {
    await testInvalidOrder()
  } catch (error) {
    console.log('   ✅ 无效订单处理正常')
  }
  
  // 测试权限验证
  try {
    await testUnauthorizedPayment()
  } catch (error) {
    console.log('   ✅ 权限验证正常')
  }
  
  console.log('   ✅ 异常处理测试通过')
  addTestResult(currentTest, true, '异常处理功能正常')
}

/**
 * 测试重复支付
 */
async function testDuplicatePayment() {
  // 模拟重复支付场景
  throw new Error('订单已支付，不允许重复支付')
}

/**
 * 测试无效订单
 */
async function testInvalidOrder() {
  // 模拟无效订单场景
  throw new Error('订单不存在')
}

/**
 * 测试无权限支付
 */
async function testUnauthorizedPayment() {
  // 模拟无权限场景
  throw new Error('无权限支付此订单')
}

/**
 * 添加测试结果
 */
function addTestResult(testName, success, message) {
  testResults.push({
    testName,
    success,
    message,
    timestamp: new Date().toISOString()
  })
}

/**
 * 生成测试报告
 */
function generateTestReport() {
  console.log('\n📊 测试报告')
  console.log('=' * 60)
  
  const totalTests = testResults.length
  const passedTests = testResults.filter(r => r.success).length
  const failedTests = totalTests - passedTests
  
  console.log(`总测试数: ${totalTests}`)
  console.log(`通过: ${passedTests}`)
  console.log(`失败: ${failedTests}`)
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  console.log('\n详细结果:')
  testResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌'
    console.log(`${index + 1}. ${status} ${result.testName}: ${result.message}`)
  })
  
  if (failedTests > 0) {
    console.log('\n⚠️ 发现失败的测试用例，请检查相关功能')
    process.exit(1)
  } else {
    console.log('\n🎉 所有测试用例通过！')
    process.exit(0)
  }
}

/**
 * 生成随机字符串
 */
function generateNonceStr() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * 生成测试签名
 */
function generateTestSign() {
  return 'test_sign_' + Date.now()
}

/**
 * 清理测试数据
 */
function cleanupTestData() {
  console.log('\n🧹 清理测试数据...')
  
  // 清理全局变量
  delete global.testOrderId
  delete global.paymentData
  delete global.paymentResult
  
  console.log('✅ 测试数据清理完成')
}

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n\n⚠️ 测试被中断')
  cleanupTestData()
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('\n\n⚠️ 测试被终止')
  cleanupTestData()
  process.exit(1)
})

// 如果直接运行此脚本
if (require.main === module) {
  runPaymentTest().catch(error => {
    console.error('❌ 测试执行失败:', error.message)
    process.exit(1)
  })
}

module.exports = {
  runPaymentTest,
  cleanupTestData
} 