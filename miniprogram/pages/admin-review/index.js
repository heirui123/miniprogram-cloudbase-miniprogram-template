// pages/admin-review/index.js
Page({
  data: {
    loading: false,
    pendingList: [],
    page: 1,
    hasMore: true,
    showRejectModal: false,
    currentRejectId: '',
    rejectReason: ''
  },

  onLoad: function() {
    this.loadPending(true)
  },

  onPullDownRefresh: function() {
    this.loadPending(true)
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPending(false)
    }
  },

  loadPending: function(reset) {
    if (reset) {
      this.setData({ page: 1, hasMore: true })
    }
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'getPendingServices',
        query: { page: this.data.page, limit: 10 }
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const list = (res.result.data || []).map(item => ({
          ...item,
          createTimeText: this.formatTime(item.createTime)
        }))
        this.setData({
          pendingList: reset ? list : [...this.data.pendingList, ...list],
          hasMore: list.length === 10,
          page: this.data.page + 1
        })
      } else {
        wx.showToast({ title: res.result?.message || '获取失败', icon: 'none' })
      }
    }).catch(err => {
      console.error('getPendingServices error', err)
      wx.showToast({ title: '获取失败', icon: 'none' })
    }).finally(() => {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    })
  },

  approveService: function(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认通过',
      content: '通过后将对外展示该服务',
      success: (res) => {
        if (res.confirm) {
          this.submitReview(id, 'approve')
        }
      }
    })
  },

  rejectService: function(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ showRejectModal: true, currentRejectId: id, rejectReason: '' })
  },

  onRejectReasonInput: function(e) {
    this.setData({ rejectReason: e.detail.value })
  },

  cancelReject: function() {
    this.setData({ showRejectModal: false, currentRejectId: '', rejectReason: '' })
  },

  confirmReject: function() {
    if (!this.data.rejectReason.trim()) {
      wx.showToast({ title: '请填写拒绝原因', icon: 'none' })
      return
    }
    this.submitReview(this.data.currentRejectId, 'reject', this.data.rejectReason)
  },

  submitReview: function(serviceId, decision, reason) {
    wx.showLoading({ title: '提交中...' })
    wx.cloud.callFunction({
      name: 'service',
      data: {
        action: 'reviewService',
        serviceId: serviceId,
        serviceData: { decision, reason }
      }
    }).then(res => {
      if (res.result && res.result.success) {
        wx.showToast({ title: '操作成功', icon: 'success' })
        this.setData({ showRejectModal: false, currentRejectId: '', rejectReason: '' })
        // 从列表移除该项
        this.setData({
          pendingList: this.data.pendingList.filter(item => item._id !== serviceId)
        })
      } else {
        wx.showToast({ title: res.result?.message || '提交失败', icon: 'none' })
      }
    }).catch(err => {
      console.error('reviewService error', err)
      wx.showToast({ title: '提交失败', icon: 'none' })
    }).finally(() => {
      wx.hideLoading()
    })
  },

  formatTime: function(date) {
    const d = new Date(date)
    const y = d.getFullYear()
    const m = `${d.getMonth() + 1}`.padStart(2, '0')
    const day = `${d.getDate()}`.padStart(2, '0')
    const hh = `${d.getHours()}`.padStart(2, '0')
    const mm = `${d.getMinutes()}`.padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm}`
  }
}) 