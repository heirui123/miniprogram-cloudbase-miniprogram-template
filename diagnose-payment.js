// 支付配置诊断脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 支付配置诊断开始...\n');

// 检查小程序配置
const appJsonPath = path.join(__dirname, 'miniprogram/app.json');
if (fs.existsSync(appJsonPath)) {
  console.log('✅ 小程序配置文件存在');
} else {
  console.log('❌ 小程序配置文件不存在');
}

// 检查云函数配置
const paymentConfigPath = path.join(__dirname, 'cloudfunctions/payment/production-config.js');
if (fs.existsSync(paymentConfigPath)) {
  console.log('✅ 支付云函数配置文件存在');
  
  // 读取配置内容
  const configContent = fs.readFileSync(paymentConfigPath, 'utf8');
  
  // 提取关键信息
  const appIdMatch = configContent.match(/appId:\s*['"`]([^'"`]+)['"`]/);
  const mchIdMatch = configContent.match(/mchId:\s*['"`]([^'"`]+)['"`]/);
  
  if (appIdMatch) {
    console.log(`📱 小程序AppID: ${appIdMatch[1]}`);
  }
  
  if (mchIdMatch) {
    console.log(`💰 商户号: ${mchIdMatch[1]}`);
  }
} else {
  console.log('❌ 支付云函数配置文件不存在');
}

console.log('\n🔧 常见问题排查：');
console.log('1. 确认小程序已开通微信支付功能');
console.log('2. 确认商户号已正确配置');
console.log('3. 确认小程序AppID与商户号匹配');
console.log('4. 确认API密钥正确');
console.log('5. 确认云函数已正确部署');

console.log('\n📋 解决步骤：');
console.log('1. 登录微信商户平台 (pay.weixin.qq.com)');
console.log('2. 检查商户号状态和权限');
console.log('3. 确认小程序已绑定到商户号');
console.log('4. 检查API密钥是否正确');
console.log('5. 重新部署云函数');

console.log('\n🔗 相关链接：');
console.log('- 微信商户平台: https://pay.weixin.qq.com');
console.log('- 小程序后台: https://mp.weixin.qq.com');
console.log('- 云开发控制台: https://console.cloud.tencent.com/tcb'); 