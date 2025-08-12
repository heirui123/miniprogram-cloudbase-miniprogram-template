const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: 'cloud1-2g899deedcc43a17'
});

// 测试真实支付配置
async function testRealPayment() {
  console.log('🧪 开始测试真实微信支付配置...\n');
  
  try {
    // 测试订单查询
    console.log('📋 测试订单查询功能...');
    const queryResult = await cloud.callFunction({
      name: 'payment',
      data: {
        action: 'queryOrder',
        outTradeNo: 'TEST_' + Date.now(),
        useRealConfig: true
      }
    });
    
    console.log('✅ 订单查询结果:', JSON.stringify(queryResult.result, null, 2));
    
    // 测试统一下单
    console.log('\n💰 测试统一下单功能...');
    const orderResult = await cloud.callFunction({
      name: 'payment',
      data: {
        action: 'unifiedOrder',
        orderInfo: {
          outTradeNo: 'TEST_' + Date.now(),
          totalFee: 1, // 1分钱测试
          body: '测试商品',
          openid: 'test_openid'
        },
        useRealConfig: true
      }
    });
    
    console.log('✅ 统一下单结果:', JSON.stringify(orderResult.result, null, 2));
    
    console.log('\n🎉 真实支付配置测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testRealPayment(); 