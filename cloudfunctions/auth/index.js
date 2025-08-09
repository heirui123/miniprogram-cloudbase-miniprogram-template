// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action, userInfo } = event

  try {
    switch (action) {
      case 'login':
        return await handleLogin(wxContext, userInfo)
      case 'getUserInfo':
        return await getUserInfo(wxContext)
      case 'updateUserInfo':
        return await updateUserInfo(wxContext, userInfo)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('Auth function error:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 处理用户登录
async function handleLogin(wxContext, userInfo) {
  const { OPENID, UNIONID } = wxContext
  
  try {
    // 查询用户是否已存在
    const userResult = await db.collection('users').where({
      openid: OPENID
    }).get()

    if (userResult.data.length > 0) {
      // 用户已存在，更新信息
      const user = userResult.data[0]
      await db.collection('users').doc(user._id).update({
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          updateTime: new Date()
        }
      })
      
      return {
        success: true,
        data: {
          ...user,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        }
      }
    } else {
      // 创建新用户
      const newUser = {
        openid: OPENID,
        unionid: UNIONID,
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        creditScore: 100, // 初始信用分数
        memberLevel: '普通用户',
        createTime: new Date(),
        updateTime: new Date()
      }
      
      const result = await db.collection('users').add({
        data: newUser
      })
      
      return {
        success: true,
        data: {
          _id: result._id,
          ...newUser
        }
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      message: '登录失败'
    }
  }
}

// 获取用户信息
async function getUserInfo(wxContext) {
  const { OPENID } = wxContext
  
  try {
    const result = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    if (result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      }
    } else {
      return {
        success: false,
        message: '用户不存在'
      }
    }
  } catch (error) {
    console.error('Get user info error:', error)
    return {
      success: false,
      message: '获取用户信息失败'
    }
  }
}

// 更新用户信息
async function updateUserInfo(wxContext, userInfo) {
  const { OPENID } = wxContext
  
  try {
    const result = await db.collection('users').where({
      openid: OPENID
    }).update({
      data: {
        ...userInfo,
        updateTime: new Date()
      }
    })
    
    if (result.stats.updated > 0) {
      return {
        success: true,
        message: '更新成功'
      }
    } else {
      return {
        success: false,
        message: '用户不存在'
      }
    }
  } catch (error) {
    console.error('Update user info error:', error)
    return {
      success: false,
      message: '更新用户信息失败'
    }
  }
} 