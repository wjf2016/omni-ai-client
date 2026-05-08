# Omni AI Client

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.5.32-green.svg)
![Vite](https://img.shields.io/badge/Vite-8.0.10-purple.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

[English](./README.md) | **中文**

一个现代、优雅的 AI 聊天客户端，支持多个 AI 提供商，具有精美的玻璃态 UI。

</div>

---

## 📖 项目简介

Omni AI Client 是一个基于 Vue 3 和 Vite 构建的通用 AI 聊天界面。它通过统一、美观的界面为与各种 AI 模型交互提供无缝体验。应用采用玻璃态设计，具有流畅的动画效果，支持亮色和暗色主题。

**🤖 开发说明**：本项目使用 **Claude Code** 和 **Claude Sonnet 4.5** 模型辅助开发，利用 AI 驱动的编程方式加速开发并确保代码质量。

## ✨ 功能特性

- 🎨 **现代玻璃态 UI** - 精美的玻璃效果设计，流畅的动画
- 🌓 **主题支持** - 亮色模式、暗色模式和自动模式（跟随系统偏好）
- 🔌 **多提供商支持** - 兼容 OpenAI、Anthropic Claude 和其他 OpenAI 兼容 API
- 🤖 **自动协议检测** - 智能检测并适配不同的 API 协议（OpenAI/Anthropic）
- ⚡ **快速预设** - 一键配置流行的 AI 提供商
- 🔒 **隐私优先** - 所有 API 密钥仅存储在浏览器本地，无外部追踪
- 📱 **响应式设计** - 在桌面和平板设备上无缝运行
- 🚀 **快速轻量** - 使用 Vite 构建，性能优化，零重型依赖

## 🎯 支持的 AI 提供商

| 提供商 | 协议 | 示例模型 |
|--------|------|----------|
| **OpenAI** | OpenAI API | GPT-4, GPT-4 Turbo, GPT-3.5 |
| **Anthropic** | Claude API | Claude 3.5 Sonnet, Claude 3 Opus |
| **小米 MiMo** | OpenAI 兼容 | mimo-chat-v2.5 |
| **自定义** | OpenAI/Anthropic | 任何兼容的端点 |

## 🚀 快速开始

### 前置要求

- Node.js 16+ 
- npm 或 yarn

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/yourusername/omni-ai-client.git

# 进入项目目录
cd omni-ai-client

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

应用将在 `http://localhost:5173` 可用

### 生产构建

```bash
# 构建项目
npm run build

# 预览生产构建
npm run preview
```

## 🎮 使用方法

### 1. 配置 API 设置

在侧边栏输入您的 API 配置：

**小米 MiMo：**
- **端点**: `https://platform.xiaomimimo.com/api/v1/chat/completions`
- **API 密钥**: 您的 MiMo API 密钥
- **模型**: `mimo-chat-v2.5`

**OpenAI：**
- **端点**: `https://api.openai.com/v1/chat/completions`
- **API 密钥**: 您的 OpenAI API 密钥（以 `sk-` 开头）
- **模型**: `gpt-4o` 或 `gpt-3.5-turbo`

**Anthropic Claude：**
- **端点**: `https://api.anthropic.com/v1/messages`
- **API 密钥**: 您的 Anthropic API 密钥（以 `sk-ant-` 开头）
- **模型**: `claude-3-5-sonnet-20241022`

### 2. 使用快速预设（可选）

点击预设按钮快速配置：
- **Xiaomi MiMo** - 预配置 MiMo 平台
- **OpenAI** - 预配置 OpenAI API
- **Anthropic Claude** - 预配置 Claude API

### 3. 开始聊天

- 在输入框中输入消息
- 按 Enter 或点击发送按钮
- 享受与 AI 的对话！

### 4. 切换主题

选择您喜欢的主题：
- **☀️ 亮色模式** - 清爽明亮的界面，适合白天使用
- **🌙 暗色模式** - 护眼的暗色界面，适合低光环境
- **🔄 自动模式** - 根据系统偏好自动切换

## 🔧 协议适配

客户端根据端点 URL 自动检测 API 协议：

**Anthropic 协议**（当端点包含 `anthropic.com` 或 `/v1/messages` 时检测）：
- 使用 `x-api-key` 请求头进行身份验证
- 包含必需的 `max_tokens` 参数（4096）
- 从 `content[].text` 格式解析响应

**OpenAI 协议**（用于所有其他端点）：
- 使用 `Authorization: Bearer` 请求头
- 标准聊天完成格式
- 从 `choices[].message.content` 格式解析响应

## 🏗️ 项目结构

```
omni-ai-client/
├── src/
│   ├── App.vue          # 主应用组件
│   ├── main.js          # 应用入口
│   └── style.css        # 全局样式和主题变量
├── public/              # 静态资源
├── index.html           # HTML 模板
├── vite.config.js       # Vite 配置
├── package.json         # 项目依赖
├── README.md            # 英文文档
└── README_CN.md         # 本文件（中文）
```

## 🛠️ 技术栈

- **前端框架**: Vue 3（组合式 API）
- **构建工具**: Vite 8
- **样式**: 原生 CSS with CSS Variables（无 Tailwind/Bootstrap）
- **字体**: Plus Jakarta Sans (Google Fonts)
- **API 支持**: OpenAI API, Anthropic Claude API

## 🎨 主题系统

应用包含一个精密的主题系统，具有三种模式：

- **亮色模式**：清爽明亮的界面，柔和的阴影和浅色背景
- **暗色模式**：护眼的暗色界面，微妙的渐变效果
- **自动模式**：根据系统偏好自动切换，实时响应系统主题变化

主题偏好保存在 localStorage 中，跨会话持久化。

## 🔐 安全与隐私

- ✅ API 密钥仅存储在浏览器的 localStorage 中
- ✅ 除了您配置的 AI 提供商外，不会向任何第三方服务器发送数据
- ✅ 所有通信直接在您的浏览器和 AI 提供商之间进行
- ✅ 无外部追踪或分析
- ✅ 开源 - 您可以自行验证代码

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

本项目采用 MIT 许可证。

## 🙏 致谢

- 使用 [Vue 3](https://vuejs.org/) 构建
- 由 [Vite](https://vitejs.dev/) 驱动
- 使用 [Claude Code](https://claude.ai/code) 和 **Claude Sonnet 4.5** 模型辅助开发
- 设计灵感来自现代玻璃态 UI 趋势

## 📧 联系方式

如有问题或反馈，请在 GitHub 上提交 issue。

---

<div align="center">

**用 ❤️ 和 AI 辅助制作**

</div>
