const DAY_KEY_PREFIX = 'day:'
const STREAK_KEY = 'streak_count'
const LAST_STREAK_DATE = 'last_streak_date'

function todayKey(date) {
  return `${DAY_KEY_PREFIX}${date}`
}

function formatDate(d = new Date()) {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getToday() {
  return formatDate()
}

function loadDay(date) {
  try {
    const raw = wx.getStorageSync(todayKey(date))
    if (!raw) return null
    return raw
  } catch (e) {
    return null
  }
}

function saveDay(record) {
  try {
    wx.setStorageSync(todayKey(record.date), record)
  } catch (e) {
    console.error('Save failed', e)
  }
}

function ensureDay(date) {
  const existing = loadDay(date)
  if (existing) return existing
  const empty = {
    date,
    tasks: [],
    progress: {}
  }
  saveDay(empty)
  return empty
}

function setTasks(date, tasks) {
  const record = ensureDay(date)
  const next = { ...record,
    tasks
  }
  const progress = { ...record.progress
  }
  tasks.forEach(t => {
    if (!progress[t.id]) {
      progress[t.id] = {
        taskId: t.id,
        actualMinutes: 0,
        interruptions: 0,
        completed: false,
      }
    }
  })
  next.progress = progress
  saveDay(next)
  return next
}

function updateProgress(date, taskId, updater) {
  const record = ensureDay(date)
  const base = record.progress[taskId] || {
    taskId,
    actualMinutes: 0,
    interruptions: 0,
    completed: false,
  }
  const nextP = updater(base)
  const next = { ...record,
    progress: { ...record.progress,
      [taskId]: nextP
    }
  }
  saveDay(next)
  
  // 更新 Streak 逻辑
  // 只要当天有任务被标记完成，且之前没记过，就检查 Streak
  if (nextP.completed) {
      updateStreak(date)
  }
  
  return next
}

function updateStreak(dateStr) {
    const lastDate = wx.getStorageSync(LAST_STREAK_DATE)
    if (lastDate === dateStr) return // 今天已经记过了
    
    let currentStreak = wx.getStorageSync(STREAK_KEY) || 0
    
    // 检查是否是连续的
    // 如果 lastDate 是昨天，Streak + 1
    // 如果 lastDate 是空（第一次），Streak = 1
    // 否则 Streak = 1
    
    const today = new Date(dateStr)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayStr = formatDate(yesterday)
    
    if (lastDate === yesterdayStr) {
        currentStreak += 1
    } else {
        currentStreak = 1 // 断签或第一次
    }
    
    wx.setStorageSync(STREAK_KEY, currentStreak)
    wx.setStorageSync(LAST_STREAK_DATE, dateStr)
}

function getStreak() {
    // 获取当前 Streak
    // 如果 lastDate 不是今天也不是昨天，说明断了，虽然还没被重置（只有完成任务时才写），
    // 但显示的时候应该显示 0 或者保留记录？
    // 通常显示规则：如果昨天没打卡，今天也没打卡，那 Streak 实际上已经断了。
    // 但为了鼓励，我们可以显示“已连续 N 天”，直到今天结束都没打卡才归零？
    // 简单策略：读取存储的值。在显示层判断如果 lastDate < 昨天，则显示 0（或者显示“已断签”）
    
    const lastDate = wx.getStorageSync(LAST_STREAK_DATE)
    const streak = wx.getStorageSync(STREAK_KEY) || 0
    
    if (!lastDate) return 0
    
    const today = new Date()
    const todayStr = formatDate(today)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayStr = formatDate(yesterday)
    
    if (lastDate === todayStr || lastDate === yesterdayStr) {
        return streak
    }
    
    return 0 // 超过一天没打卡，归零
}

function getWeekRangeFor(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  const weekday = base.getDay() === 0 ? 7 : base.getDay()
  const start = new Date(base)
  start.setDate(base.getDate() - (weekday - 1))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const days = []
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start)
    cur.setDate(start.getDate() + i)
    days.push(formatDate(cur))
  }
  return {
    start: formatDate(start),
    end: formatDate(end),
    days
  }
}

function getWeekSummary(date) {
  const {
    start,
    end,
    days
  } = getWeekRangeFor(date)
  let totalFocus = 0
  let totalInterrupts = 0
  let dayCount = 0
  for (const day of days) {
    const record = loadDay(day)
    if (!record) continue
    let focus = 0
    let interrupts = 0
    Object.values(record.progress).forEach(p => {
      focus += p.actualMinutes
      interrupts += p.interruptions
    })
    totalFocus += focus
    totalInterrupts += interrupts
    dayCount += 1
  }
  return {
    startDate: start,
    endDate: end,
    averageFocusMinutes: dayCount ? Math.round(totalFocus / dayCount) : 0,
    averageInterruptions: dayCount ? Math.round(totalInterrupts / dayCount) : 0,
  }
}

function listRecentDays(limit = 14) {
  const days = []
  const now = new Date()
  for (let i = 0; i < limit; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    days.push(formatDate(d))
  }
  return days
}

module.exports = {
  getToday,
  ensureDay,
  setTasks,
  updateProgress,
  getWeekSummary,
  listRecentDays,
  loadDay,
  getStreak
}
