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

  const { action, orderId, rating, content, tags, reviewId, query, serviceId, replyContent } = event

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
      case 'getServiceReviews':
        return await getServiceReviews(openid, query)
      case 'getUserCredit':
        return await getUserCredit(openid)
      case 'deleteLike':
        return await deleteLike(openid, reviewId)
      case 'getStats':
        return await getReviewStats(openid, serviceId)
      case 'reply':
        return await replyReview(openid, reviewId, replyContent)
      case 'getReviewDetail':
        return await getReviewDetail(openid, reviewId)
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
  // 参数验证
  if (!orderId || !rating || !content) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  if (rating < 1 || rating > 5) {
    return {
      success: false,
      message: '评分必须在1-5之间'
    }
  }

  if (content.length < 5 || content.length > 500) {
    return {
      success: false,
      message: '评价内容长度必须在5-500字之间'
    }
  }

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

  // 检查订单状态
  if (order.status !== 'completed') {
    return {
      success: false,
      message: '只能评价已完成的订单'
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
  const userResult = await db.collection('users').where({ openid: openid }).get()
  const user = userResult.data[0] || {}

  // 创建评价数据
  const reviewData = {
    orderId: orderId,
    serviceId: order.serviceId,
    reviewerId: openid,
    reviewer: {
      nickName: user.nickName || '匿名用户',
      avatarUrl: user.avatarUrl || '/images/default-avatar.png'
    },
    rating: rating,
    content: content,
    tags: tags || [],
    images: [],
    likeCount: 0,
    replyCount: 0,
    status: '已发布',
    createTime: new Date(),
    updateTime: new Date()
  }

  try {
    // 插入评价
    const result = await db.collection('reviews').add({
      data: reviewData
    })

    // 更新服务评分
    await updateServiceRating(order.serviceId)

    // 更新用户信用
    await updateUserCredit(openid, rating)

    // 发送通知给服务提供者
    await sendReviewNotification(order, reviewData)

    return {
      success: true,
      data: {
        _id: result._id,
        ...reviewData
      },
      message: '评价提交成功'
    }
  } catch (error) {
    console.error('创建评价失败:', error)
    return {
      success: false,
      message: '评价提交失败'
    }
  }
}

// 获取评价列表
async function getReviewList(openid, query = {}) {
  const { page = 1, limit = 10, rating, hasImage, serviceId } = query
  const offset = (page - 1) * limit

  try {
    let whereCondition = {
      status: '已发布'
    }

    if (serviceId) {
      whereCondition.serviceId = serviceId
    }

    if (rating) {
      whereCondition.rating = rating
    }

    if (hasImage) {
      whereCondition.images = _.exists(true).and(_.neq([]))
    }

    const reviewsResult = await db.collection('reviews')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(offset)
      .limit(limit)
      .get()

    const reviews = reviewsResult.data.map(review => ({
      ...review,
      createTimeText: formatTime(review.createTime),
      isLiked: false // 默认未点赞，需要单独查询
    }))

    // 检查当前用户的点赞状态
    if (openid) {
      for (let review of reviews) {
        const likeResult = await db.collection('review_likes')
          .where({
            reviewId: review._id,
            userId: openid
          })
          .get()
        review.isLiked = likeResult.data.length > 0
      }
    }

    return {
      success: true,
      data: {
        reviews: reviews,
        page: page,
        limit: limit,
        hasMore: reviews.length === limit
      }
    }
  } catch (error) {
    console.error('获取评价列表失败:', error)
    return {
      success: false,
      message: '获取评价列表失败'
    }
  }
}

// 获取服务评价
async function getServiceReviews(openid, query = {}) {
  const { serviceId, page = 1, limit = 10, rating, hasImage } = query
  const offset = (page - 1) * limit

  if (!serviceId) {
    return {
      success: false,
      message: '服务ID不能为空'
    }
  }

  try {
    let whereCondition = {
      serviceId: serviceId,
      status: '已发布'
    }

    if (rating) {
      whereCondition.rating = rating
    }

    if (hasImage) {
      whereCondition.images = _.exists(true).and(_.neq([]))
    }

    const reviewsResult = await db.collection('reviews')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(offset)
      .limit(limit)
      .get()

    const reviews = reviewsResult.data.map(review => ({
      ...review,
      createTimeText: formatTime(review.createTime),
      isLiked: false
    }))

    // 检查当前用户的点赞状态
    if (openid) {
      for (let review of reviews) {
        const likeResult = await db.collection('review_likes')
          .where({
            reviewId: review._id,
            userId: openid
          })
          .get()
        review.isLiked = likeResult.data.length > 0
      }
    }

    return {
      success: true,
      data: {
        reviews: reviews,
        page: page,
        limit: limit,
        hasMore: reviews.length === limit
      }
    }
  } catch (error) {
    console.error('获取服务评价失败:', error)
    return {
      success: false,
      message: '获取服务评价失败'
    }
  }
}

// 点赞评价
async function likeReview(openid, reviewId) {
  if (!openid || !reviewId) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    // 检查评价是否存在
    const reviewResult = await db.collection('reviews').doc(reviewId).get()
    if (!reviewResult.data) {
      return {
        success: false,
        message: '评价不存在'
      }
    }

    // 检查是否已点赞
    const existingLike = await db.collection('review_likes')
      .where({
        reviewId: reviewId,
        userId: openid
      })
      .get()

    if (existingLike.data.length > 0) {
      // 取消点赞
      await db.collection('review_likes')
        .where({
          reviewId: reviewId,
          userId: openid
        })
        .remove()

      // 减少点赞数
      await db.collection('reviews').doc(reviewId).update({
        data: {
          likeCount: _.inc(-1)
        }
      })

      return {
        success: true,
        message: '取消点赞成功',
        data: { isLiked: false }
      }
    } else {
      // 添加点赞
      await db.collection('review_likes').add({
        data: {
          reviewId: reviewId,
          userId: openid,
          createTime: new Date()
        }
      })

      // 增加点赞数
      await db.collection('reviews').doc(reviewId).update({
        data: {
          likeCount: _.inc(1)
        }
      })

      return {
        success: true,
        message: '点赞成功',
        data: { isLiked: true }
      }
    }
  } catch (error) {
    console.error('点赞操作失败:', error)
    return {
      success: false,
      message: '操作失败'
    }
  }
}

