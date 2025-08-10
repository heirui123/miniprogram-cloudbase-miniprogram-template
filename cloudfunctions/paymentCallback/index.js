// paymentCallback/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('支付回调事件:', event)
    
    const { resultCode, outTradeNo, transactionId, totalFee } = event
    
    if (resultCode === 'SUCCESS') {
      // 支付成功，更新订单状态
      await handlePaymentSuccess(outTradeNo, transactionId, totalFee)
    } else {
      // 支付失败
      await handlePaymentFailure(outTradeNo, event)
    }
    
    return {
      returnCode: 'SUCCESS',
      returnMsg: 'OK'
    }
  } catch (error) {
    console.error('支付回调处理失败:', error)
    return {
      returnCode: 'FAIL',
      returnMsg: '处理失败'
    }
  }
}

// 处理支付成功
async function handlePaymentSuccess(outTradeNo, transactionId, totalFee) {
  try {
    // 从订单号中提取订单ID
    const orderId = outTradeNo.split('_')[1]
    
    // 更新订单状态
    await db.collection('orders').doc(orderId).update({
      data: {
        paymentStatus: '已支付',
        paymentTime: new Date(),
        transactionId: transactionId,
        totalFee: totalFee,
        updateTime: new Date()
      }
    })
    
    // 获取订单信息
    const orderResult = await db.collection('orders').doc(orderId).get()
    if (orderResult.data) {
      const order = orderResult.data
      
      // 发送通知给发布者
      await sendNotification(order.publisherId, {
        type: 'payment_received',
        title: '收到支付',
        content: `订单"${order.service.title}"已收到支付 ¥${(totalFee / 100).toFixed(2)}`,
        orderId: orderId,
        serviceId: order.serviceId
      })
      
      // 发送通知给接单者
      await sendNotification(order.receiverId, {
        type: 'payment_success',
        title: '支付成功',
        content: `订单"${order.service.title}"支付成功`,
        orderId: orderId,
        serviceId: order.serviceId
      })
    }
    
    console.log('支付成功处理完成:', orderId)
  } catch (error) {
    console.error('处理支付成功失败:', error)
    throw error
  }
}

// 处理支付失败
async function handlePaymentFailure(outTradeNo, paymentData) {
  try {
    const orderId = outTradeNo.split('_')[1]
    
    // 更新订单支付状态
    await db.collection('orders').doc(orderId).update({
      data: {
        paymentStatus: '支付失败',
        paymentTime: new Date(),
        paymentError: paymentData,
        updateTime: new Date()
      }
    })
    
    // 获取订单信息
    const orderResult = await db.collection('orders').doc(orderId).get()
    if (orderResult.data) {
      const order = orderResult.data
      
      // 发送通知给接单者
      await sendNotification(order.receiverId, {
        type: 'payment_failed',
        title: '支付失败',
        content: `订单"${order.service.title}"支付失败，请重试`,
        orderId: orderId,
        serviceId: order.serviceId
      })
    }
    
    console.log('支付失败处理完成:', orderId)
  } catch (error) {
    console.error('处理支付失败失败:', error)
    throw error
  }
}

// 发送通知
async function sendNotification(userId, notificationData) {
  try {
    await db.collection('notifications').add({
      data: {
        userId: userId,
        type: notificationData.type,
        title: notificationData.title,
        content: notificationData.content,
        orderId: notificationData.orderId,
        serviceId: notificationData.serviceId,
        status: 'unread',
        createTime: new Date()
      }
    })
  } catch (error) {
    console.error('发送通知失败:', error)
  }
} 