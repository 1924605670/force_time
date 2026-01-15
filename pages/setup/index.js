const {
  getToday,
  ensureDay,
  setTasks,
  getStreak
} = require('../../utils/storage')
const { analyzeImage } = require('../../utils/ai')

Page({
  data: {
    name: '',
    minutes: '15',
    tasks: [],
    canAdd: false,
    streak: 0,
    isAnalyzing: false,
    totalMinutes: 0
  },

  onShow() {
    const today = getToday()
    const record = ensureDay(today)
    // 按 order 排序
    const sorted = [...record.tasks].sort((a, b) => a.order - b.order)
    this.setData({
      tasks: sorted,
      streak: getStreak()
    })
    this.calculateTotalTime()
    this.checkCanAdd()
  },

  onNameInput(e) {
    this.setData({
      name: e.detail.value
    })
    this.checkCanAdd()
  },

  onMinutesInput(e) {
    this.setData({
      minutes: e.detail.value
    })
    this.checkCanAdd()
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.processImage(tempFilePath)
      }
    })
  },

  processImage(path) {
    this.setData({ isAnalyzing: true })
    
    // 1. 压缩图片 (限制 1024px，质量 60)
    wx.compressImage({
      src: path,
      quality: 60,
      success: (res) => {
        const compressedPath = res.tempFilePath
        // 2. 转 Base64
        wx.getFileSystemManager().readFile({
          filePath: compressedPath,
          encoding: 'base64',
          success: (data) => {
            const base64 = data.data
            // 3. 调用 AI 分析
            this.callAI(base64)
          },
          fail: (err) => {
            console.error(err)
            this.showError('图片读取失败')
            this.setData({ isAnalyzing: false })
          }
        })
      },
      fail: (err) => {
        console.error(err)
        this.showError('图片压缩失败')
        this.setData({ isAnalyzing: false })
      }
    })
  },

  callAI(base64) {
    analyzeImage(base64)
      .then(results => {
        if (results && results.length > 0) {
          if (results.length === 1) {
            // 单条任务，填入输入框供用户修改
            const task = results[0]
            this.setData({
              name: task.name || this.data.name,
              minutes: task.minutes ? String(task.minutes) : this.data.minutes
            })
            this.checkCanAdd()
            wx.showToast({ title: '识别成功', icon: 'success' })
          } else {
            // 多条任务，直接批量添加
            const newTasks = results.map((item, index) => ({
              id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
              name: item.name || '未命名作业',
              expectedMinutes: parseInt(item.minutes) || 15,
              completed: false,
              order: this.data.tasks.length + index
            }))
            
            const updatedTasks = [...this.data.tasks, ...newTasks]
            this.updateTasks(updatedTasks)
            
            wx.showModal({
              title: '批量导入成功',
              content: `已自动添加 ${results.length} 项作业任务`,
              showCancel: false
            })
          }
        } else {
          this.showError('未识别到有效作业')
        }
      })
      .catch(err => {
        console.error(err)
        this.showError(err.message || '识别失败')
      })
      .finally(() => {
        this.setData({ isAnalyzing: false })
      })
  },

  showError(msg) {
    wx.showToast({ title: msg, icon: 'none' })
  },

  checkCanAdd() {
    const {
      name,
      minutes
    } = this.data
    const m = Number(minutes)
    const valid = name.trim().length > 0 && Number.isInteger(m) && m >= 5 && m <= 120
    this.setData({
      canAdd: valid
    })
  },

  addTask() {
    if (!this.data.canAdd) return
    const {
      name,
      minutes,
      tasks
    } = this.data
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newItem = {
      id,
      name: name.trim(),
      expectedMinutes: Number(minutes),
      order: tasks.length
    }
    const nextTasks = [...tasks, newItem]
    this.updateTasks(nextTasks)
    this.setData({
      name: '',
      minutes: '15'
    })
    this.checkCanAdd()
  },

  removeTask(e) {
    const {
      id
    } = e.currentTarget.dataset
    const nextTasks = this.data.tasks.filter(t => t.id !== id)
    this.updateTasks(nextTasks)
  },

  moveUp(e) {
    const {
      index
    } = e.currentTarget.dataset
    if (index <= 0) return
    const tasks = [...this.data.tasks]
    const temp = tasks[index]
    tasks[index] = tasks[index - 1]
    tasks[index - 1] = temp
    this.updateTasks(tasks)
  },

  moveDown(e) {
    const {
      index
    } = e.currentTarget.dataset
    if (index >= this.data.tasks.length - 1) return
    const tasks = [...this.data.tasks]
    const temp = tasks[index]
    tasks[index] = tasks[index + 1]
    tasks[index + 1] = temp
    this.updateTasks(tasks)
  },

  updateTasks(newTasks) {
    const withOrder = newTasks.map((t, idx) => ({ ...t,
      order: idx
    }))
    this.setData({
      tasks: withOrder
    })
    setTasks(getToday(), withOrder)
    this.calculateTotalTime()
  },

  calculateTotalTime() {
    const total = this.data.tasks.reduce((sum, task) => sum + (task.expectedMinutes || 0), 0)
    this.setData({
      totalMinutes: total
    })
  },

  startFocus() {
    wx.switchTab({
      url: '/pages/focus/index'
    })
  }
})
