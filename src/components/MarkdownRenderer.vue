<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Marked } from 'marked'
import hljs from 'highlight.js'
import katex from 'katex'
import mermaid from 'mermaid'

const props = defineProps({
  content: { type: String, default: '' },
  isUser: { type: Boolean, default: false }
})

const containerRef = ref(null)
const copyTooltip = ref('')
let codeIndex = 0
let mermaidTimer = null
let mermaidId = 0

// marked 实例（带代码高亮）
const marked = new Marked()

marked.setOptions({
  breaks: true,
  gfm: true
})

// Mermaid 初始化
const initMermaid = (theme) => {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'light' ? 'neutral' : 'dark',
    themeVariables: {
      darkMode: theme !== 'light',
      primaryColor: '#c8965a',
      primaryTextColor: theme === 'light' ? '#2c2018' : '#f0ebe4',
      primaryBorderColor: '#c8965a',
      lineColor: theme === 'light' ? '#b07d42' : '#c8965a',
      secondaryColor: '#a07040',
      tertiaryColor: theme === 'light' ? '#fdfbf7' : '#251f1c',
      mainBkg: theme === 'light' ? '#ffffff' : '#1e1916',
      nodeBorder: '#c8965a',
      clusterBkg: theme === 'light' ? '#fdfbf7' : '#251f1c',
      titleColor: '#c8965a',
      edgeLabelBackground: theme === 'light' ? '#ffffff' : '#1e1916',
    },
    securityLevel: 'loose',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }
  })
}

const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark'
initMermaid(currentTheme)

// KaTeX 预处理：提取数学公式为占位符
const preprocessKaTeX = (text) => {
  const placeholders = []
  let processed = text

  // $$...$$ 块级公式
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    try {
      const html = katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })
      const idx = placeholders.length
      placeholders.push(html)
      return `%%KATEX_PLACEHOLDER_${idx}%%`
    } catch {
      return `$$${formula}$$`
    }
  })

  // $...$ 行内公式
  processed = processed.replace(/\$([^\n$]+?)\$/g, (_, formula) => {
    try {
      const html = katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false })
      const idx = placeholders.length
      placeholders.push(html)
      return `%%KATEX_PLACEHOLDER_${idx}%%`
    } catch {
      return `$${formula}$`
    }
  })

  return { processed, placeholders }
}

// 自定义 renderer：代码块带语言标签和复制按钮，mermaid 代码块转为图表容器
const renderer = {
  code({ text, lang }) {
    const id = codeIndex++
    // Mermaid 代码块
    if (lang === 'mermaid') {
      return `<div class="mermaid-container"><div class="mermaid" data-mermaid-src="${encodeURIComponent(text)}">${text}</div></div>`
    }
    const highlighted = lang && hljs.getLanguage(lang)
      ? hljs.highlight(text, { language: lang }).value
      : hljs.highlightAuto(text).value
    const label = lang ? `<span class="code-lang">${lang}</span>` : ''
    return `<div class="code-block"><div class="code-header">${label}<button class="copy-code-btn" data-code-index="${id}" data-raw="${encodeURIComponent(text)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span class="copy-text">复制</span></button></div><pre><code class="hljs${lang ? ' language-' + lang : ''}">${highlighted}</code></pre></div>`
  }
}

marked.use({ renderer })

// 渲染 HTML
const renderedHtml = computed(() => {
  if (!props.content) return ''
  codeIndex = 0
  const { processed, placeholders } = preprocessKaTeX(props.content)
  let html = marked.parse(processed)
  // 恢复 KaTeX 占位符
  placeholders.forEach((katexHtml, idx) => {
    html = html.replace(`%%KATEX_PLACEHOLDER_${idx}%%`, katexHtml)
  })
  return html
})

// 复制整条消息（Markdown 源文本）
const copyMessage = async () => {
  const copied = await writeClipboard(props.content)
  showTooltip(copied ? '已复制 Markdown' : '复制失败')
}

const showTooltip = (text) => {
  copyTooltip.value = text
  setTimeout(() => { copyTooltip.value = '' }, 1500)
}

const writeClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // ignore and fallback
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }

  document.body.removeChild(textarea)
  return copied
}

// 事件委托：代码块复制按钮
const handleContainerClick = async (e) => {
  const btn = e.target.closest('.copy-code-btn')
  if (btn) {
    const raw = decodeURIComponent(btn.dataset.raw)
    const copied = await writeClipboard(raw)
    const textNode = btn.querySelector('.copy-text')
    if (textNode) {
      const original = '复制'
      textNode.textContent = copied ? '已复制' : '复制失败'
      if (copied) {
        btn.classList.add('copied')
      }
      setTimeout(() => {
        textNode.textContent = original
        btn.classList.remove('copied')
      }, 1500)
    }
  }
}

