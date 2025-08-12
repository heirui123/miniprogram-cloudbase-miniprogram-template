// 微信支付沙箱环境配置
// 用于开发测试，无需申请测试商户号

const sandboxConfig = {
  // 沙箱环境API地址
  apiUrl: 'https://api.mch.weixin.qq.com',
  
  // 沙箱环境配置
  appId: 'wx7a3e29b82bad702d',  // 您的小程序AppID
  mchId: '1900000109',          // 沙箱商户号（固定值）
  apiKey: '8934e7d15453e97507ef794cf7b0519d',  // 沙箱API密钥（固定值）
  
  // 通知地址（需要替换为您的云函数地址）
  notifyUrl: 'https://your-env.tcloudbaseapp.com/payment-notify',
  
  // 沙箱环境标识
  isSandbox: true,
  
  // 沙箱环境特殊配置
  sandboxPath: '/sandboxnew/pay/unifiedorder',  // 沙箱统一下单路径
  normalPath: '/pay/unifiedorder',              // 正式环境统一下单路径
  
  // 沙箱密钥获取路径
  sandboxKeyPath: '/sandboxnew/pay/getsignkey'
};

module.exports = sandboxConfig; 