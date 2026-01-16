const {
  getToday,
  loadDay,
  getWeekSummary,
  listRecentDays
} = require('../../utils/storage')
const { generateWeeklyReport } = require('../../utils/ai')

Page({
  data: {
    date: '',
    days: [],
    totals: {
      minutes: 0,
      interrupts: 0,
      completion: '0/0'
    },
    week: null,
    aiComment: '',
    loadingAi: false
  },

  onShow() {
    // 默认显示今天，或上次选择的日期？
    // 每次进入重置为今天比较好，或者保留
    if (!this.data.date) {
      this.setData({
        date: getToday()
      })
    }
    this.refresh()
  },

  refresh() {
    const { date } = this.data
    const days = listRecentDays(14)
    this.setData({ days })
    
    const record = loadDay(date)
    const week = getWeekSummary(date)
    
    let minutes = 0
    let interrupts = 0
    let completed = 0
    let total = 0
    let detailedTasks = []
    
    if (record) {
      total = record.tasks.length
      // 构建详细任务列表
      detailedTasks = record.tasks.map(task => {
        const progress = record.progress[task.id] || { actualMinutes: 0, interruptions: 0, completed: false }
        
        minutes += progress.actualMinutes
        interrupts += progress.interruptions
        if (progress.completed) completed += 1

        return {
          ...task,
          ...progress
        }
      })
    }
    
    this.setData({
      week,
      detailedTasks, // 新增：任务明细
      totals: {
        minutes,
        interrupts,
        completion: `${completed}/${total}`
      }
    })
  },

  getAiComment() {
    if (this.data.loadingAi) return
    if (!this.data.week) {
       wx.showToast({ title: '暂无周报数据', icon: 'none' })
       return
    }
    
    this.setData({ loadingAi: true })
    generateWeeklyReport(this.data.week)
      .then(comment => {
        if (!comment) {
            throw new Error('AI 返回内容为空')
        }
        this.setData({ aiComment: comment })
      })
      .catch(err => {
        console.error('AI Report Error:', err)
        wx.showToast({ 
            title: err.message.includes('AI') ? 'AI 服务繁忙' : '生成失败，请重试', 
            icon: 'none' 
        })
      })
      .finally(() => {
        this.setData({ loadingAi: false })
      })
  },

  changeDate(e) {
    const { date } = e.currentTarget.dataset
    this.setData({ date }, () => {
      this.refresh()
    })
  }
})
