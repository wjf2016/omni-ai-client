export default {
  brand: {
    name: 'Omni AI',
    tagline: '智能对话'
  },
  config: {
    title: '配置',
    endpoint: 'API 端点',
    apiKey: 'API 密钥',
    modelId: '模型 ID',
    endpointPlaceholder: 'https://api.openai.com/v1/chat/completions',
    apiKeyPlaceholder: 'sk-...',
    modelPlaceholder: 'gpt-4o'
  },
  presets: {
    title: '快速预设'
  },
  theme: {
    light: '浅色模式',
    dark: '深色模式',
    auto: '跟随系统'
  },
  chat: {
    title: '对话',
    you: '你',
    assistant: 'Omni AI',
    inputPlaceholder: '输入你的消息...',
    welcome: '你好！我是 Omni AI Client，请先配置 API 设置开始对话。',
    apiKeyMissing: '请在配置中设置你的 API Key。',
    noContent: '无内容'
  },
  error: {
    apiError: 'API 错误: {status} - {detail}',
    requestFailed: '请求失败: {message}'
  }
}
