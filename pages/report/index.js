const {
  getToday,
  loadDay,
  getWeekSummary,
  listRecentDays
} = require('../../utils/storage')

Page({
  data: {
    date: '',
    days: [],
    totals: {
      minutes: 0,
      interrupts: 0,
      completion: '0/0'
    },
    week: null
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
    // 日期只显示 MM-DD ? 
    // 为了简单，暂时显示 YYYY-MM-DD
    
    this.setData({ days })
    
    const record = loadDay(date)
    const week = getWeekSummary(date)
    
    let minutes = 0
    let interrupts = 0
    let completed = 0
    let total = 0
    
    if (record) {
      total = record.tasks.length
      Object.values(record.progress).forEach(p => {
        minutes += p.actualMinutes
        interrupts += p.interruptions
        if (p.completed) completed += 1
      })
    }
    
    this.setData({
      week,
      totals: {
        minutes,
        interrupts,
        completion: `${completed}/${total}`
      }
    })
  },

  changeDate(e) {
    const { date } = e.currentTarget.dataset
    this.setData({ date }, () => {
      this.refresh()
    })
  }
})
