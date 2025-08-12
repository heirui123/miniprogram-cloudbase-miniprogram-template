// 微信支付正式环境配置
// 使用真实的商户号和API密钥

const productionConfig = {
  // 正式环境API地址
  apiUrl: 'https://api.mch.weixin.qq.com',
  
  // 正式环境配置（已配置真实信息）
  appId: 'wx7a3e29b82bad702d',  // 您的小程序AppID
  mchId: '1724647300',         // 您的商户号
  apiKey: 'z8K5G2Y1M9H3T7L4C6B0R8X2N5Q3W711',  // 您的API V2密钥
  
  // 通知地址（已配置真实云函数地址）
  notifyUrl: 'https://cloud1-2g899deedcc43a17-1317031037.tcloudbaseapp.com/payment-notify',
  
  // 正式环境标识
  isSandbox: false,
  
  // 正式环境API路径
  sandboxPath: '/sandboxnew/pay/unifiedorder',  // 沙箱统一下单路径（正式环境不使用）
  normalPath: '/pay/unifiedorder',              // 正式环境统一下单路径
  
  // 沙箱密钥获取路径（正式环境不使用）
  sandboxKeyPath: '/sandboxnew/pay/getsignkey'
};

module.exports = productionConfig; 