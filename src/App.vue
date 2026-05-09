<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownRenderer from './components/MarkdownRenderer.vue'
import { initDB, saveConversation, getConversations, deleteConversation, saveSetting, getAllSettings } from './db.js'

const { t, locale } = useI18n()

// 会话管理
const conversations = ref([])
const currentConversationId = ref(null)

// 配置
const protocol = ref('anthropic') // 'openai' | 'anthropic'
const endpoint = ref('')
const apiKey = ref('')
const model = ref('')
const messages = ref([])
const inputMessage = ref('')
const isGenerating = ref(false)
const messagesRef = ref(null)
const inputRef = ref(null)
const abortController = ref(null)
const showConfigModal = ref(false)

// 按协议分组的预设
const presets = {
  openai: [
    { name: 'MiMo', endpoint: 'https://api.xiaomimimo.com/v1/chat/completions', model: 'mimo-v2.5-pro', apiKey: 'sk-c2s2ug1bh9zuuahavd9q7glnbqynmuqslgjzm9xbnbx3mu1a' },
    { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-pro' },
    { name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' }
  ],
  anthropic: [
    { name: 'MiMo', endpoint: 'https://api.xiaomimimo.com/anthropic/v1/messages', model: 'mimo-v2.5-pro', apiKey: 'sk-c2s2ug1bh9zuuahavd9q7glnbqynmuqslgjzm9xbnbx3mu1a' },
    { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/anthropic/v1/messages', model: 'deepseek-v4-pro' },
    { name: 'Claude', endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514' }
  ]
}

// 模型选项（按提供商分组）
const modelOptions = {
  MiMo: ['mimo-v2.5-pro', 'mimo-v2.5', 'mimo-v2-pro', 'mimo-v2-omni'],
  DeepSeek: ['deepseek-v4-pro', 'deepseek-v4-flash'],
  OpenAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  Claude: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022']
}

// 当前提供商名称
const currentProviderName = computed(() => {
  const currentPreset = presets[protocol.value].find(p => p.endpoint === endpoint.value)
  return currentPreset ? currentPreset.name : ''
})

// 当前提供商的模型选项
const currentModelOptions = computed(() => {
  return modelOptions[currentProviderName.value] || []
})

// 是否显示自定义输入（model 不在预设列表中）
const showCustomInput = computed(() => {
  if (currentModelOptions.value.length === 0) return true
  return !currentModelOptions.value.includes(model.value)
})

// 当前下拉框显示值
const selectValue = computed(() => {
  if (currentModelOptions.value.includes(model.value)) return model.value
  return '__custom__'
})

// 选择模型
const onModelSelect = (event) => {
  const val = event.target.value
  if (val === '__custom__') {
    model.value = ''
  } else {
    model.value = val
    localStorage.setItem('omni-model', val)
  }
}

// 自定义模型输入变更
const onCustomModelChange = (event) => {
  model.value = event.target.value
  localStorage.setItem('omni-model', event.target.value)
}

// 主题管理
const theme = ref('auto')

const getSystemTheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const appliedTheme = computed(() => {
  if (theme.value === 'auto') return getSystemTheme()
  return theme.value
})

const applyTheme = (themeValue) => {
  document.documentElement.setAttribute('data-theme', themeValue)
}

watch(appliedTheme, (newTheme) => {
  applyTheme(newTheme)
  localStorage.setItem('omni-theme', theme.value)
})

watch(locale, (newLocale) => {
  localStorage.setItem('omni-locale', newLocale)
  document.documentElement.setAttribute('lang', newLocale)
})

// 应用预设
const applyPreset = (preset) => {
  endpoint.value = preset.endpoint
  model.value = preset.model
  if (preset.apiKey) {
    apiKey.value = preset.apiKey
  }
  saveSettings()
}

// 保存配置到 IndexedDB
const saveSettings = async () => {
  await saveSetting('protocol', protocol.value)
  await saveSetting('endpoint', endpoint.value)
  await saveSetting('apiKey', apiKey.value)
  await saveSetting('model', model.value)
  await saveSetting('theme', theme.value)
  await saveSetting('locale', locale.value)
}

// 会话管理函数
const createNewConversation = () => {
  const newConv = {
    id: Date.now().toString(),
    title: t('conversations.untitled'),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  conversations.value.unshift(newConv)
  currentConversationId.value = newConv.id
  messages.value = [...newConv.messages]
  saveConversation(newConv)
}

const switchConversation = (id) => {
  if (isGenerating.value) return
  const conv = conversations.value.find(c => c.id === id)
  if (conv) {
    currentConversationId.value = id
    messages.value = [...conv.messages]
  }
}

const renameConversation = (id) => {
  const conv = conversations.value.find(c => c.id === id)
  if (conv) {
    // 显示完整标题用于编辑
    const currentTitle = conv.fullTitle || conv.title.replace(/\.\.\.$/, '')
    const newTitle = prompt(t('conversations.rename'), currentTitle)
    if (newTitle && newTitle.trim()) {
      const trimmedTitle = newTitle.trim()
      conv.fullTitle = trimmedTitle
      conv.title = trimmedTitle.slice(0, 30) + (trimmedTitle.length > 30 ? '...' : '')
      conv.updatedAt = Date.now()
      saveConversation(conv)
    }
  }
}

const deleteConversationById = async (id) => {
  if (!confirm(t('conversations.confirmDelete'))) return
  await deleteConversation(id)
  conversations.value = conversations.value.filter(c => c.id !== id)
  if (currentConversationId.value === id) {
    if (conversations.value.length > 0) {
      switchConversation(conversations.value[0].id)
    } else {
      createNewConversation()
    }
  }
}

// 保存当前会话
const saveCurrentConversation = async () => {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (conv) {
    // 创建纯对象副本，避免保存响应式对象
    const plainConv = {
      id: conv.id,
      title: conv.title,
      fullTitle: conv.fullTitle,
      messages: JSON.parse(JSON.stringify(messages.value)),
      createdAt: conv.createdAt,
      updatedAt: Date.now()
    }

    // 更新内存中的会话
    conv.messages = messages.value
    conv.updatedAt = plainConv.updatedAt

    await saveConversation(plainConv)
  }
}

// 自动生成会话标题（使用用户第一条消息）
const generateConversationTitle = async () => {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)

  if (!conv || conv.title !== t('conversations.untitled')) {
    return // 已经有标题了，不需要生成
  }

  const firstUserMsg = messages.value.find(m => m.role === 'user')
  const firstAssistantMsg = messages.value.find(m => m.role === 'assistant' && m.content)

  if (!firstUserMsg || !firstAssistantMsg) {
    return // 需要至少一轮对话才能生成标题
  }

  // 使用用户第一条消息作为标题
  const userContent = firstUserMsg.content.trim()
  conv.fullTitle = userContent
  conv.title = userContent.slice(0, 30) + (userContent.length > 30 ? '...' : '')

  // 创建纯对象保存
  const plainConv = {
    id: conv.id,
    title: conv.title,
    fullTitle: conv.fullTitle,
    messages: JSON.parse(JSON.stringify(messages.value)),
    createdAt: conv.createdAt,
    updatedAt: Date.now()
  }

  await saveConversation(plainConv)
}

onMounted(async () => {
  // 初始化数据库
  await initDB()

  // 加载配置
  const settings = await getAllSettings()
  if (settings.protocol) protocol.value = settings.protocol
  if (settings.endpoint) endpoint.value = settings.endpoint
  if (settings.apiKey) apiKey.value = settings.apiKey
  if (settings.model) model.value = settings.model
  if (settings.theme) theme.value = settings.theme
  if (settings.locale) locale.value = settings.locale

  // 如果没有配置，应用默认预设
  if (!endpoint.value) {
    applyPreset(presets[protocol.value][0])
  }

  // 加载会话列表
  const loadedConversations = await getConversations()
  if (loadedConversations.length > 0) {
    conversations.value = loadedConversations
    currentConversationId.value = loadedConversations[0].id
    messages.value = [...loadedConversations[0].messages]
  } else {
    createNewConversation()
  }

  // 应用主题
  applyTheme(appliedTheme.value)

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (theme.value === 'auto') applyTheme(getSystemTheme())
  })
})

// 持久化配置变更
watch(protocol, () => saveSettings())
watch(endpoint, () => saveSettings())
watch(apiKey, () => saveSettings())
watch(model, () => saveSettings())
watch(appliedTheme, (newTheme) => {
  applyTheme(newTheme)
  saveSettings()
})
watch(locale, (newLocale) => {
  document.documentElement.setAttribute('lang', newLocale)
  saveSettings()
})

// 自动滚动
const autoScroll = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = messagesRef.value
      if (el) {
        el.scrollTop = el.scrollHeight
        // 同时滚动最后一条消息的思考内容区域
        const thinkingContents = el.querySelectorAll('.thinking-content')
        if (thinkingContents.length > 0) {
          const lastThinking = thinkingContents[thinkingContents.length - 1]
          lastThinking.scrollTop = lastThinking.scrollHeight
        }
      }
    })
  })
}