// 删除点赞
async function deleteLike(openid, reviewId) {
  if (!openid || !reviewId) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    const result = await db.collection('review_likes')
      .where({
        reviewId: reviewId,
        userId: openid
      })
      .remove()

    if (result.stats.removed > 0) {
      // 减少点赞数
      await db.collection('reviews').doc(reviewId).update({
        data: {
          likeCount: _.inc(-1)
        }
      })
    }

    return {
      success: true,
      message: '取消点赞成功'
    }
  } catch (error) {
    console.error('取消点赞失败:', error)
    return {
      success: false,
      message: '操作失败'
    }
  }
}

// 获取用户评价
async function getUserReviews(openid, query = {}) {
  const { page = 1, limit = 10 } = query
  const offset = (page - 1) * limit

  try {
    const reviewsResult = await db.collection('reviews')
      .where({
        reviewerId: openid,
        status: '已发布'
      })
      .orderBy('createTime', 'desc')
      .skip(offset)
      .limit(limit)
      .get()

    const reviews = reviewsResult.data.map(review => ({
      ...review,
      createTimeText: formatTime(review.createTime)
    }))

    return {
      success: true,
      data: {
        reviews: reviews,
        page: page,
        limit: limit,
        hasMore: reviews.length === limit
      }
    }
  } catch (error) {
    console.error('获取用户评价失败:', error)
    return {
      success: false,
      message: '获取用户评价失败'
    }
  }
}

