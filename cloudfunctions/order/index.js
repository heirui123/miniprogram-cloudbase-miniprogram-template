// order/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, orderId, serviceId, query, status, orderData, paymentData } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    switch (action) {
      case 'create':
        return await createOrder(serviceId, openid, orderData)
      case 'getList':
        return await getOrderList(query, openid)
      case 'getDetail':
        return await getOrderDetail(orderId, openid)
      case 'updateStatus':
        return await updateOrderStatus(orderId, status, openid)
      case 'getMyOrders':
        return await getMyOrders(openid)
      case 'createPayment':
        return await createPayment(orderId, openid, paymentData)
      case 'confirmPayment':
        return await confirmPayment(orderId, openid)
      case 'cancelOrder':
        return await cancelOrder(orderId, openid)
      case 'completeOrder':
        return await completeOrder(orderId, openid)
      case 'getOrderStats':
        return await getOrderStats(openid)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('订单操作失败:', error)
    return {
      success: false,
      message: '操作失败',
      error: error.message
    }
  }
}

// 创建订单
async function createOrder(serviceId, openid, orderData = {}) {
  try {
    // 获取服务信息
    const serviceResult = await db.collection('services').doc(serviceId).get()
    if (!serviceResult.data) {
      return {
        success: false,
        message: '服务不存在'
      }
    }

    const service = serviceResult.data

    // 检查服务状态
    if (service.status !== '发布中') {
      return {
        success: false,
        message: '服务已不可用'
      }
    }

    // 检查是否是自己发布的服务（允许接自己的单，但给出提示）
    const isOwnService = service.openid === openid

    // 获取用户信息
    const userResult = await db.collection('users').where({
      openid: openid
    }).get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '用户信息不存在'
      }
    }

    const user = userResult.data[0]

    // 检查是否已有进行中的订单
    const existingOrder = await db.collection('orders')
      .where({
        serviceId: serviceId,
        receiverId: openid,
        status: _.in(['待接单', '进行中', '待支付'])
      })
      .get()

    if (existingOrder.data.length > 0) {
      return {
        success: false,
        message: '您已有此服务的订单'
      }
    }

    // 创建订单
    const order = {
      serviceId: serviceId,
      service: {
        title: service.title,
        description: service.description,
        images: service.images,
        category: service.category,
        type: service.type
      },
      publisherId: service.userId,
      publisherOpenId: service.userOpenId,
      publisher: service.publisher,
      receiverId: openid,
      receiver: {
        _id: user._id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        creditScore: user.creditScore || 100,
        memberLevel: user.memberLevel || '普通用户'
      },
      status: '待接单',
      price: service.price,
      priceUnit: service.priceUnit || '次',
      description: orderData.description || service.description,
      contactInfo: orderData.contactInfo || service.contactInfo || {},
      location: orderData.location || service.location || {},
      requirements: orderData.requirements || service.requirements || '',
      isOwnService: isOwnService, // 标记是否是接自己的单
      timeline: [
        {
          status: '待接单',
          time: new Date(),
          description: isOwnService ? '您接了自己的服务订单' : '订单已创建，等待接单',
          operator: 'system'
        }
      ],
      paymentStatus: '未支付',
      paymentTime: null,
      createTime: new Date(),
      updateTime: new Date()
    }

    const result = await db.collection('orders').add({
      data: order
    })

    // 发送通知给发布者（如果不是接自己的单）
    if (!isOwnService) {
      await sendNotification(service.userId, {
        type: 'new_order',
        title: '收到新订单',
        content: `您的服务"${service.title}"收到了新订单`,
        orderId: result._id,
        serviceId: serviceId
      })
    }

    return {
      success: true,
      message: '订单创建成功',
      data: {
        orderId: result._id,
        order: {
          ...order,
          _id: result._id
        }
      }
    }
  } catch (error) {
    console.error('创建订单失败:', error)
    return {
      success: false,
      message: '创建订单失败'
    }
  }
}