// 切换思考过程展开
const toggleThinking = (index) => {
  messages.value[index].thinkingOpen = !messages.value[index].thinkingOpen
  autoScroll()
}

// 构建请求体
const buildRequestBody = (conversationMessages) => {
  const msgs = conversationMessages.map(m => ({ role: m.role, content: m.content }))
  if (protocol.value === 'anthropic') {
    return {
      model: model.value,
      max_tokens: 8192,
      messages: msgs,
      stream: true
    }
  }
  return {
    model: model.value,
    messages: msgs,
    stream: true
  }
}

// 构建请求头
const buildHeaders = () => {
  const headers = { 'Content-Type': 'application/json' }
  if (protocol.value === 'anthropic') {
    headers['x-api-key'] = apiKey.value
    headers['api-key'] = apiKey.value
    headers['anthropic-version'] = '2023-06-01'
  } else {
    headers['Authorization'] = `Bearer ${apiKey.value}`
  }
  return headers
}

// 解析 Anthropic SSE 事件
const parseAnthropicEvent = (eventType, data, msg) => {
  switch (eventType) {
    case 'content_block_start':
      if (data.content_block && data.content_block.type === 'thinking') {
        msg.thinking = true
        msg.thinkingOpen = true
      }
      break
    case 'content_block_delta':
      if (data.delta) {
        if (data.delta.type === 'thinking_delta') {
          msg.thinkingContent = (msg.thinkingContent || '') + data.delta.thinking
          autoScroll()
        } else if (data.delta.type === 'text_delta') {
          msg.content += data.delta.text
          autoScroll()
        }
      }
      break
    case 'message_stop':
      return true
  }
  return false
}

