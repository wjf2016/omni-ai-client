<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const endpoint = ref('https://platform.xiaomimimo.com/api/v1/chat/completions')
const apiKey = ref('')
const model = ref('mimo-chat-v2.5')
const messages = ref([
  { role: 'assistant', content: 'Hello! I am Omni AI Client. Please configure your API settings to start chatting.' }
])
const inputMessage = ref('')
const isGenerating = ref(false)

// 主题管理
const theme = ref('auto') // 'light' | 'dark' | 'auto'

// 获取系统主题偏好
const getSystemTheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 计算实际应用的主题
const appliedTheme = computed(() => {
  if (theme.value === 'auto') {
    return getSystemTheme()
  }
  return theme.value
})

// 应用主题到 DOM
const applyTheme = (themeValue) => {
  document.documentElement.setAttribute('data-theme', themeValue)
}

// 监听主题变化
watch(appliedTheme, (newTheme) => {
  applyTheme(newTheme)
  localStorage.setItem('omni-theme', theme.value)
})

// 监听系统主题变化
onMounted(() => {
  // 从 localStorage 恢复主题设置
  const savedTheme = localStorage.getItem('omni-theme')
  if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
    theme.value = savedTheme
  }

  // 初始应用主题
  applyTheme(appliedTheme.value)

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemThemeChange = () => {
    if (theme.value === 'auto') {
      applyTheme(getSystemTheme())
    }
  }
  mediaQuery.addEventListener('change', handleSystemThemeChange)
})

// 检测是否为 Anthropic API
const isAnthropicAPI = computed(() => {
  return endpoint.value.includes('anthropic.com') || endpoint.value.includes('/v1/messages')
})

// 构建请求体
const buildRequestBody = (conversationMessages) => {
  if (isAnthropicAPI.value) {
    // Anthropic 协议
    return {
      model: model.value,
      max_tokens: 4096,
      messages: conversationMessages.map(m => ({
        role: m.role,
        content: m.content
      }))
    }
  } else {
    // OpenAI 协议
    return {
      model: model.value,
      messages: conversationMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream: false
    }
  }
}

// 构建请求头
const buildHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  }

  if (isAnthropicAPI.value) {
    headers['x-api-key'] = apiKey.value
    headers['anthropic-version'] = '2023-06-01'
  } else {
    headers['Authorization'] = `Bearer ${apiKey.value}`
  }

  return headers
}

