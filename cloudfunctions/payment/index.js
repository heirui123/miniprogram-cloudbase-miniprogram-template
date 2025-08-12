const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const xml2js = require('xml2js')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 根据环境选择配置
function loadConfig(envType = 'test') {
  let config
  switch (envType) {
    case 'sandbox':
      config = require('./sandbox-config.js')
      break
    case 'production':
      config = require('./production-config.js')
      break
    default:
      config = require('./test-config.js')
      break
  }
  console.log(`加载${envType}环境配置:`, JSON.stringify(config, null, 2))
  return config
}

let WECHAT_PAY_CONFIG

// 生成随机字符串
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 生成签名
function generateSign(params, key) {
  // 1. 参数排序
  const sortedKeys = Object.keys(params).sort()
  
  // 2. 拼接字符串
  let signStr = ''
  sortedKeys.forEach(key => {
    if (params[key] !== '' && params[key] != null && key !== 'sign') {
      signStr += key + '=' + params[key] + '&'
    }
  })
  signStr += 'key=' + key
  
  // 3. MD5加密并转大写
  return crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase()
}

// 生成XML
function generateXML(params) {
  let xml = '<xml>'
  Object.keys(params).forEach(key => {
    xml += `<${key}>${params[key]}</${key}>`
  })
  xml += '</xml>'
  return xml
}

// 解析XML
function parseXML(xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result.xml)
      }
    })
  })
}

// 获取沙箱密钥
async function getSandboxKey() {
  const params = {
    mch_id: WECHAT_PAY_CONFIG.mchId,
    nonce_str: generateNonceStr()
  }
  
  params.sign = generateSign(params, WECHAT_PAY_CONFIG.apiKey)
  const xml = generateXML(params)
  
  try {
    const response = await axios.post(WECHAT_PAY_CONFIG.apiUrl + WECHAT_PAY_CONFIG.sandboxKeyPath, xml, {
      headers: {
        'Content-Type': 'application/xml'
      }
    })
    
    const result = await parseXML(response.data)
    if (result.return_code === 'SUCCESS') {
      return result.sandbox_signkey
    } else {
      throw new Error(result.return_msg || '获取沙箱密钥失败')
    }
  } catch (error) {
    console.error('获取沙箱密钥错误:', error)
    throw error
  }
}

// 统一下单
async function unifiedOrder(orderData) {
  // 如果是沙箱环境，先获取沙箱密钥
  let apiKey = WECHAT_PAY_CONFIG.apiKey
  if (WECHAT_PAY_CONFIG.isSandbox) {
    try {
      apiKey = await getSandboxKey()
      console.log('获取到沙箱密钥:', apiKey)
    } catch (error) {
      console.error('获取沙箱密钥失败，使用默认密钥:', error)
    }
  }
  
  const params = {
    appid: WECHAT_PAY_CONFIG.appId,
    mch_id: WECHAT_PAY_CONFIG.mchId,
    nonce_str: generateNonceStr(),
    body: orderData.body || '社区服务',
    out_trade_no: orderData.outTradeNo,
    total_fee: orderData.totalFee, // 前端已经转换为分
    spbill_create_ip: '127.0.0.1',
    notify_url: WECHAT_PAY_CONFIG.notifyUrl,
    trade_type: 'JSAPI',
    openid: orderData.openid
  }
  
  // 生成签名
  params.sign = generateSign(params, apiKey)
  
  // 生成XML
  const xml = generateXML(params)
  
  try {
    // 调用微信支付统一下单接口（根据环境选择路径）
    const apiPath = WECHAT_PAY_CONFIG.isSandbox ? WECHAT_PAY_CONFIG.sandboxPath : WECHAT_PAY_CONFIG.normalPath
    console.log('调用API:', WECHAT_PAY_CONFIG.apiUrl + apiPath)
    
    const response = await axios.post(WECHAT_PAY_CONFIG.apiUrl + apiPath, xml, {
      headers: {
        'Content-Type': 'application/xml'
      }
    })
    
    // 解析响应
    console.log('微信支付API响应:', response.data)
    const result = await parseXML(response.data)
    console.log('解析后的结果:', JSON.stringify(result))
    
    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      // 生成小程序支付参数
      const payParams = {
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: generateNonceStr(),
        package: 'prepay_id=' + result.prepay_id,
        signType: 'MD5'
      }
      
      // 生成支付签名
      payParams.paySign = generateSign(payParams, apiKey)
      
      return {
        success: true,
        data: payParams,
        prepayId: result.prepay_id
      }
    } else {
      return {
        success: false,
        error: result.return_msg || result.err_code_des || '统一下单失败'
      }
    }
  } catch (error) {
    console.error('统一下单错误:', error)
    return {
      success: false,
      error: '网络请求失败'
    }
  }
}

// 查询订单
async function queryOrder(outTradeNo) {
  const params = {
    appid: WECHAT_PAY_CONFIG.appId,
    mch_id: WECHAT_PAY_CONFIG.mchId,
    out_trade_no: outTradeNo,
    nonce_str: generateNonceStr()
  }
  
  params.sign = generateSign(params, WECHAT_PAY_CONFIG.apiKey)
  const xml = generateXML(params)
  
  try {
    const response = await axios.post(WECHAT_PAY_CONFIG.apiUrl + '/pay/orderquery', xml, {
      headers: {
        'Content-Type': 'application/xml'
      }
    })
    
    const result = await parseXML(response.data)
    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('查询订单错误:', error)
    return {
      success: false,
      error: '查询订单失败'
    }
  }
}

// 关闭订单
async function closeOrder(outTradeNo) {
  const params = {
    appid: WECHAT_PAY_CONFIG.appId,
    mch_id: WECHAT_PAY_CONFIG.mchId,
    out_trade_no: outTradeNo,
    nonce_str: generateNonceStr()
  }
  
  params.sign = generateSign(params, WECHAT_PAY_CONFIG.apiKey)
  const xml = generateXML(params)
  
  try {
    const response = await axios.post(WECHAT_PAY_CONFIG.apiUrl + '/pay/closeorder', xml, {
      headers: {
        'Content-Type': 'application/xml'
      }
    })
    
    const result = await parseXML(response.data)
    return {
      success: result.return_code === 'SUCCESS',
      data: result
    }
  } catch (error) {
    console.error('关闭订单错误:', error)
    return {
      success: false,
      error: '关闭订单失败'
    }
  }
}

// 云函数入口
exports.main = async (event, context) => {
  console.log('收到事件:', JSON.stringify(event))
  const { action, data, orderData, envType, useRealConfig, outTradeNo } = event
  
  // 根据环境类型加载配置
  let configType = envType
  if (useRealConfig) {
    configType = 'production'
    console.log('使用真实商户配置')
  }
  WECHAT_PAY_CONFIG = loadConfig(configType)
  
  try {
    switch (action) {
      case 'unifiedOrder':
        const orderParams = orderData || data
        console.log('统一下单参数:', JSON.stringify(orderParams))
        return await unifiedOrder(orderParams)
      
      case 'queryOrder':
        const queryParams = orderData || data || { outTradeNo }
        console.log('查询订单参数:', JSON.stringify(queryParams))
        return await queryOrder(queryParams.outTradeNo)
      
      case 'closeOrder':
        const closeParams = orderData || data || { outTradeNo }
        console.log('关闭订单参数:', JSON.stringify(closeParams))
        return await closeOrder(closeParams.outTradeNo)
      
      default:
        return {
          success: false,
          error: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('支付云函数错误:', error)
    return {
      success: false,
      error: '服务器内部错误'
    }
  }
} 