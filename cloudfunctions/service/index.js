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

    // 排序
    let orderField = 'createTime'
    let orderDirection = 'desc'
    if (query?.sort === 'price') {
      orderField = 'price'
      orderDirection = 'asc'
    } else if (query?.sort === 'time') {
      orderField = 'createTime'
      orderDirection = 'desc'
    } else if (query?.sort === 'distance') {
      // 预留：距离排序暂未实现，默认仍按时间倒序
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