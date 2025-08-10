// cloudfunctions/notification/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { action, notificationData, query, notificationId } = event

  try {
    switch (action) {
      case 'create':
        return await createNotification(openid, notificationData)
      case 'getList':
        return await getNotificationList(openid, query)
      case 'markAsRead':
        return await markAsRead(openid, notificationId)
      case 'markAllAsRead':
        return await markAllAsRead(openid)
      case 'delete':
        return await deleteNotification(openid, notificationId)
      case 'getUnreadCount':
        return await getUnreadCount(openid)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('通知系统错误:', error)
    return {
      success: false,
      message: '操作失败',
      error: error.message
    }
  }
}

// 创建通知
async function createNotification(openid, notificationData) {
  const { userId, type, title, content, data } = notificationData

  if (!userId || !type || !title || !content) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  const notification = {
    userId: userId,
    type: type,
    title: title,
    content: content,
    data: data || {},
    isRead: false,
    createTime: new Date()
  }

  const result = await db.collection('notifications').add({
    data: notification
  })

  return {
    success: true,
    message: '通知创建成功',
    data: {
      notificationId: result._id
    }
  }
}

// 获取通知列表
async function getNotificationList(openid, query = {}) {
  const { page = 1, limit = 20, type } = query
  const skip = (page - 1) * limit

  let whereCondition = {
    userId: openid
  }

  if (type) {
    whereCondition.type = type
  }

  const result = await db.collection('notifications')
    .where(whereCondition)
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  // 格式化时间
  const notifications = result.data.map(notification => {
    return {
      ...notification,
      createTimeText: formatTime(notification.createTime)
    }
  })

  return {
    success: true,
    data: notifications,
    total: notifications.length
  }
}

// 标记为已读
async function markAsRead(openid, notificationId) {
  if (!notificationId) {
    return {
      success: false,
      message: '通知ID不能为空'
    }
  }

  await db.collection('notifications').doc(notificationId).update({
    data: {
      isRead: true,
      readTime: new Date()
    }
  })

  return {
    success: true,
    message: '标记成功'
  }
}

// 标记全部为已读
async function markAllAsRead(openid) {
  await db.collection('notifications')
    .where({
      userId: openid,
      isRead: false
    })
    .update({
      data: {
        isRead: true,
        readTime: new Date()
      }
    })

  return {
    success: true,
    message: '全部标记成功'
  }
}

// 删除通知
async function deleteNotification(openid, notificationId) {
  if (!notificationId) {
    return {
      success: false,
      message: '通知ID不能为空'
    }
  }

  await db.collection('notifications').doc(notificationId).remove()

  return {
    success: true,
    message: '删除成功'
  }
}

// 获取未读数量
async function getUnreadCount(openid) {
  const result = await db.collection('notifications')
    .where({
      userId: openid,
      isRead: false
    })
    .count()

  return {
    success: true,
    data: {
      unreadCount: result.total
    }
  }
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
  } else if (diff < 86400000) { // 24小时内
    return Math.floor(diff / 3600000) + '小时前'
  } else if (diff < 2592000000) { // 30天内
    return Math.floor(diff / 86400000) + '天前'
  } else {
    return date.toLocaleDateString()
  }
} 