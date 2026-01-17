const {
  getToday,
  ensureDay,
  setTasks,
  getStreak
} = require('../../utils/storage')
const { analyzeImage, breakDownTask, analyzeText } = require('../../utils/ai')

Page({
  data: {
    name: '',
    minutes: '15',
    tasks: [],
    canAdd: false,
    streak: 0,
    isAnalyzing: false,
    totalMinutes: 0,
    breakingDownId: null, // 正在拆解的任务ID
    showImportModal: false,
    importText: '',
    motivationalQuote: '凡是过往，皆为序章' // 默认激励语
  },
  
  onLoad() {
    this.rotateQuotes()
  },

  rotateQuotes() {
    const quotes = [
      "AI 正在为您拆解目标...",
      "种一棵树最好的时间是十年前，其次是现在。",
      "流水不争先，争的是滔滔不绝。",
      "行百里者半九十。",
      "大模型正在思考最佳方案...",
      "每一个不曾起舞的日子，都是对生命的辜负。"
    ]
    let i = 0
    setInterval(() => {
      if (this.data.isAnalyzing) {
        this.setData({ motivationalQuote: quotes[i % quotes.length] })
        i++
      }
    }, 2000)
  },
  
  onTaskNameChange(e) {
    const { id } = e.currentTarget.dataset
    const val = e.detail.value.trim()
    if (!val) return
    
    const tasks = this.data.tasks.map(t => {
      if (t.id === id) return { ...t, name: val }
      return t
    })
    this.updateTasks(tasks)
  },

  onTaskTimeChange(e) {
    const { id } = e.currentTarget.dataset
    let val = parseInt(e.detail.value)
    if (isNaN(val) || val < 1) val = 15
    
    const tasks = this.data.tasks.map(t => {
      if (t.id === id) return { ...t, expectedMinutes: val }
      return t
    })
    this.updateTasks(tasks)
  },

  checkCanAdd() {
    const { name } = this.data
    this.setData({
      canAdd: name.trim().length > 0
    })
  },

  addTask() {
    if (!this.data.canAdd) return
    const {
      name,
      tasks
    } = this.data
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newItem = {
      id,
      name: name.trim(),
      expectedMinutes: 15, // 默认 15 分钟
      order: tasks.length
    }
    const nextTasks = [...tasks, newItem]
    this.updateTasks(nextTasks)
    this.setData({
      name: ''
    })
    this.checkCanAdd()
  },
  showSmartImport() {
    this.setData({ showImportModal: true, importText: '' })
  },
  
  hideSmartImport() {
    this.setData({ showImportModal: false })
  },
  
  onImportInput(e) {
    this.setData({ importText: e.detail.value })
  },
  
  pasteFromClipboard() {
    wx.getClipboardData({
      success: (res) => {
        const text = res.data
        if (text) {
          this.setData({ importText: text })
          wx.showToast({ title: '已粘贴', icon: 'success' })
        }
      }
    })
  },
  
  confirmImport() {
    if (!this.data.importText.trim()) return
    
    this.setData({ isAnalyzing: true })
    wx.showLoading({ title: 'AI 分析文本...' })
    
    this.processTextAI(this.data.importText)
  },

  onShow() {
    console.log('Setup Page onShow')
    const today = getToday()
    const record = ensureDay(today)
    console.log('Loaded record:', record)
    
    // 按 order 排序
    const sorted = [...record.tasks].sort((a, b) => a.order - b.order)
    this.setData({
      tasks: sorted,
      streak: getStreak()
    }, () => {
      console.log('Data set complete', this.data.tasks)
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
    if (this.data.isAnalyzing) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.processImage(tempFilePath)
      },
      fail: (err) => {
        // 用户取消选择不报错
        if (err.errMsg.indexOf('cancel') === -1) {
            console.error(err)
            this.showError('选择图片失败')
        }
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

  importFromClipboard() {
    if (this.data.isAnalyzing) return
    wx.getClipboardData({
      success: (res) => {
        const text = res.data
        if (!text || text.trim().length === 0) {
          wx.showToast({ title: '剪贴板为空', icon: 'none' })
          return
        }
        
        // 简单的预处理：去除多余空行
        const cleanText = text.replace(/\n\s*\n/g, '\n').trim()
        
        this.setData({ isAnalyzing: true })
        wx.showLoading({ title: 'AI 分析文本...' })
        
        // 复用 breakDownTask 的能力（或者使用 analyzeImage 的逻辑，这里我们假设 callAI 可以处理文本）
        // 实际上我们需要一个新的 analyzeText 接口，但为了简化，我们构造一个 prompt 调用 generic AI logic
        // 由于 ai.js 目前只有 analyzeImage (Vision) 和 breakDownTask (Chat)，
        // 我们可以复用 breakDownTask，但 prompt 需要改。
        // 为了方便，这里直接调用一个新的内部方法 processTextAI
        
        this.processTextAI(cleanText)
      }
    })
  },

  processTextAI(text) {
    analyzeText(text)
      .then(results => {
        if (results && results.length > 0) {
           const newTasks = results.map((item, index) => ({
              id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
              name: item.name || '未命名作业',
              expectedMinutes: parseInt(item.minutes) || 15,
              completed: false,
              order: this.data.tasks.length + index
            }))
            
            const updatedTasks = [...this.data.tasks, ...newTasks]
            this.updateTasks(updatedTasks)
            
            // 成功后关闭弹窗
            this.hideSmartImport()
            
            wx.showModal({
              title: '文本导入成功',
              content: `已从文本中提取 ${results.length} 项任务`,
              showCancel: false
            })
        } else {
          this.showError('未识别到有效任务')
        }
      })
      .catch(err => {
        console.error(err)
        this.showError('分析失败')
      })
      .finally(() => {
        wx.hideLoading()
        this.setData({ isAnalyzing: false })
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
    const { name } = this.data
    this.setData({
      canAdd: name.trim().length > 0
    })
  },

  addTask() {
    if (!this.data.canAdd) return
    const {
      name,
      tasks
    } = this.data
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newItem = {
      id,
      name: name.trim(),
      expectedMinutes: 15, // 默认 15 分钟
      order: tasks.length
    }
    const nextTasks = [...tasks, newItem]
    this.updateTasks(nextTasks)
    this.setData({
      name: ''
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

  breakTask(e) {
    const { id, name } = e.currentTarget.dataset
    if (this.data.breakingDownId) return

    this.setData({ breakingDownId: id })
    wx.showLoading({ title: 'AI 思考中...' })

    breakDownTask(name)
      .then(steps => {
        // 找到原任务位置
        const idx = this.data.tasks.findIndex(t => t.id === id)
        if (idx === -1) return

        // 移除原任务，插入子步骤
        const originTask = this.data.tasks[idx]
        const subTasks = steps.map((step, i) => ({
          id: `${originTask.id}-sub-${i}`,
          name: step,
          expectedMinutes: Math.ceil(originTask.expectedMinutes / steps.length) || 10,
          completed: false,
          order: idx + i // 暂时占位，updateTasks 会重排
        }))

        const newTasks = [...this.data.tasks]
        newTasks.splice(idx, 1, ...subTasks)
        
        this.updateTasks(newTasks)
        wx.showToast({ title: '拆解成功', icon: 'success' })
      })
      .catch(err => {
        console.error(err)
        wx.showToast({ title: '拆解失败', icon: 'none' })
      })
      .finally(() => {
        wx.hideLoading()
        this.setData({ breakingDownId: null })
      })
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