// 获取用户信用
async function getUserCredit(openid) {
  try {
    const userResult = await db.collection('users').where({ openid: openid }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const user = userResult.data[0]
    
    return {
      success: true,
      data: {
        creditScore: user.creditScore || 100,
        memberLevel: user.memberLevel || '普通用户',
        reviewCount: user.reviewCount || 0,
        avgRating: user.avgRating || 0
      }
    }
  } catch (error) {
    console.error('获取用户信用失败:', error)
    return {
      success: false,
      message: '获取用户信用失败'
    }
  }
}

// 获取评价统计
async function getReviewStats(openid, serviceId) {
  if (!serviceId) {
    return {
      success: false,
      message: '服务ID不能为空'
    }
  }

  try {
    // 获取所有评价
    const reviewsResult = await db.collection('reviews')
      .where({
        serviceId: serviceId,
        status: '已发布'
      })
      .get()

    const reviews = reviewsResult.data
    const totalCount = reviews.length

    if (totalCount === 0) {
      return {
        success: true,
        data: {
          avgRating: 0,
          totalCount: 0,
          distribution: [
            { rating: 5, count: 0, percentage: 0 },
            { rating: 4, count: 0, percentage: 0 },
            { rating: 3, count: 0, percentage: 0 },
            { rating: 2, count: 0, percentage: 0 },
            { rating: 1, count: 0, percentage: 0 }
          ]
        }
      }
    }

    // 计算平均评分
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const avgRating = Math.round((totalRating / totalCount) * 10) / 10

    // 计算评分分布
    const distribution = [5, 4, 3, 2, 1].map(rating => {
      const count = reviews.filter(review => review.rating === rating).length
      const percentage = Math.round((count / totalCount) * 100)
      return { rating, count, percentage }
    })

    return {
      success: true,
      data: {
        avgRating,
        totalCount,
        distribution
      }
    }
  } catch (error) {
    console.error('获取评价统计失败:', error)
    return {
      success: false,
      message: '获取评价统计失败'
    }
  }
}

// 回复评价
async function replyReview(openid, reviewId, replyContent) {
  if (!openid || !reviewId || !replyContent) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  if (replyContent.length < 1 || replyContent.length > 200) {
    return {
      success: false,
      message: '回复内容长度必须在1-200字之间'
    }
  }

  try {
    // 检查评价是否存在
    const reviewResult = await db.collection('reviews').doc(reviewId).get()
    if (!reviewResult.data) {
      return {
        success: false,
        message: '评价不存在'
      }
    }

    const review = reviewResult.data

    // 检查权限（只有服务提供者可以回复）
    const serviceResult = await db.collection('services').doc(review.serviceId).get()
    if (!serviceResult.data || serviceResult.data.userOpenId !== openid) {
      return {
        success: false,
        message: '无权限回复此评价'
      }
    }

    // 获取用户信息
    const userResult = await db.collection('users').where({ openid: openid }).get()
    const user = userResult.data[0] || {}

    // 创建回复
    const replyData = {
      reviewId: reviewId,
      replierId: openid,
      replier: {
        nickName: user.nickName || '服务提供者',
        avatarUrl: user.avatarUrl || '/images/default-avatar.png'
      },
      content: replyContent,
      createTime: new Date()
    }

    await db.collection('review_replies').add({
      data: replyData
    })

    // 更新评价的回复数
    await db.collection('reviews').doc(reviewId).update({
      data: {
        replyCount: _.inc(1)
      }
    })

    return {
      success: true,
      message: '回复成功',
      data: replyData
    }
  } catch (error) {
    console.error('回复评价失败:', error)
    return {
      success: false,
      message: '回复失败'
    }
  }
}

// 获取评价详情
async function getReviewDetail(openid, reviewId) {
  if (!reviewId) {
    return {
      success: false,
      message: '评价ID不能为空'
    }
  }

  try {
    const reviewResult = await db.collection('reviews').doc(reviewId).get()
    if (!reviewResult.data) {
      return {
        success: false,
        message: '评价不存在'
      }
    }

    const review = reviewResult.data

    // 获取回复列表
    const repliesResult = await db.collection('review_replies')
      .where({
        reviewId: reviewId
      })
      .orderBy('createTime', 'asc')
      .get()

    const replies = repliesResult.data.map(reply => ({
      ...reply,
      createTimeText: formatTime(reply.createTime)
    }))

    // 检查当前用户是否点赞
    let isLiked = false
    if (openid) {
      const likeResult = await db.collection('review_likes')
        .where({
          reviewId: reviewId,
          userId: openid
        })
        .get()
      isLiked = likeResult.data.length > 0
    }

    return {
      success: true,
      data: {
        ...review,
        createTimeText: formatTime(review.createTime),
        isLiked,
        replies
      }
    }
  } catch (error) {
    console.error('获取评价详情失败:', error)
    return {
      success: false,
      message: '获取评价详情失败'
    }
  }
}

// 更新服务评分
async function updateServiceRating(serviceId) {
  try {
    const reviewsResult = await db.collection('reviews')
      .where({
        serviceId: serviceId,
        status: '已发布'
      })
      .get()

    const reviews = reviewsResult.data
    const totalReviews = reviews.length

    if (totalReviews > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
      const avgRating = Math.round((totalRating / totalReviews) * 10) / 10

      await db.collection('services').doc(serviceId).update({
        data: {
          avgRating: avgRating,
          reviewCount: totalReviews
        }
      })
    }
  } catch (error) {
    console.error('更新服务评分失败:', error)
  }
}

// 更新用户信用
async function updateUserCredit(openid, rating) {
  try {
    const userResult = await db.collection('users').where({ openid: openid }).get()
    
    if (userResult.data.length === 0) {
      return
    }

    const user = userResult.data[0]
    const currentCredit = user.creditScore || 100
    const currentReviewCount = user.reviewCount || 0

    // 根据评分调整信用分数
    let creditChange = 0
    if (rating >= 4) {
      creditChange = 2
    } else if (rating >= 3) {
      creditChange = 0
    } else {
      creditChange = -1
    }

    const newCredit = Math.max(0, Math.min(1000, currentCredit + creditChange))
    const newReviewCount = currentReviewCount + 1

    // 计算平均评分
    const reviewsResult = await db.collection('reviews')
      .where({
        reviewerId: openid,
        status: '已发布'
      })
      .get()

    const reviews = reviewsResult.data
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const avgRating = reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : 0

    // 确定会员等级
    let memberLevel = '普通用户'
    if (newCredit >= 800) {
      memberLevel = '钻石会员'
    } else if (newCredit >= 600) {
      memberLevel = '金牌会员'
    } else if (newCredit >= 400) {
      memberLevel = '银牌会员'
    } else if (newCredit >= 200) {
      memberLevel = '铜牌会员'
    }

    await db.collection('users').doc(user._id).update({
      data: {
        creditScore: newCredit,
        memberLevel: memberLevel,
        reviewCount: newReviewCount,
        avgRating: avgRating
      }
    })
  } catch (error) {
    console.error('更新用户信用失败:', error)
  }
}

// 发送评价通知
async function sendReviewNotification(order, reviewData) {
  try {
    // 获取服务信息
    const serviceResult = await db.collection('services').doc(order.serviceId).get()
    if (!serviceResult.data) {
      return
    }

    const service = serviceResult.data

    // 创建通知
    await db.collection('notifications').add({
      data: {
        userId: service.userId,
        type: 'new_review',
        title: '收到新评价',
        content: `您的服务"${service.title}"收到了新的评价，评分：${reviewData.rating}星`,
        serviceId: order.serviceId,
        orderId: order._id,
        reviewId: reviewData._id,
        status: 'unread',
        createTime: new Date()
      }
    })
  } catch (error) {
    console.error('发送评价通知失败:', error)
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
  } else if (diff < 86400000) { // 1天内
    return Math.floor(diff / 3600000) + '小时前'
  } else if (diff < 2592000000) { // 30天内
    return Math.floor(diff / 86400000) + '天前'
  } else {
    return date.toLocaleDateString()
  }
} 