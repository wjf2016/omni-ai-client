# Omni AI Client

Omni AI Client is a modern, lightweight, and universally compatible AI chat web application. It is designed to connect seamlessly with any Large Language Model that supports the standard OpenAI API protocol or Anthropic API protocol (including OpenAI, Anthropic Claude, and Xiaomi MiMo).

## 🌟 Features

- **Universal Protocol Support**: Bring your own API key and Endpoint. Connect to OpenAI-compatible APIs and Anthropic Claude API instantly.
- **Automatic Protocol Detection**: Intelligently detects and adapts to different API protocols (OpenAI/Anthropic) based on endpoint URL.
- **Premium UI/UX**: Built with Vanilla CSS utilizing glassmorphism, fluid animations, and a carefully crafted dark mode for an immersive experience.
- **Privacy First**: All configurations (API keys, endpoints) remain securely in your local browser state. No external databases or tracking.
- **Zero Dependencies**: Core UI is built without heavy styling frameworks (no Tailwind/Bootstrap), ensuring maximum performance and customizability.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/omni-ai-client.git
cd omni-ai-client

# Install dependencies
npm install

# Start the development server
npm run dev
```

## 🛠️ Usage with Different Providers

Omni AI Client provides quick presets for popular platforms. Simply configure the settings in the sidebar:

**For Xiaomi MiMo:**
- **Endpoint**: `https://platform.xiaomimimo.com/api/v1/chat/completions`
- **Model**: `mimo-chat-v2.5`

**For OpenAI:**
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Model**: `gpt-4o`

**For Anthropic Claude:**
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Model**: `claude-3-5-sonnet-20241022`
- **Note**: Use your Anthropic API key (starts with `sk-ant-`)

## 🔧 Protocol Adaptation

The client automatically detects the API protocol based on the endpoint URL:

- **Anthropic Protocol**: Detected when endpoint contains `anthropic.com` or `/v1/messages`
  - Uses `x-api-key` header for authentication
  - Includes required `max_tokens` parameter
  - Parses response from `content[].text` format

- **OpenAI Protocol**: Used for all other endpoints
  - Uses `Authorization: Bearer` header
  - Standard chat completions format
  - Parses response from `choices[].message.content` format

## 🏗️ Technology Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid, Backdrop Filter)

## 📄 License

MIT License. See `LICENSE` for more information.
