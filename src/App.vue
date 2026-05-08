<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const endpoint = ref('https://platform.xiaomimimo.com/api/v1/chat/completions')
const apiKey = ref('')
const model = ref('mimo-chat-v2.5')
const messages = ref([
  { role: 'assistant', content: t('chat.welcome') }
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

// 监听语言变化，保存到 localStorage
watch(locale, (newLocale) => {
  localStorage.setItem('omni-locale', newLocale)
  document.documentElement.setAttribute('lang', newLocale)
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
  // 只有真正的 Anthropic 官方 API 才使用 Anthropic 协议
  // DeepSeek 等第三方即使提供 /v1/messages 端点，也可能使用 OpenAI 协议
  return endpoint.value.includes('anthropic.com') || endpoint.value.includes('api.anthropic.com')
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
      return textContent ? textContent.text : t('chat.noContent')
    }
    return t('chat.noContent')
  } else {
    // OpenAI 响应格式: { choices: [{ message: { content: "..." } }] }
    return data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : t('chat.noContent')
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
        messages.value[messages.value.length - 1].content = t('chat.apiKeyMissing')
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
      console.error('API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        endpoint: endpoint.value,
        headers: headers,
        requestBody: requestBody,
        responseText: errorText
      })
      throw new Error(t('error.apiError', { status: response.status, detail: errorText }))
    }

    const data = await response.json()
    messages.value[messages.value.length - 1].content = parseResponse(data)
  } catch (error) {
    messages.value[messages.value.length - 1].content = t('error.requestFailed', { message: error.message })
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 左侧面板：配置 + 品牌 -->
    <aside class="sidebar glass-panel">
      <!-- 品牌区 -->
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="brand-text">
          <h1 class="brand-name">Omni AI</h1>
          <p class="brand-tagline">{{ t('brand.tagline') }}</p>
        </div>
      </div>

      <div class="sidebar-divider"></div>

      <!-- 配置区 -->
      <div class="config-section">
        <h3 class="section-label">{{ t('config.title') }}</h3>
        <div class="input-group">
          <label>{{ t('config.endpoint') }}</label>
          <input v-model="endpoint" type="text" :placeholder="t('config.endpointPlaceholder')" />
        </div>
        <div class="input-group">
          <label>{{ t('config.apiKey') }}</label>
          <input v-model="apiKey" type="password" :placeholder="t('config.apiKeyPlaceholder')" />
        </div>
        <div class="input-group">
          <label>{{ t('config.modelId') }}</label>
          <input v-model="model" type="text" :placeholder="t('config.modelPlaceholder')" />
        </div>
      </div>

      <!-- 快速预设 -->
      <div class="presets">
        <h3 class="section-label">{{ t('presets.title') }}</h3>
        <div class="preset-grid">
          <button class="preset-btn" @click="endpoint='https://platform.xiaomimimo.com/api/v1/chat/completions'; model='mimo-chat-v2.5'">MiMo</button>
          <button class="preset-btn" @click="endpoint='https://api.openai.com/v1/chat/completions'; model='gpt-4o'">OpenAI</button>
          <button class="preset-btn" @click="endpoint='https://api.deepseek.com/chat/completions'; model='deepseek-chat'">DeepSeek</button>
          <button class="preset-btn" @click="endpoint='https://api.anthropic.com/v1/messages'; model='claude-3-5-sonnet-20241022'">Claude</button>
        </div>
      </div>

      <div class="sidebar-spacer"></div>

      <!-- 主题切换 -->
      <div class="theme-section">
        <div class="theme-switcher">
          <button
            :class="['theme-btn', { active: theme === 'light' }]"
            @click="theme = 'light'"
            :title="t('theme.light')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
            </svg>
          </button>
          <button
            :class="['theme-btn', { active: theme === 'dark' }]"
            @click="theme = 'dark'"
            :title="t('theme.dark')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
          <button
            :class="['theme-btn', { active: theme === 'auto' }]"
            @click="theme = 'auto'"
            :title="t('theme.auto')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 3a9 9 0 0 1 0 18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 语言切换 -->
      <div class="lang-section">
        <div class="lang-switcher">
          <button
            :class="['lang-btn', { active: locale === 'zh' }]"
            @click="locale = 'zh'"
          >中文</button>
          <button
            :class="['lang-btn', { active: locale === 'en' }]"
            @click="locale = 'en'"
          >EN</button>
        </div>
      </div>
    </aside>

    <!-- 右侧：聊天区域 -->
    <main class="chat-area glass-panel">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="chat-header-left">
          <span class="header-dot"></span>
          <span class="header-title">{{ t('chat.title') }}</span>
        </div>
        <span class="header-model">{{ model }}</span>
      </div>

      <div class="chat-divider"></div>

      <!-- 消息列表 -->
      <div class="messages">
        <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
          <div class="message-avatar">
            <template v-if="msg.role === 'assistant'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </template>
            <template v-else>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </template>
          </div>
          <div class="message-body">
            <span class="message-role">{{ msg.role === 'user' ? t('chat.you') : t('chat.assistant') }}</span>
            <div class="message-content">{{ msg.content }}<span class="cursor" v-if="isGenerating && index === messages.length - 1"></span></div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <div class="input-wrapper">
          <input
            v-model="inputMessage"
            @keyup.enter="sendMessage"
            type="text"
            :placeholder="t('chat.inputPlaceholder')"
            :disabled="isGenerating"
          />
          <button class="send-btn" @click="sendMessage" :disabled="isGenerating || !inputMessage.trim()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ============================================
   整体布局
   ============================================ */
.app-container {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 1.5rem;
}

/* ============================================
   侧边栏
   ============================================ */
.sidebar {
  width: 300px;
  padding: 2rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.sidebar-spacer {
  flex: 1;
}

.sidebar-divider {
  height: 1px;
  background: var(--divider);
  margin: 0.25rem 0;
}

/* 品牌 */
.brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: var(--shadow-accent);
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-family: var(--serif-font);
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.brand-tagline {
  font-size: 0.7rem;
  color: var(--text-secondary);
  letter-spacing: 1.2px;
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 2px;
}

/* 配置区 */
.section-label {
  font-family: var(--serif-font);
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--accent-color);
  letter-spacing: 2px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.input-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.input-group label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

input {
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  color: var(--text-primary);
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.85rem;
  outline: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

input:hover:not(:focus) {
  border-color: rgba(200, 150, 90, 0.3);
}

[data-theme="light"] input:hover:not(:focus) {
  border-color: rgba(176, 125, 66, 0.25);
}

/* 预设按钮 */
.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.preset-btn {
  background: var(--accent-light);
  border: 1.5px solid var(--panel-border);
  color: var(--text-primary);
  padding: 0.55rem 0.8rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.preset-btn:hover {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.preset-btn:active {
  transform: translateY(0);
}

/* 主题切换 */
.theme-section {
  padding-top: 0.5rem;
}

.theme-switcher {
  display: flex;
  gap: 0.35rem;
  background: var(--input-bg);
  padding: 0.35rem;
  border-radius: 10px;
  border: 1.5px solid var(--input-border);
}

.theme-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-btn svg {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-btn:hover:not(.active) {
  color: var(--text-primary);
  background: var(--accent-light);
}

.theme-btn:hover:not(.active) svg {
  transform: rotate(15deg);
}

.theme-btn.active {
  background: var(--accent-color);
  color: white;
  box-shadow: var(--shadow-accent);
}

.theme-btn:active {
  transform: scale(0.95);
}

/* 语言切换 */
.lang-section {
  padding-top: 0.5rem;
}

.lang-switcher {
  display: flex;
  gap: 0.35rem;
  background: var(--input-bg);
  padding: 0.35rem;
  border-radius: 10px;
  border: 1.5px solid var(--input-border);
}

.lang-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
}

.lang-btn:hover:not(.active) {
  color: var(--text-primary);
  background: var(--accent-light);
}

.lang-btn.active {
  background: var(--accent-color);
  color: white;
  box-shadow: var(--shadow-accent);
}

.lang-btn:active {
  transform: scale(0.95);
}

/* ============================================
   聊天区域
   ============================================ */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  position: relative;
  overflow: hidden;
}

/* 聊天头部 */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  flex-shrink: 0;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.header-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.4);
}

.header-title {
  font-family: var(--serif-font);
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.header-model {
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: var(--accent-light);
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.chat-divider {
  height: 1px;
  background: var(--divider);
  flex-shrink: 0;
}

/* 消息列表 */
.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
}

.message {
  display: flex;
  gap: 0.85rem;
  max-width: 90%;
  animation: fadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
  animation: slideInFromRight 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.message.assistant {
  animation: slideInFromLeft 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.message.user .message-avatar {
  background: var(--accent-gradient);
  color: white;
  box-shadow: var(--shadow-accent);
}

.message.assistant .message-avatar {
  background: var(--accent-light);
  color: var(--accent-color);
  border: 1px solid var(--panel-border);
}

.message-body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.message-role {
  font-size: 0.68rem;
  color: var(--text-secondary);
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding-left: 0.1rem;
}

.message.user .message-role {
  text-align: right;
  padding-right: 0.1rem;
  padding-left: 0;
}

.message-content {
  background: var(--ai-msg-bg);
  padding: 0.9rem 1.2rem;
  border-radius: 4px 14px 14px 14px;
  border: 1px solid var(--panel-border);
  font-size: 0.9rem;
  line-height: 1.7;
  text-wrap: pretty;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-primary);
}

.message.user .message-content {
  background: var(--user-msg-bg);
  border-color: rgba(200, 150, 90, 0.2);
  border-radius: 14px 4px 14px 14px;
}

.message.user .message-content {
  background: var(--user-msg-bg);
  border-color: rgba(200, 150, 90, 0.2);
}

.message:hover .message-content {
  box-shadow: var(--shadow-md);
}

/* 光标 */
.cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  background: var(--accent-color);
  margin-left: 3px;
  animation: pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  border-radius: 1px;
  vertical-align: middle;
}

/* 输入区 */
.input-area {
  padding: 1.25rem 2rem 1.5rem;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 14px;
  padding: 0.35rem 0.35rem 0.35rem 1rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-wrapper:focus-within {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

.input-wrapper input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.65rem 0;
  font-size: 0.9rem;
  border-radius: 0;
}

.input-wrapper input:focus {
  box-shadow: none;
  border: none;
}

.send-btn {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--accent-gradient);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-accent);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(200, 150, 90, 0.3);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.95);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
