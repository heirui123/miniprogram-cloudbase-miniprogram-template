const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 微信支付配置
const WECHAT_PAY_CONFIG = {
  mchKey: 'n9g9qy5ULSrnDsnLAMxKIzeQPqT92N1l' // 需要替换为实际的API密钥
}

// 验证签名
function verifySign(params, sign) {
  // 1. 参数排序
  const sortedKeys = Object.keys(params).sort()
  
  // 2. 拼接字符串
  let signStr = ''
  sortedKeys.forEach(key => {
    if (params[key] !== '' && params[key] != null && key !== 'sign') {
      signStr += key + '=' + params[key] + '&'
    }
  })
  signStr += 'key=' + WECHAT_PAY_CONFIG.mchKey
  
  // 3. MD5加密并转大写
  const calculatedSign = crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase()
  
  return calculatedSign === sign
}

// 解析XML
function parseXML(xml) {
  const result = {}
  const matches = xml.match(/<(\w+)>(.*?)<\/\1>/g)
  if (matches) {
    matches.forEach(match => {
      const key = match.match(/<(\w+)>/)[1]
      const value = match.replace(/<\/?\w+>/g, '')
      result[key] = value
    })
  }
  return result
}

// 生成XML响应
function generateResponseXML(returnCode, returnMsg) {
  return `<xml><return_code><![CDATA[${returnCode}]]></return_code><return_msg><![CDATA[${returnMsg}]]></return_msg></xml>`
}

// 处理支付成功
async function handlePaymentSuccess(paymentData) {
  try {
    const { out_trade_no, transaction_id, total_fee, openid } = paymentData
    
    // 从订单号中提取订单ID
    const orderId = out_trade_no.split('_')[1]
    
    // 更新订单状态
    const orderResult = await db.collection('orders').doc(orderId).update({
      data: {
        status: '进行中',
        paymentStatus: '已支付',
        paymentTime: new Date(),
        transactionId: transaction_id,
        totalFee: total_fee / 100, // 转换为元
        updateTime: new Date()
      }
    })
    
    // 获取订单信息
    const order = await db.collection('orders').doc(orderId).get()
    
    if (order.data) {
      const serviceId = order.data.serviceId
      
      // 更新服务状态为已接单
      await db.collection('services').doc(serviceId).update({
        data: {
          status: '已接单',
          updateTime: new Date()
        }
      })
    }
    
    // 发送通知给服务提供者
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: openid,
        templateId: '79Wt3CthmitWzp5OPkwtyw47apRlGDWtys7xYquSC-I', // 需要替换为实际的模板ID
        page: `pages/order-detail/index?id=${out_trade_no.split('_')[1]}`,
        data: {
          thing1: { value: '支付成功' },
          amount2: { value: (total_fee / 100).toFixed(2) },
          thing3: { value: out_trade_no },
          time4: { value: new Date().toLocaleString() }
        }
      })
    } catch (notifyError) {
      console.error('发送通知失败:', notifyError)
    }
    
    return true
  } catch (error) {
    console.error('处理支付成功失败:', error)
    return false
  }
}

// 云函数入口
exports.main = async (event, context) => {
  try {
    // 获取回调数据
    const { body } = event
    
    if (!body) {
      return {
        statusCode: 400,
        body: generateResponseXML('FAIL', '缺少回调数据')
      }
    }
    
    // 解析XML
    const paymentData = parseXML(body)
    
    // 验证签名
    if (!verifySign(paymentData, paymentData.sign)) {
      console.error('签名验证失败')
      return {
        statusCode: 400,
        body: generateResponseXML('FAIL', '签名验证失败')
      }
    }
    
    // 检查支付结果
    if (paymentData.return_code === 'SUCCESS' && paymentData.result_code === 'SUCCESS') {
      // 处理支付成功
      const success = await handlePaymentSuccess(paymentData)
      
      if (success) {
        return {
          statusCode: 200,
          body: generateResponseXML('SUCCESS', 'OK')
        }
      } else {
        return {
          statusCode: 500,
          body: generateResponseXML('FAIL', '处理失败')
        }
      }
    } else {
      console.error('支付失败:', paymentData.return_msg || paymentData.err_code_des)
      return {
        statusCode: 200,
        body: generateResponseXML('SUCCESS', 'OK')
      }
    }
  } catch (error) {
    console.error('支付回调处理错误:', error)
    return {
      statusCode: 500,
      body: generateResponseXML('FAIL', '服务器错误')
    }
  }
} 