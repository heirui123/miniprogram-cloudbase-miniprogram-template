// order/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, orderId, serviceId, query, status, orderData } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    switch (action) {
      case 'create':
        return await createOrder(serviceId, openid)
      case 'getList':
        return await getOrderList(query, openid)
      case 'getDetail':
        return await getOrderDetail(orderId, openid)
      case 'updateStatus':
        return await updateOrderStatus(orderId, status, openid)
      case 'getMyOrders':
        return await getMyOrders(openid)
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
async function createOrder(serviceId, openid) {
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

    // 检查是否是自己发布的服务（对比服务发布者openid）
    if (service.openid === openid) {
      return {
        success: false,
        message: '不能接自己的单'
      }
    }

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

    // 创建订单
    const orderData = {
      serviceId: serviceId,
      publisherId: service.userId,          // 发布者用户文档ID
      publisherOpenid: service.openid,      // 发布者openid，便于按openid查询
      receiverId: openid,                   // 接单者openid
      status: '进行中',
      price: service.price,
      description: service.description,
      contactInfo: service.contactInfo,
      location: service.location,
      timeline: [
        {
          status: '待接单',
          time: new Date(),
          description: '订单已创建'
        },
        {
          status: '进行中',
          time: new Date(),
          description: '订单已接单'
        }
      ],
      createTime: new Date(),
      updateTime: new Date()
    }

    const result = await db.collection('orders').add({
      data: orderData
    })

    // 更新服务状态
    await db.collection('services').doc(serviceId).update({
      data: {
        status: '已接单',
        updateTime: new Date()
      }
    })

    return {
      success: true,
      message: '接单成功',
      data: {
        orderId: result._id
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
    const { page = 1, limit = 10, status } = query
    const skip = (page - 1) * limit

    let whereCondition = {
      $or: [
        { publisherOpenid: openid },
        { receiverId: openid }
      ]
    }

    if (status) {
      whereCondition.status = status
    }

    const result = await db.collection('orders')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get()

    // 获取关联的服务和用户信息
    const orders = await Promise.all(result.data.map(async (order) => {
      const [serviceResult, publisherResult, receiverResult] = await Promise.all([
        db.collection('services').doc(order.serviceId).get(),
        order.publisherId ? db.collection('users').doc(order.publisherId).get() : Promise.resolve({ data: null }),
        order.receiverId ? db.collection('users').where({ openid: order.receiverId }).get() : Promise.resolve({ data: [] })
      ])

      return {
        ...order,
        service: serviceResult.data || {},
        publisher: publisherResult.data || {},
        receiver: (receiverResult.data && receiverResult.data[0]) || null
      }
    }))

    return {
      success: true,
      data: orders
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
    const result = await db.collection('orders').doc(orderId).get()
    
    if (!result.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    const order = result.data

    // 检查权限
    if (order.publisherOpenid !== openid && order.receiverId !== openid) {
      return {
        success: false,
        message: '无权限查看此订单'
      }
    }

    // 获取关联信息
    const [serviceResult, publisherResult, receiverResult] = await Promise.all([
      db.collection('services').doc(order.serviceId).get(),
      order.publisherId ? db.collection('users').doc(order.publisherId).get() : Promise.resolve({ data: null }),
      order.receiverId ? db.collection('users').where({ openid: order.receiverId }).get() : Promise.resolve({ data: [] })
    ])

    const orderDetail = {
      ...order,
      service: serviceResult.data || {},
      publisher: publisherResult.data || {},
      receiver: (receiverResult.data && receiverResult.data[0]) || null
    }

    return {
      success: true,
      data: orderDetail
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
    if (order.publisherOpenid !== openid && order.receiverId !== openid) {
      return {
        success: false,
        message: '无权限操作此订单'
      }
    }

    // 检查状态转换的合法性
    if (!isValidStatusTransition(order.status, status)) {
      return {
        success: false,
        message: '状态转换不合法'
      }
    }

    // 更新订单状态
    const timelineItem = {
      status: status,
      time: new Date(),
      description: getStatusDescription(status)
    }

    await db.collection('orders').doc(orderId).update({
      data: {
        status: status,
        timeline: _.push(timelineItem),
        updateTime: new Date()
      }
    })

    // 如果订单完成，更新服务状态
    if (status === '已完成') {
      await db.collection('services').doc(order.serviceId).update({
        data: {
          status: '已完成',
          updateTime: new Date()
        }
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

// 获取我的订单
async function getMyOrders(openid) {
  try {
    const result = await db.collection('orders')
      .where({
        $or: [
          { publisherOpenid: openid },
          { receiverId: openid }
        ]
      })
      .orderBy('createTime', 'desc')
      .get()

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('获取我的订单失败:', error)
    return {
      success: false,
      message: '获取我的订单失败'
    }
  }
}

// 检查状态转换是否合法
function isValidStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    '待接单': ['进行中', '已取消'],
    '进行中': ['已完成', '已取消'],
    '已完成': [],
    '已取消': []
  }

  return validTransitions[currentStatus] && validTransitions[currentStatus].includes(newStatus)
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