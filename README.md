# Meeting Assistant

A Windows-only AI meeting assistant that runs as a transparent floating overlay. Captures system audio in real time, transcribes it via OpenAI's Realtime API, and generates structured meeting notes using an LLM.

## Features

- **Real-time transcription** of system/desktop audio (speakers, meetings, calls)
- **Live transcript view** that updates as people speak
- **Automatic meeting notes** generated when you stop recording (Markdown)
- **Multi-provider notes generation** (OpenAI-compatible, OpenRouter, Groq, Together, Fireworks, Ollama, Kimi, Gemini, GLM, DeepSeek, Mistral, Perplexity, xAI, Anthropic)
- **Prompt Profiles** to customize notes output per meeting type
- **Session history** with export to `.md` files
- **Transparent floating overlay** (Cluely-style) pinned to the right edge of your screen
- **System tray** integration -- runs in the background
- **Collapsible** to a small status pill; toggle with `Ctrl+Shift+M`

## Architecture

```
Electron (React UI)  <--IPC-->  Electron Main Process  <--stdio-->  C# Sidecar (NAudio)
                                      |
                                      |-- WebSocket --> OpenAI Realtime Transcription API
                                      |-- HTTP POST --> Selected LLM provider API
                                      |-- SQLite ----> Local session/profile storage
```

## Prerequisites

- **Windows 10+**
- **Node.js 20+** (LTS)
- **.NET 8 SDK** (for building the audio sidecar)
- **OpenAI API key** (required for OpenAI Realtime transcription)
- **At least one notes LLM API key** (OpenAI-compatible key, OpenRouter, Groq, Together, Fireworks, Kimi, Gemini, GLM, DeepSeek, Mistral, Perplexity, xAI, or Anthropic)

## Setup

### 1. Clone and install

```bash
git clone <this-repo>
cd MeetingAssistant
npm install
```

### 2. Configure API key

Create a `.env` file in the project root (or set environment variables):

```env
OPENAI_API_KEY=sk-your-api-key-here
TRANSCRIPTION_MODEL=gpt-4o-transcribe
LLM_MODEL=gpt-4o
LLM_ENDPOINT=https://api.openai.com/v1/chat/completions
# LLM_API_KEY=optional-generic-llm-key
# OPENROUTER_API_KEY=...
# GROQ_API_KEY=...
# TOGETHER_API_KEY=...
# FIREWORKS_API_KEY=...
# MOONSHOT_API_KEY=...   # Kimi
# GEMINI_API_KEY=...
# ZHIPU_API_KEY=...      # GLM
# DEEPSEEK_API_KEY=...
# MISTRAL_API_KEY=...
# PERPLEXITY_API_KEY=...
# XAI_API_KEY=...
# ANTHROPIC_API_KEY=...
```

### 3. Build the audio sidecar

```bash
cd sidecar
dotnet build
cd ..
```

Or for a self-contained release build:

```bash
dotnet publish sidecar/AudioSidecar.csproj -r win-x64 -c Release --self-contained -p:PublishSingleFile=true -o resources/sidecar
```

### 4. Run in development

```bash
npm run dev
```

This launches the Electron app with hot-reload for the React UI.

## Usage

1. The transparent overlay appears on the right edge of your screen
2. Select a **Prompt Profile** from the dropdown (default: "General Meeting")
3. Click **Start Recording** -- system audio capture begins
4. The live transcript updates in real time as speech is detected
5. Click **Stop Recording** -- notes are auto-generated
6. Use **Copy Notes** or **Save .md** to export
7. Press `Ctrl+Shift+M` to toggle the overlay visibility
8. Click the collapse arrow to shrink to a status pill

## Prompt Profiles

Navigate to the Profiles tab (sliders icon) to create custom profiles:

- **Name**: e.g. "Engineering Standup", "Sales Call"
- **Transcription Prompt**: optional keywords/names to improve transcription accuracy
- **Notes Prompt**: system instructions for the LLM (required sections, formatting, etc.)

## Building for Distribution

```bash
npm run build:sidecar   # Publish C# sidecar to resources/sidecar/
npm run package          # Build Electron + create Windows installer
```

The installer will be in the `dist/` folder.

## Project Structure

```
src/
  main/          -- Electron main process (services, IPC, window management)
  preload/       -- contextBridge API for renderer
  renderer/      -- React app (components, hooks, stores, styles)
sidecar/         -- C# .NET 8 console app (NAudio audio capture)
resources/       -- App icons, bundled sidecar exe
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop Shell | Electron 33 |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 3 |
| State | Zustand |
| Audio Capture | NAudio (C# .NET 8 sidecar) |
| Transcription | OpenAI Realtime API (WebSocket) |
| Notes | OpenAI-compatible providers + Anthropic |
| Database | SQLite (sql.js / WASM) |

## License

MIT
