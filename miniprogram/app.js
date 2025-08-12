// app.js
App({
  onLaunch: function() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-2g899deedcc43a17', // 已替换为云开发环境 ID  
        traceUser: true,
      });
    }

    // 获取用户信息
    this.getUserInfo();
    
    // 获取位置信息
    this.getLocation();
  },

  // 获取用户信息
  getUserInfo: function() {
    return new Promise((resolve, reject) => {
      // 如果已经有用户信息，直接返回
      if (this.globalData.userInfo) {
        resolve(this.globalData.userInfo);
        return;
      }

      // 调用云函数获取用户信息
      wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'getUserInfo'
        }
      }).then(res => {
        if (res.result.success) {
          this.globalData.userInfo = res.result.data;
          resolve(res.result.data);
        } else {
          reject(new Error('获取用户信息失败'));
        }
      }).catch(err => {
        reject(err);
      });
    });
  },

  // 获取位置信息
  getLocation: function() {
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        this.globalData.location = {
          latitude: res.latitude,
          longitude: res.longitude
        };
        // 逆地理编码获取地址
        this.getAddress(res.latitude, res.longitude);
      },
      fail: err => {
        console.log('获取位置失败', err);
      }
    });
  },

  // 逆地理编码
  getAddress: function(latitude, longitude) {
    wx.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=YOUR_MAP_KEY`,
      success: res => {
        if (res.data.status === 0) {
          this.globalData.address = res.data.result.address;
        }
      }
    });
  },

  // 检查登录状态
  checkLogin: function() {
    return new Promise((resolve, reject) => {
      if (this.globalData.userInfo) {
        resolve(this.globalData.userInfo);
      } else {
        // 调用云函数获取用户信息
        wx.cloud.callFunction({
          name: 'auth',
          data: {
            action: 'getUserInfo'
          }
        }).then(res => {
          if (res.result.success) {
            this.globalData.userInfo = res.result.data;
            resolve(res.result.data);
          } else {
            reject(new Error('获取用户信息失败'));
          }
        }).catch(err => {
          reject(err);
        });
      }
    });
  },
  
  globalData: {
    userInfo: null,
    location: null,
    address: null,
    // 温馨社区风格主题色
    theme: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      accent: '#45B7D1',
      warning: '#FFA07A',
      success: '#98D8C8',
      text: '#2C3E50',
      textLight: '#7F8C8D',
      background: '#F8F9FA',
      card: '#FFFFFF'
    }
  }
}); 