// publish-service/index.js
const app = getApp()

Page({
  data: {
    serviceType: '',
    selectedCategory: '',
    submitting: false,
    loading: false,
    formData: {
      title: '',
      description: '',
      price: '',
      priceUnit: '次',
      images: [],
      contactInfo: {
        phone: '',
        wechat: ''
      },
      location: {
        latitude: '',
        longitude: '',
        address: ''
      },
      tags: []
    },
    // 根据服务类型动态显示不同的分类
    categoryConfig: {
      'life-service': {
        title: '生活服务',
        categories: [
          { id: 'repair', name: '水电维修', icon: '/images/category-repair.png' },
          { id: 'cleaning', name: '家政保洁', icon: '/images/category-cleaning.png' },
          { id: 'moving', name: '搬家服务', icon: '/images/category-moving.png' },
          { id: 'decoration', name: '装修装饰', icon: '/images/category-decoration.png' },
          { id: 'errand', name: '跑腿代办', icon: '/images/category-errand.png' },
          { id: 'other', name: '其他服务', icon: '/images/category-other.png' }
        ]
      },
      'pet-service': {
        title: '宠物服务',
        categories: [
          { id: 'boarding', name: '寄养', icon: '/images/pet-boarding.png' },
          { id: 'walking', name: '遛狗', icon: '/images/pet-walking.png' },
          { id: 'grooming', name: '洗护', icon: '/images/pet-grooming.png' },
          { id: 'training', name: '训练', icon: '/images/pet-training.png' },
          { id: 'medical', name: '医疗', icon: '/images/pet-medical.png' },
          { id: 'other', name: '其他', icon: '/images/pet-other.png' }
        ]
      },
      'second-hand': {
        title: '二手交易',
        categories: [
          { id: 'electronics', name: '电子产品', icon: '/images/category-electronics.png' },
          { id: 'furniture', name: '家具', icon: '/images/category-furniture.png' },
          { id: 'clothing', name: '服装', icon: '/images/category-clothing.png' },
          { id: 'books', name: '图书', icon: '/images/category-books.png' },
          { id: 'sports', name: '运动用品', icon: '/images/category-sports.png' },
          { id: 'other', name: '其他', icon: '/images/category-other.png' }
        ]
      },
      'neighbor-help': {
        title: '邻里互助',
        categories: [
          { id: 'care', name: '照顾老人', icon: '/images/help-care.png' },
          { id: 'delivery', name: '快递代收', icon: '/images/help-delivery.png' },
          { id: 'education', name: '教育辅导', icon: '/images/help-education.png' },
          { id: 'repair', name: '维修帮助', icon: '/images/help-repair.png' },
          { id: 'tools', name: '工具借用', icon: '/images/help-tools.png' },
          { id: 'other', name: '其他帮助', icon: '/images/help-other.png' }
        ]
      }
    },
    // 根据服务类型显示不同的标签
    tagConfig: {
      'life-service': [
        { id: 'professional', name: '专业', selected: false },
        { id: 'experienced', name: '经验丰富', selected: false },
        { id: 'quick', name: '快速响应', selected: false },
        { id: 'reliable', name: '可靠', selected: false },
        { id: 'affordable', name: '价格实惠', selected: false },
        { id: 'quality', name: '品质保证', selected: false }
      ],
      'pet-service': [
        { id: 'loving', name: '有爱心', selected: false },
        { id: 'experienced', name: '经验丰富', selected: false },
        { id: 'professional', name: '专业', selected: false },
        { id: 'patient', name: '有耐心', selected: false },
        { id: 'safe', name: '安全可靠', selected: false },
        { id: 'affordable', name: '价格实惠', selected: false }
      ],
      'second-hand': [
        { id: 'new', name: '九成新', selected: false },
        { id: 'good', name: '八成新', selected: false },
        { id: 'normal', name: '七成新', selected: false },
        { id: 'cheap', name: '价格实惠', selected: false },
        { id: 'quality', name: '品质保证', selected: false },
        { id: 'urgent', name: '急售', selected: false }
      ],
      'neighbor-help': [
        { id: 'free', name: '免费', selected: false },
        { id: 'experienced', name: '经验丰富', selected: false },
        { id: 'reliable', name: '可靠', selected: false },
        { id: 'quick', name: '快速响应', selected: false },
        { id: 'patient', name: '有耐心', selected: false },
        { id: 'friendly', name: '友善', selected: false }
      ]
    },
    // 价格单位配置
    priceUnitConfig: {
      'life-service': ['次', '小时', '天', '月', '年'],
      'pet-service': ['次', '小时', '天', '月'],
      'second-hand': ['件', '套', '个'],
      'neighbor-help': ['次', '小时', '免费']
    }
  },

  onLoad: function(options) {
    this.setData({ loading: true })
    
    const serviceType = options.type || 'life-service'
    this.setData({
      serviceType: serviceType,
      categories: this.data.categoryConfig[serviceType]?.categories || [],
      tags: this.data.tagConfig[serviceType] || [],
      priceUnits: this.data.priceUnitConfig[serviceType] || ['次']
    })
    
    // 延迟关闭加载状态，确保数据渲染完成
    setTimeout(() => {
      this.setData({ loading: false })
    }, 500)
  },

  // 选择服务类型
  selectCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id
    this.setData({
      selectedCategory: categoryId
    })
  },

  // 输入框变化
  onInputChange: function(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 联系方式变化
  onContactChange: function(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`formData.contactInfo.${field}`]: value
    })
  },

  // 选择价格单位
  onPriceUnitChange: function(e) {
    const unit = e.detail.value
    const priceUnits = this.data.priceUnits
    
    // 如果选择的是"免费"，自动设置价格为0
    if (priceUnits[unit] === '免费') {
      this.setData({
        'formData.priceUnit': '免费',
        'formData.price': '0'
      })
    } else {
      this.setData({
        'formData.priceUnit': priceUnits[unit]
      })
    }
  },

  // 选择图片
  chooseImage: function() {
    wx.chooseImage({
      count: 9 - this.data.formData.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFilePaths)
      }
    })
  },

  // 上传图片
  uploadImages: function(tempFilePaths) {
    wx.showLoading({
      title: '上传中...'
    })

    const uploadPromises = tempFilePaths.map(filePath => {
      return wx.cloud.uploadFile({
        cloudPath: `services/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
        filePath: filePath
      })
    })

    Promise.all(uploadPromises).then(results => {
      const newImages = results.map(result => result.fileID)
      this.setData({
        'formData.images': [...this.data.formData.images, ...newImages]
      })
      wx.hideLoading()
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      })
    }).catch(err => {
      console.error('上传图片失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
    })
  },

  // 删除图片
  deleteImage: function(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.formData.images
    images.splice(index, 1)
    this.setData({
      'formData.images': images
    })
  },

  // 选择地址
  chooseLocation: function() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'formData.location': {
            latitude: res.latitude,
            longitude: res.longitude,
            address: res.address
          }
        })
      },
      fail: (err) => {
        console.error('选择地址失败:', err)
        wx.showToast({
          title: '选择地址失败',
          icon: 'none'
        })
      }
    })
  },

  // 切换标签
  toggleTag: function(e) {
    const tagId = e.currentTarget.dataset.id
    const tags = this.data.tags.map(tag => {
      if (tag.id === tagId) {
        tag.selected = !tag.selected
      }
      return tag
    })
    
    const selectedTags = tags.filter(tag => tag.selected).map(tag => tag.name)
    
    this.setData({
      tags: tags,
      'formData.tags': selectedTags
    })
  },

  // 表单验证
  validateForm: function() {
    const formData = this.data.formData
    
    if (!this.data.selectedCategory) {
      wx.showToast({
        title: '请选择服务类型',
        icon: 'none'
      })
      return false
    }
    
    if (!formData.title.trim()) {
      wx.showToast({
        title: '请输入服务标题',
        icon: 'none'
      })
      return false
    }
    
    if (!formData.description.trim()) {
      wx.showToast({
        title: '请输入服务描述',
        icon: 'none'
      })
      return false
    }
    
    // 邻里互助可以是免费的
    if (this.data.serviceType !== 'neighbor-help' && !formData.price) {
      wx.showToast({
        title: '请输入服务价格',
        icon: 'none'
      })
      return false
    }
    
    if (!formData.contactInfo.phone && !formData.contactInfo.wechat) {
      wx.showToast({
        title: '请至少填写一种联系方式',
        icon: 'none'
      })
      return false
    }
    
    if (!formData.location.address) {
      wx.showToast({
        title: '请选择服务地址',
        icon: 'none'
      })
      return false
    }
    
    return true
  },

  // 提交表单
  submitForm: function(e) {
    if (!this.validateForm()) {
      return
    }

    this.setData({ submitting: true })

    const serviceData = {
      type: this.data.serviceType,
      category: this.data.selectedCategory,
      title: this.data.formData.title,
      description: this.data.formData.description,
      price: this.data.serviceType === 'neighbor-help' && !this.data.formData.price ? 0 : parseFloat(this.data.formData.price),
      priceUnit: this.data.formData.priceUnit,
      images: this.data.formData.images,
      contactInfo: this.data.formData.contactInfo,
      location: this.data.formData.location,
      tags: this.data.formData.tags,
      status: '待审核'
    }

    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'create',
        serviceData: serviceData
      }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({
          title: '已提交，待审核',
          icon: 'success'
        })
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.message || '发布失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('发布服务失败:', err)
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ submitting: false })
    })
  }
}) 