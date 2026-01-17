// 硅基流动 API 配置
// ⚠️ 警告：在小程序端直接存储 API Key 极不安全，容易泄露。
// 生产环境务必将此逻辑迁移至云函数或后端服务器。
const API_KEY = 'sk-mrwgdylfopdzxffiazdbaovbzdipkviumjqkzhewqiwvkyjp' // 请替换为您的真实 Key
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions'
const MODEL_VISION = 'deepseek-ai/DeepSeek-OCR' // OCR 专用模型 (DeepSeek-OCR)
const MODEL_TEXT = 'Pro/zai-org/GLM-4.7' // 文本分析模型 (Pro/zai-org/GLM-4.7)

// 通用请求函数，支持自定义 model 和 endpoint
function callSiliconFlow(model, messages) {
  return new Promise((resolve, reject) => {
    if (!API_KEY || API_KEY.startsWith('sk-xxxx')) {
      reject(new Error('请配置有效的 SiliconFlow API Key'))
      return
    }

    console.log('[AI] Calling model:', model)
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048, // 增加 token 限制以支持长文本
        stream: false
      },
      timeout: 60000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.choices && res.data.choices.length > 0) {
          console.log('[AI] Success')
          resolve(res.data.choices[0].message.content)
        } else {
          console.error('[AI] API Error', res)
          const errorMsg = (res.data && res.data.error && res.data.error.message) || res.statusCode
          reject(new Error('AI 服务暂时不可用: ' + errorMsg))
        }
      },
      fail: (err) => {
        console.error('[AI] Request Fail', err)
        reject(new Error('网络请求失败'))
      }
    })
  })
}

function analyzeText(text) {
  const prompt = `
你是一个智能作业助手。请分析以下文本（可能是OCR提取的作业内容或老师发的通知），提取出所有需要完成的任务。
请返回一个 JSON 数组格式的结果，不要包含任何 Markdown 标记或额外文本。
格式要求：
[
  {
    "name": "任务名称（简短，不超过20字）",
    "minutes": 30 (根据任务量预估完成分钟数，整数，5-120之间)
  }
]
如果文本中没有明显的作业内容，请返回空数组 []。
文本内容：
${text}
  `
  return callSiliconFlow(MODEL_TEXT, [{ role: "user", content: prompt }])
    .then(content => {
      // 增强鲁棒性：尝试提取 JSON 数组部分
      let clean = content.replace(/```json/g, '').replace(/```/g, '').trim()
      
      const firstBracket = clean.indexOf('[')
      const lastBracket = clean.lastIndexOf(']')
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        clean = clean.substring(firstBracket, lastBracket + 1)
      }

      try {
        let result = JSON.parse(clean)
        if (!Array.isArray(result)) {
          result = result ? [result] : []
        }
        return result
      } catch (e) {
        console.error('JSON Parse Error', e)
        return []
      }
    })
}

function analyzeImage(base64Image) {
  // 第一步：调用 OCR 提取文字
  return callSiliconFlow(MODEL_VISION, [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
      ]
    }
  ])
  .then(ocrText => {
    console.log('OCR Result:', ocrText)
    // 第二步：将 OCR 结果传给 GLM-4.7 进行语义分析
    return analyzeText(ocrText)
  })
  .catch(err => {
    console.error('Image Analysis Failed:', err)
    throw new Error('图片识别失败: ' + err.message)
  })
}

function breakDownTask(taskName) {
  const prompt = `
你是一个专业的学习规划师。请将任务“${taskName}”拆解为3-5个具体的执行步骤。
请返回 JSON 数组格式，不包含 Markdown 标记。
格式：["步骤1", "步骤2", "步骤3"]
  `
  return callSiliconFlow(MODEL_TEXT, [{ role: "user", content: prompt }])
    .then(content => {
      let clean = content.replace(/```json/g, '').replace(/```/g, '').trim()
      
      const firstBracket = clean.indexOf('[')
      const lastBracket = clean.lastIndexOf(']')
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        clean = clean.substring(firstBracket, lastBracket + 1)
      }
      
      try {
        return JSON.parse(clean)
      } catch (e) {
        console.error('Breakdown Parse Error', e)
        return []
      }
    })
}

function generateWeeklyReport(weekData) {
  const prompt = `
你是一个温暖的教育专家。根据以下孩子的本周学习数据，生成一段简短的周报点评（100字以内）。
请多用鼓励的语气，指出亮点，并委婉提出一个改进建议。
数据：
${JSON.stringify(weekData)}
  `
  return callSiliconFlow(MODEL_TEXT, [{ role: "user", content: prompt }])
}

module.exports = {
  analyzeImage,
  breakDownTask,
  generateWeeklyReport,
  analyzeText
}