// 解析响应内容
const parseResponse = (data) => {
  if (isAnthropicAPI.value) {
    // Anthropic 响应格式: { content: [{ type: "text", text: "..." }] }
    if (data.content && data.content.length > 0) {
      const textContent = data.content.find(c => c.type === 'text')
      return textContent ? textContent.text : 'No content'
    }
    return 'No content'
  } else {
    // OpenAI 响应格式: { choices: [{ message: { content: "..." } }] }
    return data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : 'No content'
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isGenerating.value) return

  const userText = inputMessage.value
  messages.value.push({ role: 'user', content: userText })
  inputMessage.value = ''
  isGenerating.value = true

  try {
    messages.value.push({ role: 'assistant', content: '' })

    if (!apiKey.value) {
      setTimeout(() => {
        messages.value[messages.value.length - 1].content = 'Please set your API Key in the configuration.'
        isGenerating.value = false
      }, 500)
      return
    }

    const conversationMessages = messages.value.slice(0, -1)
    const requestBody = buildRequestBody(conversationMessages)
    const headers = buildHeaders()

    const response = await fetch(endpoint.value, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    messages.value[messages.value.length - 1].content = parseResponse(data)
  } catch (error) {
    messages.value[messages.value.length - 1].content = `Error: ${error.message}`
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="app-container">
    <aside class="sidebar glass-panel">
      <div class="brand">
        <h2>Omni AI</h2>
        <span class="badge">v1.0</span>
      </div>
      
      <div class="config-section">
        <h3>Configuration</h3>
        <div class="input-group">
          <label>API Endpoint</label>
          <input v-model="endpoint" type="text" placeholder="https://api.openai.com/v1/chat/completions" />
        </div>
        <div class="input-group">
          <label>API Key</label>
          <input v-model="apiKey" type="password" placeholder="sk-..." />
        </div>
        <div class="input-group">
          <label>Model ID</label>
          <input v-model="model" type="text" placeholder="gpt-4o" />
        </div>
      </div>
      
      <div class="presets">
        <h4>Quick Presets</h4>
        <button @click="endpoint='https://platform.xiaomimimo.com/api/v1/chat/completions'; model='mimo-chat-v2.5'">Xiaomi MiMo</button>
        <button @click="endpoint='https://api.openai.com/v1/chat/completions'; model='gpt-4o'">OpenAI</button>
        <button @click="endpoint='https://api.anthropic.com/v1/messages'; model='claude-3-5-sonnet-20241022'">Anthropic Claude</button>
      </div>

      <div class="theme-section">
        <h4>主题</h4>
        <div class="theme-switcher">
          <button
            :class="['theme-btn', { active: theme === 'light' }]"
            @click="theme = 'light'"
            title="白天模式"
          >
            ☀️
          </button>
          <button
            :class="['theme-btn', { active: theme === 'dark' }]"
            @click="theme = 'dark'"
            title="夜间模式"
          >
            🌙
          </button>
          <button
            :class="['theme-btn', { active: theme === 'auto' }]"
            @click="theme = 'auto'"
            title="自动模式"
          >
            🔄
          </button>
        </div>
      </div>
    </aside>

    <main class="chat-area glass-panel">
      <div class="messages">
        <div v-for="(msg, index) in messages" :key="index" :class="['message-bubble', msg.role]">
          <div class="avatar">{{ msg.role === 'user' ? 'U' : 'AI' }}</div>
          <div class="content">{{ msg.content }}<span class="cursor" v-if="isGenerating && index === messages.length - 1"></span></div>
        </div>
      </div>
      
      <div class="input-area">
        <input 
          v-model="inputMessage" 
          @keyup.enter="sendMessage"
          type="text" 
          placeholder="Message Omni AI..." 
          :disabled="isGenerating"
        />
        <button @click="sendMessage" :disabled="isGenerating || !inputMessage.trim()">
          Send
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 1.8rem;
}

.sidebar {
  width: 320px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.brand h2 {
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: -0.8px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.badge {
  background: var(--user-msg-bg);
  color: var(--accent-color);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.config-section h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 1.5px;
  margin-bottom: 1.2rem;
  font-weight: 700;
}

.input-group {
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.input-group label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
  letter-spacing: 0.3px;
}

input {
  background: var(--input-bg);
  border: 1.5px solid var(--panel-border);
  color: var(--text-primary);
  padding: 0.9rem 1.1rem;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

input:hover:not(:focus) {
  border-color: rgba(59, 130, 246, 0.3);
}

.presets h4 {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.presets button {
  background: transparent;
  border: 1.5px solid var(--panel-border);
  color: var(--text-primary);
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  cursor: pointer;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.presets button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--accent-gradient);
  opacity: 0;
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}

.presets button:hover {
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.presets button:hover::before {
  opacity: 0.1;
}

.presets button:active {
  transform: translateY(0);
}

.theme-section {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--panel-border);
}

.theme-section h4 {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.theme-switcher {
  display: flex;
  gap: 0.4rem;
  background: var(--input-bg);
  padding: 0.4rem;
  border-radius: 10px;
  border: 1.5px solid var(--panel-border);
}

.theme-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  padding: 0.7rem;
  border-radius: 7px;
  cursor: pointer;
  font-size: 1.3rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.theme-btn:hover:not(.active) {
  background: var(--panel-border);
  transform: scale(1.05);
}

.theme-btn.active {
  background: #3b82f6;
  box-shadow: var(--shadow-accent);
  transform: scale(1.08);
}

.theme-btn:active {
  transform: scale(0.95);
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  position: relative;
}

.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
  padding-right: 1rem;
  margin-bottom: 1.5rem;
}

.message-bubble {
  display: flex;
  gap: 1rem;
  max-width: 85%;
  animation: fadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.message-bubble.user {
  align-self: flex-end;
  flex-direction: row-reverse;
  animation: slideInFromRight 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.message-bubble.assistant {
  animation: slideInFromLeft 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--panel-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-bubble.user .avatar {
  background: var(--accent-gradient);
  color: white;
  box-shadow: var(--shadow-accent);
}

.message-bubble.assistant .avatar {
  background: #3b82f6;
  color: white;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.content {
  background: var(--ai-msg-bg);
  padding: 1.1rem 1.4rem;
  border-radius: 18px;
  border: 1.5px solid var(--panel-border);
  font-size: 0.95rem;
  line-height: 1.7;
  text-wrap: pretty;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.content::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  padding: 1.5px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.5;
}

.message-bubble.user .content {
  background: var(--user-msg-bg);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
}

.message-bubble:hover .content {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: var(--accent-gradient);
  margin-left: 4px;
  animation: pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  border-radius: 1px;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.input-area {
  display: flex;
  gap: 0.8rem;
  align-items: stretch;
}

.input-area input {
  flex: 1;
  padding: 1.1rem 1.5rem;
  border-radius: 14px;
  font-size: 0.95rem;
}

.input-area input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.input-area button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0 2rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-accent);
  letter-spacing: 0.3px;
  position: relative;
  overflow: hidden;
}

.input-area button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.input-area button:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 24px rgba(59, 130, 246, 0.4);
}

.input-area button:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.input-area button:active:not(:disabled)::before {
  width: 300px;
  height: 300px;
}

.input-area button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
