// cloudfunctions/oa-oauth/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// Helpers
function jsonResponse(statusCode, data, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
    body: JSON.stringify(data),
  }
}

function redirectResponse(location) {
  return {
    statusCode: 302,
    headers: { Location: location },
    body: '',
  }
}

function getEnvString(name, defaultValue = '') {
  try {
    const value = process.env[name] || cloud.getCloudEnv()?.[name]
    return (value && String(value)) || defaultValue
  } catch (e) {
    return defaultValue
  }
}

function isWechatBrowser(headers = {}) {
  const ua = (headers['user-agent'] || headers['User-Agent'] || '').toLowerCase()
  return ua.includes('micromessenger')
}

function buildAuthorizeUrl(appid, redirectUri, scope, state) {
  const base = 'https://open.weixin.qq.com/connect/oauth2/authorize'
  const query = `appid=${encodeURIComponent(appid)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state || '')}`
  return `${base}?${query}#wechat_redirect`
}

async function exchangeCodeForToken(appid, secret, code) {
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`exchange_failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  if (data.errcode) {
    throw new Error(`exchange_failed: ${data.errcode} ${data.errmsg || ''}`)
  }
  return data // { access_token, expires_in, refresh_token, openid, scope, unionid? }
}

function now() {
  return new Date()
}

// State sign/verify（可选）
const crypto = require('node:crypto')
function signState(rawState) {
  const secret = getEnvString('OA_STATE_SECRET', '')
  const ts = Math.floor(Date.now() / 1000)
  if (!secret) return rawState || ''
  const payload = `${rawState || ''}|${ts}`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16)
  return `${payload}|${sig}`
}
function verifyState(state) {
  const secret = getEnvString('OA_STATE_SECRET', '')
  if (!secret) return { ok: true, raw: state || '' } // 无密钥则跳过严格校验
  if (!state || typeof state !== 'string') return { ok: false, reason: 'empty' }
  const parts = state.split('|')
  if (parts.length !== 3) return { ok: false, reason: 'format' }
  const [raw, tsStr, sig] = parts
  const expected = crypto.createHmac('sha256', secret).update(`${raw}|${tsStr}`).digest('hex').slice(0, 16)
  if (sig !== expected) return { ok: false, reason: 'sig' }
  const ts = Number(tsStr)
  if (!Number.isFinite(ts)) return { ok: false, reason: 'ts' }
  const maxAge = Number(getEnvString('OA_STATE_TTL', '600')) // 默认10分钟
  const nowSec = Math.floor(Date.now() / 1000)
  if (nowSec - ts > maxAge) return { ok: false, reason: 'expired' }
  return { ok: true, raw }
}

async function upsertUserByOauth({ oaOpenid, unionid }) {
  // 优先 unionid 合并
  if (unionid) {
    const u = await db.collection('users').where({ unionid }).get()
    if (u.data && u.data.length > 0) {
      const userId = u.data[0]._id
      await db.collection('users').doc(userId).update({
        data: { oaOpenid, updateTime: now() },
      })
      return { _id: userId, ...u.data[0], oaOpenid }
    }
  }
  // 其次按 oaOpenid 合并
  if (oaOpenid) {
    const u2 = await db.collection('users').where({ oaOpenid }).get()
    if (u2.data && u2.data.length > 0) {
      const user = u2.data[0]
      return user
    }
  }
  // 新建最小记录
  const newUser = {
    oaOpenid,
    unionid: unionid || '',
    nickName: '微信用户',
    avatarUrl: '',
    creditScore: 100,
    memberLevel: '普通用户',
    createTime: now(),
    updateTime: now(),
  }
  const addRes = await db.collection('users').add({ data: newUser })
  return { _id: addRes._id, ...newUser }
}

function normalizeEvent(event) {
  // 适配 HTTP 触发与普通调用
  const method = (event.httpMethod || event.method || '').toUpperCase()
  const headers = event.headers || {}
  const path = event.path || ''
  const query = event.queryStringParameters || event.query || {}
  return { method, headers, path, query }
}

exports.main = async (event) => {
  try {
    const { method, headers, path, query } = normalizeEvent(event)

    const requireWechat = (getEnvString('OA_REQUIRE_WECHAT_UA', 'false') === 'true')

    // 配置
    const appid = getEnvString('WX_OA_APPID')
    const secret = getEnvString('WX_OA_SECRET')
    const redirectUri = getEnvString('OA_OAUTH_REDIRECT')
    const scope = getEnvString('OA_OAUTH_SCOPE', 'snsapi_base')

    if (!appid || !secret || !redirectUri) {
      return jsonResponse(500, { success: false, code: 'invalid_env_config', message: '缺少 WX_OA_APPID/WX_OA_SECRET/OA_OAUTH_REDIRECT 配置' })
    }

    // 路由匹配
    const route = (path || '').toLowerCase()

    if (route.endsWith('/h5/oauth/start')) {
      if (requireWechat && !isWechatBrowser(headers)) {
        return jsonResponse(400, { success: false, code: 'not_in_wechat_browser', message: '请在微信内置浏览器中打开' })
      }
      const rawState = query.state || ''
      const signedState = signState(rawState)
      const authUrl = buildAuthorizeUrl(appid, redirectUri, scope, signedState)
      return redirectResponse(authUrl)
    }

    if (route.endsWith('/h5/oauth/callback')) {
      if (requireWechat && !isWechatBrowser(headers)) {
        return jsonResponse(400, { success: false, code: 'not_in_wechat_browser', message: '请在微信内置浏览器中打开' })
      }
      const { code, state, format } = query
      if (!code) {
        return jsonResponse(400, { success: false, code: 'missing_code', message: '缺少 code' })
      }

      const stateVerify = verifyState(state || '')
      if (!stateVerify.ok) {
        return jsonResponse(400, { success: false, code: 'state_invalid', message: `state 校验失败: ${stateVerify.reason}` })
      }

      const token = await exchangeCodeForToken(appid, secret, code)
      const oaOpenid = token.openid
      const unionid = token.unionid || ''

      if (!oaOpenid) {
        return jsonResponse(500, { success: false, code: 'exchange_no_openid', message: '未获取到 openid' })
      }

      const user = await upsertUserByOauth({ oaOpenid, unionid })

      const payload = { success: true, openid: oaOpenid, unionid: unionid || '', userId: user._id, state: stateVerify.raw }

      if (format === 'html') {
        const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>授权成功</title></head><body><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></body></html>`
        return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html }
      }

      return jsonResponse(200, payload)
    }

    // 非已知路由：返回说明
    return jsonResponse(404, {
      success: false,
      code: 'not_found',
      message: '未匹配到路由，请使用 /h5/oauth/start 或 /h5/oauth/callback',
    })
  } catch (error) {
    console.error('oa-oauth error:', { message: error && error.message })
    return jsonResponse(500, { success: false, code: 'internal_error', message: '服务器错误' })
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
} 