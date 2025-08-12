// 微信支付测试配置
// 使用测试数据，仅用于功能验证

const testConfig = {
  // 正式环境API地址
  apiUrl: 'https://api.mch.weixin.qq.com',
  
  // 测试配置（使用示例数据）
  appId: 'wx7a3e29b82bad702d',  // 您的小程序AppID
  mchId: '1234567890',          // 测试商户号
  apiKey: 'test_api_key_123456789',  // 测试API密钥
  
  // 通知地址（测试环境）
  notifyUrl: 'https://test-env.tcloudbaseapp.com/payment-notify',
  
  // 正式环境标识
  isSandbox: false,
  
  // 正式环境API路径
  sandboxPath: '/sandboxnew/pay/unifiedorder',  // 沙箱统一下单路径（正式环境不使用）
  normalPath: '/pay/unifiedorder',              // 正式环境统一下单路径
  
  // 沙箱密钥获取路径（正式环境不使用）
  sandboxKeyPath: '/sandboxnew/pay/getsignkey'
};

module.exports = testConfig; 