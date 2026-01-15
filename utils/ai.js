// 硅基流动 API 配置
// ⚠️ 警告：在小程序端直接存储 API Key 极不安全，容易泄露。
// 生产环境务必将此逻辑迁移至云函数或后端服务器。
const API_KEY = 'sk-mrwgdylfopdzxffiazdbaovbzdipkviumjqkzhewqiwvkyjp' // 请替换为您的真实 Key
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions'
const MODEL = 'Qwen/Qwen3-VL-32B-Thinking' // 使用完整模型 ID

function analyzeImage(base64Image) {
  return new Promise((resolve, reject) => {
    if (!API_KEY || API_KEY.startsWith('sk-xxxx')) {
      reject(new Error('请配置有效的 SiliconFlow API Key'))
      return
    }

expectedMinutes: parseInt(item.minutes) || 15
const prompt = `
你是一个智能作业助手。请分析这张图片（可能是老师发的作业截图或手写作业），提取出所有需要完成的任务。
请返回一个 JSON 数组格式的结果，不要包含任何 Markdown 标记或额外文本。
格式要求：
[
  {
    "name": "任务名称（简短，不超过20字）",
    "minutes": 30 (根据任务量预估完成分钟数，整数，5-120之间)
  }
]
如果图片中没有明显的作业内容，请返回空数组 []。
    `

    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 512
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.choices && res.data.choices.length > 0) {
          const content = res.data.choices[0].message.content
          try {
            // 尝试清理可能存在的 Markdown 代码块标记
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim()
            let result = JSON.parse(cleanContent)
            // 确保返回的是数组
            if (!Array.isArray(result)) {
              result = result ? [result] : []
            }
            resolve(result)
          } catch (e) {
            console.error('AI 解析失败', content)
            reject(new Error('无法识别作业内容，请重试'))
          }
        } else {
          console.error('API Error', res)
          // 打印更详细的错误信息
          if (res.data && res.data.error) {
             console.error('Error Details:', res.data.error)
          }
          const errorMsg = (res.data && res.data.error && res.data.error.message) || res.statusCode
          reject(new Error('AI 服务暂时不可用: ' + errorMsg))
        }
      },
      fail: (err) => {
        console.error('Request Fail', err)
        reject(new Error('网络请求失败'))
      }
    })
  })
}

module.exports = {
  analyzeImage
}
