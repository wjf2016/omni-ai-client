export default {
  brand: {
    name: 'Omni AI',
    tagline: 'Intelligent Conversation'
  },
  config: {
    title: 'Configuration',
    protocol: 'Protocol',
    endpoint: 'API Endpoint',
    apiKey: 'API Key',
    modelId: 'Model ID',
    endpointPlaceholder: 'https://api.openai.com/v1/chat/completions',
    apiKeyPlaceholder: 'sk-...',
    modelPlaceholder: 'gpt-4o',
    customModel: 'Custom model...'
  },
  protocol: {
    openai: 'OpenAI API Compatible',
    anthropic: 'Anthropic API Compatible'
  },
  presets: {
    title: 'Quick Presets'
  },
  theme: {
    light: 'Light Mode',
    dark: 'Dark Mode',
    auto: 'Auto'
  },
  chat: {
    title: 'Conversation',
    you: 'You',
    assistant: 'Omni AI',
    inputPlaceholder: 'Type your message...',
    welcome: 'Hello! I am Omni AI Client. Please configure your API settings to start chatting.',
    apiKeyMissing: 'Please set your API Key in the configuration.',
    noContent: 'No content',
    thinking: 'Thinking Process',
    thinkingLoading: 'Thinking...',
    showThinking: 'Show thinking process',
    hideThinking: 'Hide thinking process',
    stopped: 'Generation stopped'
  },
  conversations: {
    title: 'Conversations',
    newChat: 'New Chat',
    rename: 'Rename',
    delete: 'Delete',
    confirmDelete: 'Delete this conversation?',
    untitled: 'Untitled'
  },
  error: {
    apiError: 'API Error: {status} - {detail}',
    requestFailed: 'Request failed: {message}'
  }
}