// 渲染 Mermaid 图表
const renderMermaidDiagrams = async () => {
  const el = containerRef.value
  if (!el) return
  const mermaidEls = el.querySelectorAll('.mermaid[data-mermaid-src]')
  if (!mermaidEls.length) return

  for (const mEl of mermaidEls) {
    const src = decodeURIComponent(mEl.dataset.mermaidSrc)
    mEl.removeAttribute('data-mermaid-src')
    const id = `mermaid-${++mermaidId}`
    try {
      const { svg } = await mermaid.render(id, src)
      mEl.innerHTML = svg
      mEl.classList.add('rendered')
    } catch {
      mEl.classList.add('mermaid-error')
      mEl.textContent = '图表渲染失败'
    }
  }
}

const scheduleMermaidRender = () => {
  if (mermaidTimer) clearTimeout(mermaidTimer)
  mermaidTimer = setTimeout(() => {
    nextTick(renderMermaidDiagrams)
  }, 300)
}

watch(() => props.content, scheduleMermaidRender)
onMounted(scheduleMermaidRender)

// 主题变化时重新渲染 mermaid
const observer = new MutationObserver(() => {
  const theme = document.documentElement.getAttribute('data-theme')
  initMermaid(theme)
  // 重置并重新渲染所有 mermaid
  if (containerRef.value) {
    containerRef.value.querySelectorAll('.mermaid.rendered').forEach(el => {
      el.classList.remove('rendered')
      el.dataset.mermaidSrc = encodeURIComponent(el.textContent)
      el.innerHTML = el.textContent
    })
    scheduleMermaidRender()
  }
})

