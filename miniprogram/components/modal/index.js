Component({
  properties: {
    hidden: { type: Boolean, value: true },
    title: { type: String, value: '' },
    showCancel: { type: Boolean, value: true }
  },
  methods: {
    onConfirm() {
      this.triggerEvent('confirm')
    },
    onCancel() {
      this.triggerEvent('cancel')
    }
  }
}) 