// 解析 OpenAI SSE 事件
const parseOpenAIEvent = (data, msg) => {
  if (data.choices && data.choices[0]) {
    const delta = data.choices[0].delta || {}
    // 处理 DeepSeek R1 等模型的推理内容
    if (delta.reasoning_content) {
      msg.thinking = true
      msg.thinkingOpen = true
      msg.thinkingContent = (msg.thinkingContent || '') + delta.reasoning_content
      autoScroll()
    }
    if (delta.content) {
      // 检查内容中是否包含 <think> 标签（部分模型如 Qwen）
      let text = delta.content
      if (text.includes('<think>') || (msg._inThinkBlock && !text.includes('</think>'))) {
        msg._inThinkBlock = true
        msg.thinking = true
        msg.thinkingOpen = true
        msg.thinkingContent = (msg.thinkingContent || '') + text.replace(/<think>/g, '')
        autoScroll()
      } else if (text.includes('</think>')) {
        msg._inThinkBlock = false
        msg.thinkingContent = (msg.thinkingContent || '') + text.replace(/<\/think>/g, '')
        autoScroll()
      } else if (msg._inThinkBlock) {
        msg.thinkingContent = (msg.thinkingContent || '') + text
        autoScroll()
      } else {
        msg.content += text
        autoScroll()
      }
    }
    return data.choices[0].finish_reason === 'stop'
  }
  return false
}