onMounted(() => {
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

onBeforeUnmount(() => {
  observer.disconnect()
  if (mermaidTimer) clearTimeout(mermaidTimer)
})
</script>

<template>
  <div class="md-wrapper" :class="{ 'user-msg': isUser }">
    <div
      ref="containerRef"
      class="md-body"
      v-html="renderedHtml"
      @click="handleContainerClick"
    ></div>
    <button
      v-if="!isUser && content"
      class="copy-msg-btn"
      @click="copyMessage"
      title="复制为 Markdown"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      <Transition name="tooltip-fade">
        <span v-if="copyTooltip" class="copy-tooltip">{{ copyTooltip }}</span>
      </Transition>
    </button>
  </div>
</template>

<style scoped>
.md-wrapper {
  position: relative;
}

.md-body {
  line-height: 1.75;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* ===== 标题 ===== */
.md-body :deep(h1),
.md-body :deep(h2),
.md-body :deep(h3),
.md-body :deep(h4),
.md-body :deep(h5),
.md-body :deep(h6) {
  margin: 1.2em 0 0.5em;
  font-weight: 650;
  line-height: 1.3;
  color: var(--text-primary);
}
.md-body :deep(h1) { font-size: 1.5em; border-bottom: 1px solid var(--divider); padding-bottom: 0.3em; }
.md-body :deep(h2) { font-size: 1.3em; border-bottom: 1px solid var(--divider); padding-bottom: 0.25em; }
.md-body :deep(h3) { font-size: 1.1em; }
.md-body :deep(h4) { font-size: 1em; }

/* ===== 段落和列表 ===== */
.md-body :deep(p) {
  margin: 0.6em 0;
}
.md-body :deep(ul),
.md-body :deep(ol) {
  padding-left: 1.8em;
  margin: 0.5em 0;
}
.md-body :deep(li) {
  margin: 0.25em 0;
}
.md-body :deep(li > ul),
.md-body :deep(li > ol) {
  margin: 0.1em 0;
}

/* ===== 行内代码 ===== */
.md-body :deep(code:not(.hljs)) {
  background: rgba(200, 150, 90, 0.1);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.88em;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  color: var(--accent-color);
}

[data-theme="light"] .md-body :deep(code:not(.hljs)) {
  background: rgba(176, 125, 66, 0.08);
}

/* ===== 代码块 ===== */
.md-body :deep(.code-block) {
  margin: 0.8em 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--panel-border);
  background: rgba(0, 0, 0, 0.3);
  max-width: 100%;
}

[data-theme="light"] .md-body :deep(.code-block) {
  background: #f8f5f0;
  border-color: rgba(60, 40, 20, 0.1);
}

.md-body :deep(.code-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.8rem;
  background: rgba(0, 0, 0, 0.15);
  border-bottom: 1px solid var(--panel-border);
}

[data-theme="light"] .md-body :deep(.code-header) {
  background: rgba(60, 40, 20, 0.04);
  border-bottom-color: rgba(60, 40, 20, 0.08);
}

.md-body :deep(.code-lang) {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.md-body :deep(.copy-code-btn) {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.72rem;
  font-family: inherit;
  transition: all 0.2s;
}

.md-body :deep(.copy-code-btn:hover) {
  color: var(--accent-color);
  background: rgba(200, 150, 90, 0.1);
}

.md-body :deep(.copy-code-btn.copied) {
  color: #ffffff;
  background: var(--accent-color);
}

[data-theme="light"] .md-body :deep(.copy-code-btn:hover) {
  background: rgba(176, 125, 66, 0.08);
}

.md-body :deep(.copy-text) {
  font-weight: 500;
}

.md-body :deep(pre) {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  overflow-y: hidden;
  font-size: 0.85rem;
  line-height: 1.6;
  max-width: 100%;
}

.md-body :deep(pre code.hljs) {
  display: block;
  white-space: pre;
  word-wrap: normal;
  overflow-wrap: normal;
}

.md-body :deep(pre code.hljs) {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  display: block;
  white-space: pre;
  word-wrap: normal;
  overflow-wrap: normal;
  min-width: max-content;
}

.md-body :deep(pre::-webkit-scrollbar),
.md-body :deep(.mermaid-container::-webkit-scrollbar),
.md-body :deep(.katex-display::-webkit-scrollbar) {
  height: 6px;
}

.md-body :deep(pre::-webkit-scrollbar-thumb),
.md-body :deep(.mermaid-container::-webkit-scrollbar-thumb),
.md-body :deep(.katex-display::-webkit-scrollbar-thumb) {
  background: rgba(200, 150, 90, 0.2);
  border-radius: 999px;
}

/* ===== 引用块 ===== */
.md-body :deep(blockquote) {
  margin: 0.6em 0;
  padding: 0.5em 1em;
  border-left: 3px solid var(--accent-color);
  background: rgba(200, 150, 90, 0.05);
  border-radius: 0 6px 6px 0;
  color: var(--text-secondary);
}

[data-theme="light"] .md-body :deep(blockquote) {
  background: rgba(176, 125, 66, 0.04);
}

.md-body :deep(blockquote p) {
  margin: 0.2em 0;
}

/* ===== 表格 ===== */
.md-body :deep(table) {
  border-collapse: collapse;
  margin: 0.8em 0;
  width: 100%;
  font-size: 0.88em;
}

.md-body :deep(th),
.md-body :deep(td) {
  border: 1px solid var(--panel-border);
  padding: 0.5em 0.8em;
  text-align: left;
}

.md-body :deep(th) {
  background: var(--accent-light);
  font-weight: 600;
}

.md-body :deep(tr:nth-child(even)) {
  background: rgba(200, 150, 90, 0.03);
}

[data-theme="light"] .md-body :deep(tr:nth-child(even)) {
  background: rgba(176, 125, 66, 0.03);
}

/* ===== 水平线 ===== */
.md-body :deep(hr) {
  border: none;
  height: 1px;
  background: var(--divider);
  margin: 1.2em 0;
}

/* ===== 链接 ===== */
.md-body :deep(a) {
  color: var(--accent-color);
  text-decoration: none;
  border-bottom: 1px solid rgba(200, 150, 90, 0.3);
  transition: border-color 0.2s;
}

.md-body :deep(a:hover) {
  border-bottom-color: var(--accent-color);
}

/* ===== 图片 ===== */
.md-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 0.5em 0;
}

/* ===== KaTeX 数学公式 ===== */
.md-body :deep(.katex-display) {
  margin: 0.8em 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5em 0;
}

.md-body :deep(.katex) {
  font-size: 1.05em;
}

/* ===== Mermaid 流程图 ===== */
.md-body :deep(.mermaid-container) {
  margin: 0.8em 0;
  text-align: center;
  overflow-x: auto;
}

.md-body :deep(.mermaid) {
  display: inline-block;
  min-width: 200px;
}

.md-body :deep(.mermaid.rendered svg) {
  max-width: 100%;
  height: auto;
}

.md-body :deep(.mermaid-error) {
  color: #ef4444;
  font-size: 0.85em;
  padding: 0.5em;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 6px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* ===== 整条消息复制按钮 ===== */
.copy-msg-btn {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
  z-index: 2;
}

.md-wrapper:hover .copy-msg-btn {
  opacity: 1;
}

.copy-msg-btn:hover {
  color: var(--accent-color);
  background: var(--accent-light);
  border-color: var(--accent-color);
}

.copy-tooltip {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.3rem;
  background: var(--panel-bg-solid);
  color: var(--text-primary);
  font-size: 0.72rem;
  padding: 0.25rem 0.5rem;
  border-radius: 5px;
  white-space: nowrap;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--panel-border);
  pointer-events: none;
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
