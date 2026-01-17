const app = getApp();

Page({
  data: {
    role: 'student', // student, parent, admin
    roles: [
      { id: 'student', name: '学生', icon: '🎓', desc: '提交作业，查看数据' },
      { id: 'parent', name: '家长', icon: '👨‍👩‍👧', desc: '查看报告，设置提醒' },
      { id: 'admin', name: '管理员', icon: '🛠', desc: '系统管理，数据维护' }
    ]
  },

  onShow() {
    const role = wx.getStorageSync('role') || 'student';
    this.setData({ role });
  },

  switchRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ role });
    wx.setStorageSync('role', role);
    wx.showToast({
      title: '身份已切换',
      icon: 'success'
    });
  },

  // Mock Admin Features
  exportData() {
    if (this.data.role !== 'admin') return;
    wx.showToast({ title: '数据导出中...', icon: 'loading' });
    setTimeout(() => {
      wx.showToast({ title: '已导出到本地', icon: 'success' });
    }, 1500);
  },
  
  clearStorage() {
    wx.showModal({
      title: '确认清除',
      content: '将清除所有本地数据（不含云端）',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.reLaunch({ url: '/pages/setup/index' });
        }
      }
    })
  }
});