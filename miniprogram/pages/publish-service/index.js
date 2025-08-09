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
    categories: [
      { id: 'repair', name: '水电维修', icon: '/images/category-repair.png' },
      { id: 'cleaning', name: '家政保洁', icon: '/images/category-cleaning.png' },
      { id: 'moving', name: '搬家服务', icon: '/images/category-moving.png' },
      { id: 'decoration', name: '装修装饰', icon: '/images/category-decoration.png' },
      { id: 'other', name: '其他服务', icon: '/images/category-other.png' }
    ],
    tags: [
      { id: 'professional', name: '专业', selected: false },
      { id: 'experienced', name: '经验丰富', selected: false },
      { id: 'quick', name: '快速响应', selected: false },
      { id: 'reliable', name: '可靠', selected: false },
      { id: 'affordable', name: '价格实惠', selected: false },
      { id: 'quality', name: '品质保证', selected: false }
    ]
  },

  onLoad: function(options) {
    this.setData({
      serviceType: options.type || 'life-service'
    })
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
    
    if (!formData.price) {
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
      price: parseFloat(this.data.formData.price),
      images: this.data.formData.images,
      contactInfo: this.data.formData.contactInfo,
      location: this.data.formData.location,
      tags: this.data.formData.tags
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