// 读取 SSE 流
const processStream = async (response, msg) => {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    let currentEvent = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim()
        continue
      }
      if (!line.startsWith('data: ')) continue

      const dataStr = line.slice(6)
      if (dataStr === '[DONE]') return

      try {
        const data = JSON.parse(dataStr)
        if (protocol.value === 'anthropic') {
          if (parseAnthropicEvent(currentEvent, data, msg)) return
        } else {
          if (parseOpenAIEvent(data, msg)) return
        }
      } catch {
        // 忽略解析错误
      }
    }
  }
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isGenerating.value) return

  const userText = inputMessage.value
  messages.value.push({ role: 'user', content: userText })
  inputMessage.value = ''
  isGenerating.value = true
  abortController.value = new AbortController()

  try {
    messages.value.push({
      role: 'assistant',
      content: '',
      thinking: false,
      thinkingContent: '',
      thinkingOpen: false
    })

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
      body: JSON.stringify(requestBody),
      signal: abortController.value.signal
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', { status: response.status, endpoint: endpoint.value, responseText: errorText })
      throw new Error(t('error.apiError', { status: response.status, detail: errorText }))
    }

    const msg = messages.value[messages.value.length - 1]
    await processStream(response, msg)
  } catch (error) {
    if (error.name === 'AbortError') {
      // 用户主动停止，不显示错误
      if (!messages.value[messages.value.length - 1].content) {
        messages.value[messages.value.length - 1].content = t('chat.stopped')
      }
    } else {
      messages.value[messages.value.length - 1].content = t('error.requestFailed', { message: error.message })
    }
  } finally {
    isGenerating.value = false
    abortController.value = null
    await saveCurrentConversation()
    // 如果是第一轮对话，自动生成标题
    await generateConversationTitle()
  }
}

// 停止生成
const stopGenerating = () => {
  if (abortController.value) {
    abortController.value.abort()
  }
}

