// cloudfunctions/review/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { action, orderId, rating, content, tags, reviewId, query } = event

  try {
    switch (action) {
      case 'create':
        return await createReview(openid, orderId, rating, content, tags)
      case 'getList':
        return await getReviewList(openid, query)
      case 'like':
        return await likeReview(openid, reviewId)
      case 'getUserReviews':
        return await getUserReviews(openid, query)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('评价系统错误:', error)
    return {
      success: false,
      message: '操作失败',
      error: error.message
    }
  }
}

// 创建评价
async function createReview(openid, orderId, rating, content, tags) {
  // 检查订单是否存在且属于当前用户
  const orderResult = await db.collection('orders').doc(orderId).get()
  if (!orderResult.data) {
    return {
      success: false,
      message: '订单不存在'
    }
  }

  const order = orderResult.data
  if (order.userId !== openid && order.providerId !== openid) {
    return {
      success: false,
      message: '无权限评价此订单'
    }
  }

  // 检查是否已经评价过
  const existingReview = await db.collection('reviews')
    .where({
      orderId: orderId,
      reviewerId: openid
    })
    .get()

  if (existingReview.data.length > 0) {
    return {
      success: false,
      message: '您已经评价过此订单'
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

  const user = userResult.data[0]

  // 创建评价
  const reviewData = {
    orderId: orderId,
    serviceId: order.serviceId,
    reviewerId: openid,
    reviewer: {
      openid: openid,
      nickName: user.nickName,
      avatarUrl: user.avatarUrl
    },
    rating: rating,
    content: content,
    tags: tags || [],
    likes: 0,
    createTime: new Date(),
    updateTime: new Date()
  }

  const result = await db.collection('reviews').add({
    data: reviewData
  })

  // 更新订单状态
  await db.collection('orders').doc(orderId).update({
    data: {
      hasReview: true,
      updateTime: new Date()
    }
  })

  // 更新服务评分
  await updateServiceRating(order.serviceId)

  // 更新用户信用分数
  await updateUserCredit(openid, rating)

  return {
    success: true,
    message: '评价成功',
    data: {
      reviewId: result._id
    }
  }
}

// 获取评价列表
async function getReviewList(openid, query = {}) {
  const { page = 1, limit = 10, filter = 'all', serviceId } = query
  const skip = (page - 1) * limit

  let whereCondition = {}

  // 根据筛选条件添加查询条件
  if (filter === 'positive') {
    whereCondition.rating = _.gte(4)
  } else if (filter === 'neutral') {
    whereCondition.rating = _.and(_.gte(3), _.lt(4))
  } else if (filter === 'negative') {
    whereCondition.rating = _.lt(3)
  }

  if (serviceId) {
    whereCondition.serviceId = serviceId
  }

  const result = await db.collection('reviews')
    .where(whereCondition)
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  // 获取服务信息
  const reviews = await Promise.all(result.data.map(async (review) => {
    try {
      const serviceResult = await db.collection('services').doc(review.serviceId).get()
      if (serviceResult.data) {
        review.serviceTitle = serviceResult.data.title
        review.provider = serviceResult.data.provider
      }
    } catch (error) {
      console.error('获取服务信息失败:', error)
    }
    return review
  }))

  return {
    success: true,
    data: reviews,
    total: result.data.length
  }
}

// 点赞评价
async function likeReview(openid, reviewId) {
  // 检查是否已经点赞过
  const existingLike = await db.collection('review_likes')
    .where({
      reviewId: reviewId,
      userId: openid
    })
    .get()

  if (existingLike.data.length > 0) {
    return {
      success: false,
      message: '您已经点赞过此评价'
    }
  }

  // 添加点赞记录
  await db.collection('review_likes').add({
    data: {
      reviewId: reviewId,
      userId: openid,
      createTime: new Date()
    }
  })

  // 更新评价点赞数
  await db.collection('reviews').doc(reviewId).update({
    data: {
      likes: _.inc(1)
    }
  })

  return {
    success: true,
    message: '点赞成功'
  }
}

// 获取用户评价
async function getUserReviews(openid, query = {}) {
  const { page = 1, limit = 10 } = query
  const skip = (page - 1) * limit

  const result = await db.collection('reviews')
    .where({
      reviewerId: openid
    })
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  return {
    success: true,
    data: result.data,
    total: result.data.length
  }
}

// 更新服务评分
async function updateServiceRating(serviceId) {
  try {
    const reviews = await db.collection('reviews')
      .where({
        serviceId: serviceId
      })
      .get()

    if (reviews.data.length > 0) {
      const totalRating = reviews.data.reduce((sum, review) => sum + review.rating, 0)
      const averageRating = totalRating / reviews.data.length

      await db.collection('services').doc(serviceId).update({
        data: {
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: reviews.data.length,
          updateTime: new Date()
        }
      })
    }
  } catch (error) {
    console.error('更新服务评分失败:', error)
  }
}

// 更新用户信用分数
async function updateUserCredit(openid, rating) {
  try {
    const user = await db.collection('users')
      .where({
        openid: openid
      })
      .get()

    if (user.data.length > 0) {
      let creditChange = 0
      
      // 根据评分调整信用分数
      if (rating >= 4) {
        creditChange = 2 // 好评加2分
      } else if (rating >= 3) {
        creditChange = 1 // 中评加1分
      } else {
        creditChange = -1 // 差评减1分
      }

      await db.collection('users').doc(user.data[0]._id).update({
        data: {
          creditScore: _.inc(creditChange),
          updateTime: new Date()
        }
      })
    }
  } catch (error) {
    console.error('更新用户信用失败:', error)
  }
} 