// 获取订单列表
async function getOrderList(query, openid) {
  try {
    const { page = 1, limit = 10, status, type = 'all' } = query
    const offset = (page - 1) * limit

    let whereCondition = {}

    // 根据类型筛选订单
    if (type === 'publish') {
      // 我发布的订单
      whereCondition.publisherOpenId = openid
    } else if (type === 'receive') {
      // 我接的订单
      whereCondition.receiverId = openid
    } else {
      // 全部订单
      whereCondition.$or = [
        { publisherOpenId: openid },
        { receiverId: openid }
      ]
    }

    // 添加状态筛选
    if (status) {
      whereCondition.status = status
    }

    const ordersResult = await db.collection('orders')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(offset)
      .limit(limit)
      .get()

    const orders = ordersResult.data.map(order => ({
      ...order,
      createTimeText: formatTime(order.createTime),
      statusText: getStatusText(order.status),
      statusClass: mapStatusClass(order.status)
    }))

    // 获取总数
    const countResult = await db.collection('orders')
      .where(whereCondition)
      .count()

    return {
      success: true,
      data: {
        orders: orders,
        total: countResult.total,
        page: page,
        limit: limit,
        hasMore: offset + orders.length < countResult.total
      }
    }
  } catch (error) {
    console.error('获取订单列表失败:', error)
    return {
      success: false,
      message: '获取订单列表失败'
    }
  }
}

