// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action, serviceData, query, serviceId } = event

  try {
    switch (action) {
      case 'create':
        return await createService(wxContext, serviceData)
      case 'getList':
        return await getServiceList(wxContext, query)
      case 'getDetail':
        return await getServiceDetailWithGuard(wxContext, serviceId)
      case 'update':
        return await updateService(wxContext, serviceId, serviceData)
      case 'delete':
        return await deleteService(wxContext, serviceId)
      case 'getMyServices':
        return await getMyServices(wxContext)
      case 'getPendingServices':
        return await getPendingServices(wxContext, query)
      case 'reviewService':
        return await reviewService(wxContext, serviceId, serviceData)
      case 'getErrandTasks':
        return await getErrandTasks(wxContext, query)
      case 'collect':
        return await collectService(wxContext, serviceId)
      case 'uncollect':
        return await uncollectService(wxContext, serviceId)
      case 'checkCollection':
        return await checkCollectionStatus(wxContext, serviceId)
      case 'getRelated':
        return await getRelatedServices(wxContext, serviceId, event.category, event.limit)
      case 'recordView':
        return await recordServiceView(wxContext, serviceId)
      case 'getStats':
        return await getServiceStats(wxContext, serviceId)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('Service function error:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 管理员判断
async function isAdmin(wxContext) {
  const { OPENID } = wxContext
  const res = await db.collection('users').where({ openid: OPENID, role: 'admin' }).get()
  return res.data && res.data.length > 0
}

// 创建服务
async function createService(wxContext, serviceData) {
  const { OPENID } = wxContext
  
  try {
    // 获取用户信息
    const userResult = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    const user = userResult.data[0]
    
    // 验证必填字段
    if (!serviceData.title || !serviceData.description) {
      return {
        success: false,
        message: '标题和描述不能为空'
      }
    }

    // 验证价格
    if (serviceData.price && (serviceData.price < 0 || serviceData.price > 10000)) {
      return {
        success: false,
        message: '价格必须在0-10000之间'
      }
    }

    // 跑腿任务特殊验证
    if (serviceData.type === 'errand') {
      if (!serviceData.location || !serviceData.location.address) {
        return {
          success: false,
          message: '跑腿任务必须设置地点'
        }
      }
      
      if (!serviceData.deadline) {
        return {
          success: false,
          message: '跑腿任务必须设置截止时间'
        }
      }
    }
    
    const newService = {
      userId: user._id,
      openid: OPENID,
      ...serviceData,
      status: '待审核',
      reviewInfo: {
        reviewerOpenid: '',
        reviewerUserId: '',
        reviewTime: null,
        reason: ''
      },
      createTime: new Date(),
      updateTime: new Date()
    }
    
    const result = await db.collection('services').add({
      data: newService
    })
    
    return {
      success: true,
      data: {
        _id: result._id,
        ...newService
      }
    }
  } catch (error) {
    console.error('Create service error:', error)
    return {
      success: false,
      message: '创建服务失败'
    }
  }
}

// 获取服务列表
async function getServiceList(wxContext, query) {
  const { OPENID } = wxContext
  
  try {
    const page = query?.page || 1
    const limit = query?.limit || 20
    const skip = (page - 1) * limit

    let whereCondition = {}

    // 类型筛选
    if (query?.type) {
      whereCondition.type = query.type
    }

    // 分类筛选
    if (query?.category) {
      whereCondition.category = query.category
    }

    // 状态筛选（默认仅显示发布中）
    if (query?.status) {
      whereCondition.status = query.status
    } else {
      whereCondition.status = '发布中'
    }

    // 关键词搜索（标题或描述）
    if (query?.keyword) {
      const keyword = query.keyword.trim()
      if (keyword) {
        whereCondition = _.and([
          whereCondition,
          _.or([
            { title: db.RegExp({ regexp: keyword, options: 'i' }) },
            { description: db.RegExp({ regexp: keyword, options: 'i' }) }
          ])
        ])
      }
    }

    // 价格筛选
    if (query?.priceRange) {
      const priceRange = query.priceRange
      if (priceRange === '0-50') {
        whereCondition = _.and([whereCondition, { price: _.lte(50) }])
      } else if (priceRange === '50-100') {
        whereCondition = _.and([whereCondition, { price: _.gte(50).and(_.lte(100)) }])
      } else if (priceRange === '100-200') {
        whereCondition = _.and([whereCondition, { price: _.gte(100).and(_.lte(200)) }])
      } else if (priceRange === '200-500') {
        whereCondition = _.and([whereCondition, { price: _.gte(200).and(_.lte(500)) }])
      } else if (priceRange === '500+') {
        whereCondition = _.and([whereCondition, { price: _.gte(500) }])
      }
    }

    // 排序
    let orderField = 'createTime'
    let orderDirection = 'desc'
    if (query?.sort === 'price') {
      orderField = 'price'
      orderDirection = 'asc'
    } else if (query?.sort === 'price_desc') {
      orderField = 'price'
      orderDirection = 'desc'
    } else if (query?.sort === 'latest') {
      orderField = 'createTime'
      orderDirection = 'desc'
    } else if (query?.sort === 'distance') {
      // 距离排序暂未实现，默认仍按时间倒序
      orderField = 'createTime'
      orderDirection = 'desc'
    }

    const result = await db.collection('services')
      .where(whereCondition)
      .orderBy(orderField, orderDirection)
      .skip(skip)
      .limit(limit)
      .get()

    // 关联发布者信息
    const services = await Promise.all((result.data || []).map(async (service) => {
      try {
        if (service.userId) {
          const userRes = await db.collection('users').doc(service.userId).get()
          service.publisher = userRes.data || null
        } else {
          service.publisher = null
        }
      } catch (e) {
        service.publisher = null
      }
      return service
    }))
    
    return {
      success: true,
      data: services,
      total: services.length
    }
  } catch (error) {
    console.error('Get service list error:', error)
    return {
      success: false,
      message: '获取服务列表失败'
    }
  }
}

// 获取跑腿任务列表（专门用于跑腿代办页面）
async function getErrandTasks(wxContext, query) {
  const { OPENID } = wxContext
  
  try {
    const page = query?.page || 1
    const limit = query?.limit || 10
    const skip = (page - 1) * limit

    let whereCondition = {
      type: 'errand',
      status: '发布中'
    }

    // 分类筛选
    if (query?.category && query.category !== '') {
      whereCondition.category = query.category
    }

    // 关键词搜索
    if (query?.keyword) {
      const keyword = query.keyword.trim()
      if (keyword) {
        whereCondition = _.and([
          whereCondition,
          _.or([
            { title: db.RegExp({ regexp: keyword, options: 'i' }) },
            { description: db.RegExp({ regexp: keyword, options: 'i' }) }
          ])
        ])
      }
    }

    // 价格筛选
    if (query?.priceRange) {
      const priceRange = query.priceRange
      if (priceRange === '0-20') {
        whereCondition = _.and([whereCondition, { price: _.lte(20) }])
      } else if (priceRange === '20-50') {
        whereCondition = _.and([whereCondition, { price: _.gte(20).and(_.lte(50)) }])
      } else if (priceRange === '50-100') {
        whereCondition = _.and([whereCondition, { price: _.gte(50).and(_.lte(100)) }])
      } else if (priceRange === '100+') {
        whereCondition = _.and([whereCondition, { price: _.gte(100) }])
      }
    }

    // 排序
    let orderField = 'createTime'
    let orderDirection = 'desc'
    if (query?.sort === 'price') {
      orderField = 'price'
      orderDirection = 'asc'
    } else if (query?.sort === 'price_desc') {
      orderField = 'price'
      orderDirection = 'desc'
    } else if (query?.sort === 'latest') {
      orderField = 'createTime'
      orderDirection = 'desc'
    } else if (query?.sort === 'deadline') {
      orderField = 'deadline'
      orderDirection = 'asc'
    }

    const result = await db.collection('services')
      .where(whereCondition)
      .orderBy(orderField, orderDirection)
      .skip(skip)
      .limit(limit)
      .get()

    // 关联发布者信息
    const tasks = await Promise.all((result.data || []).map(async (task) => {
      try {
        if (task.userId) {
          const userRes = await db.collection('users').doc(task.userId).get()
          task.publisher = userRes.data || null
        } else {
          task.publisher = null
        }
        
        // 格式化时间
        if (task.createTime) {
          task.createTimeText = formatTime(task.createTime)
        }
        
        // 格式化截止时间
        if (task.deadline) {
          task.deadlineText = formatDeadline(task.deadline)
        }
        
        // 设置状态文本和样式类
        task.statusText = getStatusText(task.status)
        task.statusClass = mapStatusClass(task.status)
        
      } catch (e) {
        task.publisher = null
      }
      return task
    }))
    
    return {
      success: true,
      data: tasks,
      total: tasks.length
    }
  } catch (error) {
    console.error('Get errand tasks error:', error)
    return {
      success: false,
      message: '获取跑腿任务失败'
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

// 格式化截止时间
function formatDeadline(deadline) {
  if (!deadline) return ''
  
  const deadlineDate = new Date(deadline)
  const now = new Date()
  const diff = deadlineDate - now
  
  if (diff < 0) {
    return '已过期'
  } else if (diff < 3600000) { // 1小时内
    return Math.floor(diff / 60000) + '分钟后截止'
  } else if (diff < 86400000) { // 24小时内
    return Math.floor(diff / 3600000) + '小时后截止'
  } else {
    return deadlineDate.toLocaleDateString() + '截止'
  }
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    '发布中': '可接单',
    '已接单': '进行中',
    '已完成': '已完成',
    '已取消': '已取消'
  }
  return statusMap[status] || status
}

// 将状态映射为 ASCII 安全的 class 名
function mapStatusClass(status) {
  const classMap = {
    '发布中': 'publishing',
    '已接单': 'accepted',
    '已完成': 'done',
    '已取消': 'canceled'
  }
  return classMap[status] || ''
}

// 获取服务详情（含可见性校验）
async function getServiceDetailWithGuard(wxContext, serviceId) {
  try {
    const result = await db.collection('services').doc(serviceId).get()
    if (!result.data) {
      return { success: false, message: '服务不存在' }
    }

    const service = result.data
    const { OPENID } = wxContext
    const admin = await isAdmin(wxContext)

    // 非发布中时，仅作者或管理员可见
    if (service.status !== '发布中' && service.openid !== OPENID && !admin) {
      return { success: false, message: '服务未上架或不可见' }
    }

    // 获取发布者信息
    if (service.userId) {
      try {
        const userResult = await db.collection('users').doc(service.userId).get()
        service.publisher = userResult.data
      } catch (e) {
        service.publisher = null
      }
    }

    // 获取评价信息（仅发布中对外，其他状态作者/管理员也可见）
    const reviewResult = await db.collection('reviews').where({ serviceId }).get()
    service.reviews = reviewResult.data

    return { success: true, data: service }
  } catch (error) {
    console.error('Get service detail error:', error)
    return { success: false, message: '获取服务详情失败' }
  }
}

// 获取待审核列表（管理员）
async function getPendingServices(wxContext, query) {
  if (!(await isAdmin(wxContext))) {
    return { success: false, message: '无权限' }
  }

  try {
    const page = query?.page || 1
    const limit = query?.limit || 20
    const skip = (page - 1) * limit

    const result = await db.collection('services')
      .where({ status: '待审核' })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get()

    // 附带发布者基础信息
    const services = await Promise.all((result.data || []).map(async (service) => {
      try {
        if (service.userId) {
          const userRes = await db.collection('users').doc(service.userId).get()
          service.publisher = userRes.data || null
        } else {
          service.publisher = null
        }
      } catch (e) {
        service.publisher = null
      }
      return service
    }))

    return { success: true, data: services }
  } catch (error) {
    console.error('Get pending services error:', error)
    return { success: false, message: '获取待审核列表失败' }
  }
}

// 审核服务（管理员）
// serviceData: { decision: 'approve' | 'reject', reason?: string }
async function reviewService(wxContext, serviceId, serviceData) {
  if (!(await isAdmin(wxContext))) {
    return { success: false, message: '无权限' }
  }
  const { OPENID } = wxContext

  try {
    const docRes = await db.collection('services').doc(serviceId).get()
    if (!docRes.data) {
      return { success: false, message: '服务不存在' }
    }
    if (docRes.data.status !== '待审核') {
      return { success: false, message: '当前状态不可审核' }
    }

    let nextStatus = ''
    if (serviceData.decision === 'approve') {
      nextStatus = '发布中'
    } else if (serviceData.decision === 'reject') {
      nextStatus = '审核拒绝'
    } else {
      return { success: false, message: '非法审核动作' }
    }

    const reviewerUserQuery = await db.collection('users').where({ openid: OPENID }).get()
    const reviewerUser = reviewerUserQuery.data && reviewerUserQuery.data[0]

    await db.collection('services').doc(serviceId).update({
      data: {
        status: nextStatus,
        reviewInfo: {
          reviewerOpenid: OPENID,
          reviewerUserId: reviewerUser ? reviewerUser._id : '',
          reviewTime: new Date(),
          reason: serviceData.reason || ''
        },
        updateTime: new Date()
      }
    })

    return { success: true, message: '审核已提交', data: { status: nextStatus } }
  } catch (error) {
    console.error('Review service error:', error)
    return { success: false, message: '审核失败' }
  }
}

// 更新服务
async function updateService(wxContext, serviceId, serviceData) {
  const { OPENID } = wxContext
  
  try {
    // 检查权限
    const serviceResult = await db.collection('services').doc(serviceId).get()
    
    if (!serviceResult.data) {
      return {
        success: false,
        message: '服务不存在'
      }
    }
    
    if (serviceResult.data.openid !== OPENID) {
      return {
        success: false,
        message: '无权限修改'
      }
    }
    
    const result = await db.collection('services').doc(serviceId).update({
      data: {
        ...serviceData,
        updateTime: new Date()
      }
    })
    
    return {
      success: true,
      message: '更新成功'
    }
  } catch (error) {
    console.error('Update service error:', error)
    return {
      success: false,
      message: '更新服务失败'
    }
  }
}

// 删除服务
async function deleteService(wxContext, serviceId) {
  const { OPENID } = wxContext
  
  try {
    // 检查权限
    const serviceResult = await db.collection('services').doc(serviceId).get()
    
    if (!serviceResult.data) {
      return {
        success: false,
        message: '服务不存在'
      }
    }
    
    if (serviceResult.data.openid !== OPENID) {
      return {
        success: false,
        message: '无权限删除'
      }
    }
    
    await db.collection('services').doc(serviceId).remove()
    
    return {
      success: true,
      message: '删除成功'
    }
  } catch (error) {
    console.error('Delete service error:', error)
    return {
      success: false,
      message: '删除服务失败'
    }
  }
}

// 获取我的服务
async function getMyServices(wxContext) {
  const { OPENID } = wxContext
  
  try {
    const result = await db.collection('services')
      .where({
        openid: OPENID
      })
      .orderBy('createTime', 'desc')
      .get()
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('Get my services error:', error)
    return {
      success: false,
      message: '获取我的服务失败'
    }
  }
} 

// 收藏服务
async function collectService(wxContext, serviceId) {
  try {
    const { OPENID } = wxContext
    
    // 检查服务是否存在
    const serviceResult = await db.collection('services').doc(serviceId).get()
    if (!serviceResult.data) {
      return {
        success: false,
        message: '服务不存在'
      }
    }
    
    // 检查是否已收藏
    const existingCollection = await db.collection('collections')
      .where({
        userOpenId: OPENID,
        serviceId: serviceId
      })
      .get()
    
    if (existingCollection.data.length > 0) {
      return {
        success: false,
        message: '已收藏此服务'
      }
    }
    
    // 添加收藏
    await db.collection('collections').add({
      data: {
        userOpenId: OPENID,
        serviceId: serviceId,
        createTime: new Date()
      }
    })
    
    return {
      success: true,
      message: '收藏成功'
    }
  } catch (error) {
    console.error('收藏服务失败:', error)
    return {
      success: false,
      message: '收藏失败'
    }
  }
}

// 取消收藏
async function uncollectService(wxContext, serviceId) {
  try {
    const { OPENID } = wxContext
    
    // 删除收藏记录
    const result = await db.collection('collections')
      .where({
        userOpenId: OPENID,
        serviceId: serviceId
      })
      .remove()
    
    if (result.stats.removed === 0) {
      return {
        success: false,
        message: '未收藏此服务'
      }
    }
    
    return {
      success: true,
      message: '取消收藏成功'
    }
  } catch (error) {
    console.error('取消收藏失败:', error)
    return {
      success: false,
      message: '取消收藏失败'
    }
  }
}

// 检查收藏状态
async function checkCollectionStatus(wxContext, serviceId) {
  try {
    const { OPENID } = wxContext
    
    const result = await db.collection('collections')
      .where({
        userOpenId: OPENID,
        serviceId: serviceId
      })
      .get()
    
    return {
      success: true,
      data: {
        isCollected: result.data.length > 0
      }
    }
  } catch (error) {
    console.error('检查收藏状态失败:', error)
    return {
      success: false,
      message: '检查收藏状态失败'
    }
  }
}

// 获取相关推荐
async function getRelatedServices(wxContext, serviceId, category, limit = 3) {
  try {
    const { OPENID } = wxContext
    
    // 构建查询条件
    let whereCondition = {
      status: '发布中',
      _id: _.neq(serviceId) // 排除当前服务
    }
    
    if (category) {
      whereCondition.category = category
    }
    
    // 查询相关服务
    const result = await db.collection('services')
      .where(whereCondition)
      .orderBy('viewCount', 'desc')
      .limit(limit)
      .get()
    
    const services = result.data.map(service => ({
      ...service,
      createTimeText: formatTime(service.createTime)
    }))
    
    return {
      success: true,
      data: services
    }
  } catch (error) {
    console.error('获取相关推荐失败:', error)
    return {
      success: false,
      message: '获取相关推荐失败'
    }
  }
}

// 记录浏览记录
async function recordServiceView(wxContext, serviceId) {
  try {
    const { OPENID } = wxContext
    
    // 增加浏览量
    await db.collection('services').doc(serviceId).update({
      data: {
        viewCount: _.inc(1)
      }
    })
    
    // 记录浏览历史
    await db.collection('view_history').add({
      data: {
        userOpenId: OPENID,
        serviceId: serviceId,
        viewTime: new Date()
      }
    })
    
    return {
      success: true
    }
  } catch (error) {
    console.error('记录浏览失败:', error)
    return {
      success: false
    }
  }
}

// 获取服务统计
async function getServiceStats(wxContext, serviceId) {
  try {
    // 获取服务基本信息
    const serviceResult = await db.collection('services').doc(serviceId).get()
    if (!serviceResult.data) {
      return {
        success: false,
        message: '服务不存在'
      }
    }
    
    const service = serviceResult.data
    
    // 获取评价统计
    const reviewsResult = await db.collection('reviews')
      .where({
        serviceId: serviceId,
        status: '已发布'
      })
      .get()
    
    const reviews = reviewsResult.data
    const totalReviews = reviews.length
    const avgRating = totalReviews > 0 ? 
      reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0
    
    // 获取订单统计
    const ordersResult = await db.collection('orders')
      .where({
        serviceId: serviceId,
        status: '已完成'
      })
      .get()
    
    const completedOrders = ordersResult.data.length
    
    return {
      success: true,
      data: {
        viewCount: service.viewCount || 0,
        orderCount: completedOrders,
        reviewCount: totalReviews,
        avgRating: Math.round(avgRating * 10) / 10
      }
    }
  } catch (error) {
    console.error('获取服务统计失败:', error)
    return {
      success: false,
      message: '获取服务统计失败'
    }
  }
} 