// 处理输入框按键
const handleInputKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (!isGenerating.value && inputMessage.value.trim()) {
      sendMessage()
    }
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 会话列表 -->
    <aside class="conversations-sidebar glass-panel">
      <!-- Logo 品牌区 -->
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

      <div class="conversations-header">
        <h3 class="section-label">{{ t('conversations.title') }}</h3>
        <button class="new-chat-btn" @click="createNewConversation" :title="t('conversations.newChat')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
      <div class="conversations-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          :class="['conversation-item', { active: conv.id === currentConversationId }]"
          @click="switchConversation(conv.id)"
          :title="conv.fullTitle || conv.title"
        >
          <span class="conversation-title">{{ conv.title }}</span>
          <div class="conversation-actions">
            <button class="conv-action-btn" @click.stop="renameConversation(conv.id)" :title="t('conversations.rename')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="conv-action-btn" @click.stop="deleteConversationById(conv.id)" :title="t('conversations.delete')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="sidebar-spacer"></div>

      <!-- 设置按钮 -->
      <button class="settings-btn" @click="showConfigModal = true" :title="t('config.title')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
        </svg>
        <span>{{ t('config.title') }}</span>
      </button>
    </aside>

    <!-- 配置弹窗 -->
    <Transition name="modal">
      <div v-if="showConfigModal" class="modal-overlay" @click="showConfigModal = false">
        <div class="modal-content glass-panel" @click.stop>
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
          <label>{{ t('config.protocol') }}</label>
          <div class="select-wrapper">
            <select v-model="protocol">
              <option value="anthropic">{{ t('protocol.anthropic') }}</option>
              <option value="openai">{{ t('protocol.openai') }}</option>
            </select>
            <svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
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
          <div class="select-wrapper">
            <select :value="selectValue" @change="onModelSelect">
              <option v-for="opt in currentModelOptions" :key="opt" :value="opt">{{ opt }}</option>
              <option value="__custom__">{{ t('config.customModel') || '自定义模型...' }}</option>
            </select>
            <svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <input
            v-if="showCustomInput"
            :value="model"
            @input="onCustomModelChange"
            type="text"
            :placeholder="t('config.modelPlaceholder')"
            class="custom-model-input"
          />
        </div>
      </div>

      <!-- 快速预设（按协议分组） -->
      <div class="presets">
        <h3 class="section-label">{{ t('presets.title') }}</h3>
        <div class="preset-grid">
          <button
            v-for="preset in presets[protocol]"
            :key="preset.name"
            class="preset-btn"
            @click="applyPreset(preset)"
          >{{ preset.name }}</button>
        </div>
      </div>

      <div class="sidebar-spacer"></div>

      <!-- 主题切换 -->
      <div class="theme-section">
        <div class="theme-switcher">
          <button :class="['theme-btn', { active: theme === 'light' }]" @click="theme = 'light'" :title="t('theme.light')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
            </svg>
          </button>
          <button :class="['theme-btn', { active: theme === 'dark' }]" @click="theme = 'dark'" :title="t('theme.dark')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
          <button :class="['theme-btn', { active: theme === 'auto' }]" @click="theme = 'auto'" :title="t('theme.auto')">
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
          <button :class="['lang-btn', { active: locale === 'zh' }]" @click="locale = 'zh'">中文</button>
          <button :class="['lang-btn', { active: locale === 'en' }]" @click="locale = 'en'">EN</button>
        </div>
      </div>

          <!-- 关闭按钮 -->
          <button class="modal-close-btn" @click="showConfigModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 右侧：聊天区域 -->
    <main class="chat-area glass-panel">
      <div class="chat-header">
        <div class="chat-header-left">
          <span class="header-dot"></span>
          <span class="header-title">{{ t('chat.title') }}</span>
        </div>
        <span class="header-model">{{ model }}</span>
      </div>

      <div class="chat-divider"></div>

      <!-- 消息列表 -->
      <div class="messages" ref="messagesRef">
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
            <!-- 思考过程（可折叠） -->
            <div class="thinking-section" v-if="msg.thinking && msg.thinkingContent">
              <button class="thinking-toggle" :class="{ expanded: msg.thinkingOpen, streaming: isGenerating && index === messages.length - 1 }" @click="toggleThinking(index)">
                <svg class="thinking-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                <span v-if="!msg.thinkingOpen">{{ t('chat.showThinking') }}</span>
                <span v-else-if="isGenerating && index === messages.length - 1">{{ t('chat.thinkingLoading') }}</span>
                <span v-else>{{ t('chat.hideThinking') }}</span>
              </button>
              <div class="thinking-content" v-show="msg.thinkingOpen">
                <MarkdownRenderer :content="msg.thinkingContent" :is-user="false" />
              </div>
            </div>
            <!-- 正式回复 -->
            <div class="message-content" v-if="msg.content">
              <MarkdownRenderer :content="msg.content" :is-user="msg.role === 'user'" />
              <span class="cursor" v-if="isGenerating && index === messages.length - 1"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <div class="input-wrapper">
          <textarea
            ref="inputRef"
            v-model="inputMessage"
            @keydown="handleInputKeydown"
            :placeholder="t('chat.inputPlaceholder')"
            :disabled="isGenerating"
            rows="1"
          ></textarea>
          <button
            class="send-btn"
            :class="{ 'stop-btn': isGenerating }"
            @click="isGenerating ? stopGenerating() : sendMessage()"
            :disabled="!isGenerating && !inputMessage.trim()"
          >
            <svg v-if="!isGenerating" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
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
  width: 100vw;
  height: 100%;
  gap: 1.5rem;
  margin: 0;
  padding: 0 1.5rem 0 0;
}

