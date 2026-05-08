import { createI18n } from 'vue-i18n'
import zh from './locales/zh.js'
import en from './locales/en.js'

// 从 localStorage 获取用户手动设置的语言
const savedLocale = localStorage.getItem('omni-locale')

// 检测浏览器语言：是否为中文
function getDefaultLocale() {
  if (savedLocale && ['zh', 'en'].includes(savedLocale)) {
    return savedLocale
  }
  const lang = navigator.language || navigator.userLanguage || ''
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages: { zh, en }
})

export default i18n
