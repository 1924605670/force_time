const {
  getToday,
  ensureDay,
  updateProgress
} = require('../../utils/storage')

Page({
  data: {
    tasks: [],
    currentIndex: 0,
    currentTask: null,
    isFocusing: false,
    seconds: 0,
    interruptions: 0,
    focusMinutes: 0,
    completedCount: 0,
    totalCount: 0
  },

  timer: null,
  canvas: null,
  ctx: null,
  dpr: 1,

  onShow() {
    this.loadData()
    wx.setKeepScreenOn({ keepScreenOn: true })
    this.initCanvas()
  },

  onHide() {
    if (this.data.isFocusing) {
      this.addInterruption()
    }
    this.stopTimer()
  },

  onUnload() {
    this.stopTimer()
  },

  loadData() {
    const today = getToday()
    const record = ensureDay(today)
    const sorted = [...record.tasks].sort((a, b) => a.order - b.order)
    
    let completedCount = 0
    let firstUnfinishedIdx = 0
    let found = false
    
    sorted.forEach((t, idx) => {
      if (record.progress[t.id] && record.progress[t.id].completed) {
        completedCount++
      } else if (!found) {
        firstUnfinishedIdx = idx
        found = true
      }
    })

    if (!this.data.isFocusing) {
       if (completedCount === sorted.length && sorted.length > 0) {
           this.setData({
               tasks: sorted,
               totalCount: sorted.length,
               completedCount,
               currentTask: null
           })
           return
       }
       
       this.setData({
         tasks: sorted,
         totalCount: sorted.length,
         completedCount,
         currentIndex: found ? firstUnfinishedIdx : 0,
         currentTask: sorted[found ? firstUnfinishedIdx : 0] || null
       })
       // 如果有任务，重绘初始状态
       if (this.data.currentTask) {
         this.drawProgress(0)
       }
    }
  },

  initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#progressCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')

        const dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)

        this.canvas = canvas
        this.ctx = ctx
        this.dpr = dpr

        // 初始化绘制
        this.drawProgress(this.data.seconds / 60 / (this.data.currentTask ? this.data.currentTask.expectedMinutes : 30))
      })
  },

  drawProgress(percent) {
    if (!this.ctx || !this.canvas) return
    const { width, height } = this.canvas
    // 由于 scale 了 dpr，这里计算坐标时用逻辑像素
    const w = width / this.dpr
    const h = height / this.dpr
    const x = w / 2
    const y = h / 2
    const r = w / 2 - 10 // 留边距

    const ctx = this.ctx
    ctx.clearRect(0, 0, w, h)

    // 底圆
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.lineWidth = 12
    ctx.strokeStyle = '#eee'
    ctx.lineCap = 'round'
    ctx.stroke()

    // 进度圆
    // 角度：-90度开始
    const startAngle = -0.5 * Math.PI
    const endAngle = startAngle + (2 * Math.PI * percent)

    ctx.beginPath()
    ctx.arc(x, y, r, startAngle, endAngle)
    ctx.lineWidth = 12
    // 渐变色
    const gradient = ctx.createLinearGradient(0, 0, w, 0)
    gradient.addColorStop(0, '#4facfe')
    gradient.addColorStop(1, '#00f2fe')
    ctx.strokeStyle = gradient
    ctx.lineCap = 'round'
    ctx.stroke()
  },

  startTimer() {
    if (this.timer) return // 防止重复启动
    
    let lastTime = Date.now()
    
    const tick = () => {
      if (!this.data.isFocusing) return
      
      const now = Date.now()
      if (now - lastTime >= 1000) {
        const nextSeconds = this.data.seconds + 1
        this.setData({
          seconds: nextSeconds,
          focusMinutes: Math.floor(nextSeconds / 60)
        })
        
        // 更新进度条
        const totalMin = this.data.currentTask ? this.data.currentTask.expectedMinutes : 30
        const percent = nextSeconds / (totalMin * 60)
        this.drawProgress(Math.min(percent, 1))
        
        this.persistProgress()
        lastTime = now
      }
      
      this.timer = this.canvas.requestAnimationFrame(tick)
    }
    
    this.timer = this.canvas.requestAnimationFrame(tick)
  },

  stopTimer() {
    if (this.timer) {
      this.canvas.cancelAnimationFrame(this.timer)
      this.timer = null
    }
  },

  toggleFocus() {
    const nextFocusing = !this.data.isFocusing
    this.setData({
      isFocusing: nextFocusing
    })

    if (nextFocusing) {
      this.startTimer()
    } else {
      this.stopTimer()
      this.addInterruption()
    }
  },

  addInterruption() {
    const newVal = this.data.interruptions + 1
    this.setData({
      interruptions: newVal
    })
    this.persistProgress()
  },

  persistProgress() {
    const { currentTask, focusMinutes, interruptions } = this.data
    if (!currentTask) return
    updateProgress(getToday(), currentTask.id, p => ({
      ...p,
      actualMinutes: focusMinutes,
      interruptions: interruptions
    }))
  },

  completeCurrent() {
    const { currentTask } = this.data
    if (!currentTask) return
    updateProgress(getToday(), currentTask.id, p => ({
      ...p,
      completed: true
    }))
    
    this.setData({
      isFocusing: false,
      completedCount: this.data.completedCount + 1
    })
    this.stopTimer()
    
    wx.showModal({
      title: '🎉 恭喜完成',
      content: '是否进入下一项挑战？',
      cancelText: '休息一下',
      confirmText: '继续挑战',
      success: (res) => {
        if (res.confirm) {
          this.nextTask()
        } else {
          this.goToReport()
        }
      }
    })
  },

  nextTask() {
    const nextIdx = this.data.currentIndex + 1
    if (nextIdx >= this.data.tasks.length) {
      this.setData({
        currentTask: null
      })
      return
    }
    
    this.setData({
      currentIndex: nextIdx,
      currentTask: this.data.tasks[nextIdx],
      seconds: 0,
      focusMinutes: 0,
      interruptions: 0,
      isFocusing: false
    })
    this.stopTimer()
    this.drawProgress(0) // 重置进度条
  },

  goToReport() {
    wx.switchTab({
      url: '/pages/report/index'
    })
  }
})