/* ============================================
   会话列表侧边栏
   ============================================ */
.conversations-sidebar {
  width: 280px;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

.conversations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.new-chat-btn {
  background: var(--accent-light);
  border: 1.5px solid var(--panel-border);
  color: var(--accent-color);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.new-chat-btn:hover {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

.conversations-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow-y: auto;
  flex: 1;
  padding-right: 0.25rem;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 0.9rem;
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  gap: 0.5rem;
  flex-shrink: 0;
}

.conversation-item:hover {
  border-color: var(--accent-color);
  background: var(--accent-light);
}

.conversation-item.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

.conversation-title {
  flex: 1;
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.conversation-item:hover .conversation-actions,
.conversation-item.active .conversation-actions {
  opacity: 1;
}

.conv-action-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.conv-action-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.conversation-item.active .conv-action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.conversations-list::-webkit-scrollbar {
  width: 4px;
}

.conversations-list::-webkit-scrollbar-thumb {
  background: rgba(200, 150, 90, 0.2);
  border-radius: 4px;
}

/* 设置按钮 */
.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--accent-light);
  border: 1.5px solid var(--panel-border);
  border-radius: 8px;
  color: var(--accent-color);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.settings-btn:hover {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

/* ============================================
   配置弹窗
   ============================================ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
  position: relative;
}

.modal-close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--input-bg);
  border: 1.5px solid var(--panel-border);
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  background: var(--accent-light);
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(20px);
}

/* ============================================
   侧边栏（保留样式用于弹窗）
   ============================================ */

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
.conversations-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
}

.conversations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.new-chat-btn {
  background: var(--accent-light);
  border: 1.5px solid var(--panel-border);
  color: var(--accent-color);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.new-chat-btn:hover {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

.conversations-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.8rem;
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  gap: 0.5rem;
}

.conversation-item:hover {
  border-color: var(--accent-color);
  background: var(--accent-light);
}

.conversation-item.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

.conversation-title {
  flex: 1;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.conversation-item:hover .conversation-actions,
.conversation-item.active .conversation-actions {
  opacity: 1;
}

.conv-action-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.conv-action-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.conversation-item.active .conv-action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.conversations-list::-webkit-scrollbar {
  width: 4px;
}

.conversations-list::-webkit-scrollbar-thumb {
  background: rgba(200, 150, 90, 0.2);
  border-radius: 4px;
}

/* 配置区（用于弹窗） */
.config-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-label {
  font-family: var(--serif-font);
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--accent-color);
  letter-spacing: 2px;
  margin-bottom: 0.5rem;
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

input, .select-wrapper select {
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

input:focus, .select-wrapper select:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

input:hover:not(:focus) {
  border-color: rgba(200, 150, 90, 0.3);
}

[data-theme="light"] input:hover:not(:focus) {
  border-color: rgba(176, 125, 66, 0.25);
}

/* Select 下拉框 */
.select-wrapper {
  position: relative;
}

.select-wrapper select {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  padding-right: 2.5rem;
}

.select-wrapper select option {
  background: var(--panel-bg-solid);
  color: var(--text-primary);
}

.select-arrow {
  position: absolute;
  right: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-secondary);
}

.custom-model-input {
  margin-top: 0.35rem;
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
  font-family: -apple-system, BlinkMacSystemFont, 'Microsoft YaHei', '微软雅黑', 'Segoe UI', sans-serif;
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
  padding: 1.5rem 1rem;
}

.message {
  display: flex;
  gap: 0.85rem;
  max-width: 98%;
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
  min-width: 0;
  flex: 1;
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
  padding: 0.85rem 1rem;
  border-radius: 4px 14px 14px 14px;
  border: 1px solid var(--panel-border);
  font-size: 0.9rem;
  line-height: 1.7;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-primary);
  overflow: hidden;
  max-width: 100%;
}

/* 消息内容中的代码块横向滚动 */
.message-content :deep(pre) {
  overflow-x: auto;
  max-width: 100%;
}

.message-content :deep(.code-block) {
  max-width: 100%;
  overflow: hidden;
}

/* Markdown 首个元素无上边距 */
.message-content :deep(.md-body > *:first-child) {
  margin-top: 0;
}

/* 亮色模式代码高亮覆盖 */
[data-theme="light"] .message-content :deep(pre code.hljs) {
  background: transparent;
  color: #24292e;
}

[data-theme="light"] .message-content :deep(.hljs-comment),
[data-theme="light"] .message-content :deep(.hljs-quote) {
  color: #6a737d;
}

[data-theme="light"] .message-content :deep(.hljs-keyword),
[data-theme="light"] .message-content :deep(.hljs-selector-tag) {
  color: #d73a49;
}

[data-theme="light"] .message-content :deep(.hljs-string),
[data-theme="light"] .message-content :deep(.hljs-attr) {
  color: #032f62;
}

[data-theme="light"] .message-content :deep(.hljs-number),
[data-theme="light"] .message-content :deep(.hljs-literal) {
  color: #005cc5;
}

[data-theme="light"] .message-content :deep(.hljs-built_in),
[data-theme="light"] .message-content :deep(.hljs-type) {
  color: #6f42c1;
}

[data-theme="light"] .message-content :deep(.hljs-function),
[data-theme="light"] .message-content :deep(.hljs-title) {
  color: #6f42c1;
}

[data-theme="light"] .message-content :deep(.hljs-variable),
[data-theme="light"] .message-content :deep(.hljs-template-variable) {
  color: #e36209;
}

.message.user .message-content {
  background: var(--user-msg-bg);
  border-color: rgba(200, 150, 90, 0.2);
  border-radius: 14px 4px 14px 14px;
}

.message:hover .message-content {
  box-shadow: var(--shadow-md);
}

/* 思考过程 */
.thinking-section {
  margin-bottom: 0.4rem;
}

.thinking-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.3rem 0;
  transition: color 0.2s;
}

.thinking-toggle:hover {
  color: var(--accent-color);
}

.thinking-chevron {
  transition: transform 0.2s;
}

.thinking-toggle.expanded .thinking-chevron {
  transform: rotate(180deg);
}

.thinking-toggle.streaming {
  color: var(--accent-color);
}

.thinking-content {
  background: rgba(200, 150, 90, 0.06);
  border-left: 3px solid rgba(200, 150, 90, 0.3);
  border-radius: 0 8px 8px 0;
  padding: 0.8rem 1rem;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-top: 0.3rem;
  max-height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
  word-break: break-word;
}

[data-theme="light"] .thinking-content {
  background: rgba(176, 125, 66, 0.04);
  border-left-color: rgba(176, 125, 66, 0.25);
}

.chat-area .messages .thinking-content::-webkit-scrollbar {
  width: 4px;
}

.chat-area .messages .thinking-content::-webkit-scrollbar-thumb {
  background: rgba(200, 150, 90, 0.15);
  border-radius: 4px;
}

/* 思考内容中的代码块也需要横向滚动 */
.thinking-content :deep(pre) {
  overflow-x: auto;
  max-width: 100%;
}

.thinking-content :deep(.code-block) {
  max-width: 100%;
  overflow: hidden;
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
  align-items: flex-end;
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

.input-wrapper textarea {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.65rem 0;
  font-size: 0.9rem;
  border-radius: 0;
  resize: none;
  max-height: 200px;
  overflow-y: auto;
  font-family: inherit;
  line-height: 1.5;
}

.input-wrapper textarea:focus {
  box-shadow: none;
  border: none;
  outline: none;
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

.send-btn.stop-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.send-btn.stop-btn:hover {
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}
</style>
