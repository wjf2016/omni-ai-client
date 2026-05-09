import { createApp } from 'vue'
import './style.css'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'
import App from './App.vue'
import i18n from './i18n.js'

createApp(App).use(i18n).mount('#app')
