# Omni AI Client

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.5.32-green.svg)
![Vite](https://img.shields.io/badge/Vite-8.0.10-purple.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

**English** | [中文](./README_CN.md)

A modern, elegant AI chat client that supports multiple AI providers with a beautiful glassmorphism UI.

</div>

---

## 📖 Overview

Omni AI Client is a universal AI chat interface built with Vue 3 and Vite. It provides a seamless experience for interacting with various AI models through a unified, beautiful interface. The application features a glassmorphism design with smooth animations and supports both light and dark themes.

**🤖 Development Note**: This project was developed with assistance from **Claude Code** and **Claude Sonnet 4.5** model, leveraging AI-powered programming to accelerate development and ensure code quality.

## ✨ Features

- 🎨 **Modern Glassmorphism UI** - Beautiful glass-effect design with smooth animations
- 🌓 **Theme Support** - Light mode, dark mode, and auto mode (follows system preference)
- 🔌 **Multi-Provider Support** - Compatible with OpenAI, Anthropic Claude, and other OpenAI-compatible APIs
- 🤖 **Automatic Protocol Detection** - Intelligently detects and adapts to different API protocols (OpenAI/Anthropic)
- ⚡ **Quick Presets** - One-click configuration for popular AI providers
- 🔒 **Privacy First** - All API keys stored locally in browser, no external tracking
- 📱 **Responsive Design** - Works seamlessly on desktop and tablet devices
- 🚀 **Fast & Lightweight** - Built with Vite for optimal performance, zero heavy dependencies

## 🎯 Supported AI Providers

| Provider | Protocol | Example Models |
|----------|----------|----------------|
| **OpenAI** | OpenAI API | GPT-4, GPT-4 Turbo, GPT-3.5 |
| **Anthropic** | Claude API | Claude 3.5 Sonnet, Claude 3 Opus |
| **Xiaomi MiMo** | OpenAI-compatible | mimo-chat-v2.5 |
| **Custom** | OpenAI/Anthropic | Any compatible endpoint |

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/omni-ai-client.git

# Navigate to project directory
cd omni-ai-client

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
# Build the project
npm run build

# Preview production build
npm run preview
```

## 🎮 Usage

### 1. Configure API Settings

Enter your API configuration in the sidebar:

**For Xiaomi MiMo:**
- **Endpoint**: `https://platform.xiaomimimo.com/api/v1/chat/completions`
- **API Key**: Your MiMo API key
- **Model**: `mimo-chat-v2.5`

**For OpenAI:**
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **API Key**: Your OpenAI API key (starts with `sk-`)
- **Model**: `gpt-4o` or `gpt-3.5-turbo`

**For Anthropic Claude:**
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **API Key**: Your Anthropic API key (starts with `sk-ant-`)
- **Model**: `claude-3-5-sonnet-20241022`

### 2. Use Quick Presets (Optional)

Click on preset buttons for instant configuration:
- **Xiaomi MiMo** - Pre-configured for MiMo platform
- **OpenAI** - Pre-configured for OpenAI API
- **Anthropic Claude** - Pre-configured for Claude API

### 3. Start Chatting

- Type your message in the input field
- Press Enter or click Send button
- Enjoy the conversation with AI!

### 4. Switch Themes

Choose your preferred theme:
- **☀️ Light Mode** - Clean, bright interface for daytime use
- **🌙 Dark Mode** - Eye-friendly dark interface for low-light environments
- **🔄 Auto Mode** - Automatically switches based on system preference

## 🔧 Protocol Adaptation

The client automatically detects the API protocol based on the endpoint URL:

**Anthropic Protocol** (detected when endpoint contains `anthropic.com` or `/v1/messages`):
- Uses `x-api-key` header for authentication
- Includes required `max_tokens` parameter (4096)
- Parses response from `content[].text` format

**OpenAI Protocol** (used for all other endpoints):
- Uses `Authorization: Bearer` header
- Standard chat completions format
- Parses response from `choices[].message.content` format

## 🏗️ Project Structure

```
omni-ai-client/
├── src/
│   ├── App.vue          # Main application component
│   ├── main.js          # Application entry point
│   └── style.css        # Global styles and theme variables
├── public/              # Static assets
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json         # Project dependencies
├── README.md            # This file (English)
└── README_CN.md         # Chinese documentation
```

## 🛠️ Technology Stack

- **Frontend Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite 8
- **Styling**: Vanilla CSS with CSS Variables (no Tailwind/Bootstrap)
- **Font**: Plus Jakarta Sans (Google Fonts)
- **API Support**: OpenAI API, Anthropic Claude API

## 🎨 Theme System

The application includes a sophisticated theme system with three modes:

- **Light Mode**: Clean, bright interface with soft shadows and light backgrounds
- **Dark Mode**: Eye-friendly dark interface with subtle gradients
- **Auto Mode**: Automatically switches based on system preference and responds to system theme changes in real-time

Theme preferences are saved in localStorage and persist across sessions.

## 🔐 Security & Privacy

- ✅ API keys are stored only in browser's localStorage
- ✅ No data is sent to any third-party servers except your configured AI provider
- ✅ All communication happens directly between your browser and the AI provider
- ✅ No external tracking or analytics
- ✅ Open source - you can verify the code yourself

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Vue 3](https://vuejs.org/)
- Powered by [Vite](https://vitejs.dev/)
- Developed with assistance from [Claude Code](https://claude.ai/code) and **Claude Sonnet 4.5** model
- Design inspired by modern glassmorphism UI trends

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

<div align="center">

**Made with ❤️ and AI assistance**

</div>