// 获取订单详情
async function getOrderDetail(orderId, openid) {
  try {
    const orderResult = await db.collection('orders').doc(orderId).get()
    
    if (!orderResult.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    const order = orderResult.data

    // 检查权限
    if (order.publisherOpenId !== openid && order.receiverId !== openid) {
      return {
        success: false,
        message: '无权限查看此订单'
      }
    }

    // 获取服务详情
    const serviceResult = await db.collection('services').doc(order.serviceId).get()
    if (serviceResult.data) {
      order.service = {
        ...order.service,
        ...serviceResult.data
      }
    }

    // 格式化时间
    order.createTimeText = formatTime(order.createTime)
    order.updateTimeText = formatTime(order.updateTime)
    order.paymentTimeText = order.paymentTime ? formatTime(order.paymentTime) : ''

    return {
      success: true,
      data: order
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    return {
      success: false,
      message: '获取订单详情失败'
    }
  }
}

// 更新订单状态
async function updateOrderStatus(orderId, status, openid) {
  try {
    const orderResult = await db.collection('orders').doc(orderId).get()
    
    if (!orderResult.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    const order = orderResult.data

    // 检查权限
    if (order.publisherOpenId !== openid && order.receiverId !== openid) {
      return {
        success: false,
        message: '无权限操作此订单'
      }
    }

    // 验证状态转换
    if (!isValidStatusTransition(order.status, status, openid, order)) {
      return {
        success: false,
        message: '无效的状态转换'
      }
    }

    // 更新订单状态
    const updateData = {
      status: status,
      updateTime: new Date()
    }

    // 添加时间线记录
    const timelineItem = {
      status: status,
      time: new Date(),
      description: getStatusDescription(status),
      operator: openid
    }

    await db.collection('orders').doc(orderId).update({
      data: {
        ...updateData,
        timeline: _.push([timelineItem])
      }
    })

    // 特殊状态处理
    if (status === '进行中') {
      // 更新服务状态
      await db.collection('services').doc(order.serviceId).update({
        data: {
          status: '已接单',
          updateTime: new Date()
        }
      })

      // 发送通知给发布者
      await sendNotification(order.publisherId, {
        type: 'order_accepted',
        title: '订单已接单',
        content: `您的订单"${order.service.title}"已被接单`,
        orderId: orderId,
        serviceId: order.serviceId
      })
    } else if (status === '已完成') {
      // 发送通知给接单者
      await sendNotification(order.receiverId, {
        type: 'order_completed',
        title: '订单已完成',
        content: `订单"${order.service.title}"已完成，请及时评价`,
        orderId: orderId,
        serviceId: order.serviceId
      })
    } else if (status === '已取消') {
      // 恢复服务状态
      await db.collection('services').doc(order.serviceId).update({
        data: {
          status: '发布中',
          updateTime: new Date()
        }
      })

      // 发送通知
      const notifyUserId = order.publisherOpenId === openid ? order.receiverId : order.publisherId
      await sendNotification(notifyUserId, {
        type: 'order_canceled',
        title: '订单已取消',
        content: `订单"${order.service.title}"已被取消`,
        orderId: orderId,
        serviceId: order.serviceId
      })
    }

    return {
      success: true,
      message: '状态更新成功'
    }
  } catch (error) {
    console.error('更新订单状态失败:', error)
    return {
      success: false,
      message: '更新订单状态失败'
    }
  }
}

// 创建支付订单
async function createPayment(orderId, openid, paymentData) {
  try {
    const orderResult = await db.collection('orders').doc(orderId).get()
    
    if (!orderResult.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    const order = orderResult.data

    // 检查权限
    if (order.receiverId !== openid) {
      return {
        success: false,
        message: '无权限支付此订单'
      }
    }

    // 检查订单状态
    if (order.status !== '进行中') {
      return {
        success: false,
        message: '订单状态不允许支付'
      }
    }

    // 检查是否已支付
    if (order.paymentStatus === '已支付') {
      return {
        success: false,
        message: '订单已支付'
      }
    }

    // 创建微信支付订单
    const paymentResult = await cloud.cloudPay.unifiedOrder({
      body: `服务费用 - ${order.service.title}`,
      outTradeNo: `ORDER_${orderId}_${Date.now()}`,
      spbillCreateIp: '127.0.0.1',
      subMchId: paymentData.subMchId || '',
      totalFee: Math.round(order.price * 100), // 转换为分
      envId: cloud.DYNAMIC_CURRENT_ENV,
      functionName: 'paymentCallback'
    })

    if (paymentResult.returnCode === 'SUCCESS' && paymentResult.resultCode === 'SUCCESS') {
      // 更新订单支付状态
      await db.collection('orders').doc(orderId).update({
        data: {
          paymentStatus: '支付中',
          paymentTime: new Date(),
          paymentData: paymentResult
        }
      })

      return {
        success: true,
        message: '支付订单创建成功',
        data: paymentResult
      }
    } else {
      return {
        success: false,
        message: '支付订单创建失败'
      }
    }
  } catch (error) {
    console.error('创建支付订单失败:', error)
    return {
      success: false,
      message: '创建支付订单失败'
    }
  }
}

// 确认支付
async function confirmPayment(orderId, openid) {
  try {
    const orderResult = await db.collection('orders').doc(orderId).get()
    
    if (!orderResult.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    const order = orderResult.data

    // 检查权限
    if (order.receiverId !== openid) {
      return {
        success: false,
        message: '无权限操作此订单'
      }
    }

    // 更新支付状态
    await db.collection('orders').doc(orderId).update({
      data: {
        paymentStatus: '已支付',
        updateTime: new Date()
      }
    })

    // 发送通知给发布者
    await sendNotification(order.publisherId, {
      type: 'payment_received',
      title: '收到支付',
      content: `订单"${order.service.title}"已收到支付`,
      orderId: orderId,
      serviceId: order.serviceId
    })

    return {
      success: true,
      message: '支付确认成功'
    }
  } catch (error) {
    console.error('确认支付失败:', error)
    return {
      success: false,
      message: '确认支付失败'
    }
  }
}

// 取消订单
async function cancelOrder(orderId, openid) {
  return await updateOrderStatus(orderId, '已取消', openid)
}

// 完成订单
async function completeOrder(orderId, openid) {
  return await updateOrderStatus(orderId, '已完成', openid)
}

// 获取我的订单
async function getMyOrders(openid) {
  try {
    const ordersResult = await db.collection('orders')
      .where({
        $or: [
          { publisherOpenId: openid },
          { receiverId: openid }
        ]
      })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get()

    const orders = ordersResult.data.map(order => ({
      ...order,
      createTimeText: formatTime(order.createTime),
      statusText: getStatusText(order.status),
      statusClass: mapStatusClass(order.status)
    }))

    return {
      success: true,
      data: orders
    }
  } catch (error) {
    console.error('获取我的订单失败:', error)
    return {
      success: false,
      message: '获取我的订单失败'
    }
  }
}

// 获取订单统计
async function getOrderStats(openid) {
  try {
    // 我发布的订单统计
    const publishResult = await db.collection('orders')
      .where({
        publisherOpenId: openid
      })
      .get()

    const publishOrders = publishResult.data
    const publishStats = {
      total: publishOrders.length,
      pending: publishOrders.filter(o => o.status === '待接单').length,
      inProgress: publishOrders.filter(o => o.status === '进行中').length,
      completed: publishOrders.filter(o => o.status === '已完成').length,
      canceled: publishOrders.filter(o => o.status === '已取消').length
    }

    // 我接的订单统计
    const receiveResult = await db.collection('orders')
      .where({
        receiverId: openid
      })
      .get()

    const receiveOrders = receiveResult.data
    const receiveStats = {
      total: receiveOrders.length,
      pending: receiveOrders.filter(o => o.status === '待接单').length,
      inProgress: receiveOrders.filter(o => o.status === '进行中').length,
      completed: receiveOrders.filter(o => o.status === '已完成').length,
      canceled: receiveOrders.filter(o => o.status === '已取消').length
    }

    return {
      success: true,
      data: {
        publish: publishStats,
        receive: receiveStats
      }
    }
  } catch (error) {
    console.error('获取订单统计失败:', error)
    return {
      success: false,
      message: '获取订单统计失败'
    }
  }
}

// 验证状态转换
function isValidStatusTransition(currentStatus, newStatus, openid, order) {
  const transitions = {
    '待接单': ['进行中', '已取消'],
    '进行中': ['已完成', '已取消'],
    '已完成': [],
    '已取消': []
  }

  const allowedTransitions = transitions[currentStatus] || []
  
  // 检查基本状态转换
  if (!allowedTransitions.includes(newStatus)) {
    return false
  }

  // 特殊权限检查
  if (newStatus === '进行中' && order.receiverId !== openid) {
    return false // 只有接单者可以接单
  }

  if (newStatus === '已完成' && order.publisherOpenId !== openid) {
    return false // 只有发布者可以完成订单
  }

  return true
}

// 获取状态描述
function getStatusDescription(status) {
  const descriptions = {
    '待接单': '订单已创建，等待接单',
    '进行中': '订单已接单，服务进行中',
    '已完成': '服务已完成',
    '已取消': '订单已取消'
  }
  return descriptions[status] || status
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    '待接单': '等待接单',
    '进行中': '服务进行中',
    '已完成': '服务已完成',
    '已取消': '订单已取消'
  }
  return statusMap[status] || status
}

// 将状态映射为 ASCII 安全的 class 名
function mapStatusClass(status) {
  const classMap = {
    '待接单': 'pending',
    '进行中': 'in-progress',
    '已完成': 'completed',
    '已取消': 'canceled'
  }
  return classMap[status] || ''
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return Math.floor(diff / 60000) + '分钟前'
  } else if (diff < 86400000) { // 1天内
    return Math.floor(diff / 3600000) + '小时前'
  } else if (diff < 2592000000) { // 30天内
    return Math.floor(diff / 86400000) + '天前'
  } else {
    return date.toLocaleDateString()
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