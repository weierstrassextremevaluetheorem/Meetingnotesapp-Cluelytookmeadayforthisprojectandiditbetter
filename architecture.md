# MeetingAssistant -- Architecture Context

> **Purpose**: Windows-only AI meeting assistant. Captures system audio, transcribes in real time, generates structured meeting notes via LLM, persists sessions locally.
> **UI**: Electron + React transparent floating overlay (Cluely-style), pinned to right edge, collapsible to a pill.
> **Audio**: C# .NET 8 sidecar using NAudio WasapiLoopbackCapture, communicates with Electron via stdio JSON lines.
> **Multi-provider**: Transcription via OpenAI Realtime or Deepgram. Notes via any OpenAI-compatible endpoint (OpenAI, Groq, Together, Ollama, etc.) or Anthropic Claude.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Electron Main Process (Node.js)                 │
│                                                                     │
│  ┌────────────────┐   ┌─────────────────────┐   ┌───────────────┐  │
│  │ AudioBridge    │   │ TranscriptionFactory │   │ NotesService  │  │
│  │ Service        │──>│ OpenAI RT / Deepgram │   │ OpenAI-compat │  │
│  │ spawns sidecar │   │ (ws WebSocket)       │   │ / Anthropic   │  │
│  └───────┬────────┘   └──────────┬──────────┘   └──────┬────────┘  │
│          │ stdio                  │ events               │           │
│  ┌───────┴────────┐   ┌──────────┴──────────┐   ┌──────┴────────┐  │
│  │ C# Sidecar     │   │ IPC Handlers        │   │ SQLite Stores │  │
│  │ (child process) │   │ (ipcMain.handle)    │   │ better-sqlite3│  │
│  └────────────────┘   └──────────┬──────────┘   └───────────────┘  │
│                                   │ contextBridge                    │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────┐
│                     Electron Renderer (React + Vite)                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Overlay Panel │  │ Transcript   │  │ Notes View   │              │
│  │ (glassmorphism│  │ View (live)  │  │ (Markdown)   │              │
│  │  380px right) │  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Control Bar   │  │ Profile      │  │ Session      │              │
│  │ Start/Stop    │  │ Editor       │  │ History      │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  State: Zustand store   |   Styles: Tailwind CSS + glassmorphism    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Shell | Electron 33+ | Desktop window, system tray, IPC |
| Frontend | React 18 + TypeScript + Vite | Overlay UI components |
| Styling | Tailwind CSS 3 | Glassmorphism, dark theme |
| Markdown | react-markdown + remark-gfm | Render notes in-app |
| State | Zustand | Global app state |
| Animation | Framer Motion | Expand/collapse transitions |
| WebSocket | ws (npm) | Transcription streaming (OpenAI / Deepgram) |
| HTTP | Node.js fetch | LLM notes (OpenAI-compat / Anthropic) |
| Database | sql.js (WASM) | Local SQLite persistence |
| Audio Capture | NAudio 2.2+ (C#/.NET 8) | WasapiLoopbackCapture |
| IPC Sidecar | child_process stdio | JSON lines over stdin/stdout |
| Build | electron-vite + electron-builder | Dev server + packaging |

---

## Supported Providers

### Transcription (real-time)

| Provider | Models | Protocol |
|----------|--------|----------|
| **OpenAI Realtime** | gpt-4o-transcribe, gpt-4o-mini-transcribe, whisper-1 | WebSocket (wss://api.openai.com/v1/realtime) |
| **Deepgram** | nova-3, nova-2, nova, enhanced, base | WebSocket (wss://api.deepgram.com/v1/listen) |

Implementation: `src/main/services/transcription/` -- factory pattern selects the active provider from `SettingsStore.getTranscriptionProvider()`.

### Notes Generation (LLM)

| Provider | Models | Protocol |
|----------|--------|----------|
| **OpenAI-Compatible** | Any model at any endpoint that speaks the OpenAI Chat Completions format: OpenAI, Azure OpenAI, Groq, Together AI, Fireworks, Ollama (`localhost:11434`), LM Studio, vLLM | `POST /v1/chat/completions` |
| **Anthropic Claude** | claude-sonnet-4-20250514, claude-3-5-sonnet, claude-3-5-haiku | `POST /v1/messages` with `x-api-key` |

Implementation: `src/main/services/NotesService.ts` -- branches on `SettingsStore.getLlmProvider()`.

---

## Audio Pipeline

```
WasapiLoopbackCapture (48kHz, 32-bit float, stereo)
        │
        ▼
WaveFloatTo16Provider (48kHz, 16-bit, stereo)
        │
        ▼
StereoToMonoProvider16 (48kHz, 16-bit, mono)
        │
        ▼
MediaFoundationResampler (24kHz, 16-bit, mono)
        │
        ▼
AudioRingBuffer (96KB circular, thread-safe)
        │
        ▼  [50ms timer drains 2400 bytes]
stdout JSON line: {"type":"audio","data":"<base64 PCM>"}
```

**Why 24kHz mono PCM16**: This is the only PCM format accepted by OpenAI's Realtime API (`audio/pcm` with `rate: 24000`).

---

## Sidecar Protocol (stdio JSON Lines)

### Commands (Electron -> Sidecar via stdin)

```jsonl
{"type":"start"}
{"type":"stop"}
```

### Events (Sidecar -> Electron via stdout)

```jsonl
{"type":"status","status":"capturing"}
{"type":"audio","data":"<base64 encoded 2400 bytes of PCM16>"}
{"type":"status","status":"stopped"}
{"type":"error","message":"No default audio render device found"}
```

Sidecar stderr is captured for diagnostic logging.

---

## OpenAI Realtime Transcription Protocol

### Connection

```
WebSocket: wss://api.openai.com/v1/realtime?model=gpt-4o-transcribe
Header: Authorization: Bearer {OPENAI_API_KEY}
```

### Session Initialization

```json
{
  "type": "session.update",
  "session": {
    "type": "transcription",
    "audio": {
      "input": {
        "format": { "type": "audio/pcm", "rate": 24000 },
        "noise_reduction": { "type": "far_field" },
        "transcription": {
          "model": "gpt-4o-transcribe",
          "language": "en",
          "prompt": "<from profile.transcriptionPrompt>"
        },
        "turn_detection": {
          "type": "server_vad",
          "threshold": 0.5,
          "prefix_padding_ms": 300,
          "silence_duration_ms": 500
        }
      }
    }
  }
}
```

### Sending Audio

```json
{ "type": "input_audio_buffer.append", "audio": "<base64 PCM>" }
```

### Receiving Transcription

```json
// Streaming delta (partial text)
{
  "type": "conversation.item.input_audio_transcription.delta",
  "item_id": "item_003",
  "content_index": 0,
  "delta": "Hello,"
}

// Completed turn (full text for a speech segment)
{
  "type": "conversation.item.input_audio_transcription.completed",
  "item_id": "item_003",
  "content_index": 0,
  "transcript": "Hello, how are you?"
}
```

### Reconnection Strategy

On unexpected WebSocket close: retry up to 3 times with exponential backoff (1s, 2s, 4s). On permanent failure, stop session with `failed` status.

---

## Data Models

### PromptProfile

```typescript
interface PromptProfile {
  id: string;                  // UUID
  name: string;                // "Engineering Standup", "Sales Call"
  transcriptionPrompt: string; // keyword hints for transcription
  notesPrompt: string;         // system instructions for LLM notes
  outputFormat: string;        // "markdown"
  createdAt: string;           // ISO 8601
  updatedAt: string;
}
```

### MeetingSession

```typescript
interface MeetingSession {
  id: string;
  profileId: string;
  profileName: string;
  startedAt: string;
  endedAt?: string;
  transcriptText: string;
  notesMarkdown?: string;
  status: 'recording' | 'generating' | 'completed' | 'failed';
}
```

---

## SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS PromptProfiles (
    Id TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    TranscriptionPrompt TEXT DEFAULT '',
    NotesPrompt TEXT NOT NULL,
    OutputFormat TEXT NOT NULL DEFAULT 'markdown',
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS MeetingSessions (
    Id TEXT PRIMARY KEY,
    ProfileId TEXT NOT NULL,
    ProfileName TEXT NOT NULL,
    StartedAt TEXT NOT NULL,
    EndedAt TEXT,
    TranscriptText TEXT DEFAULT '',
    NotesMarkdown TEXT,
    Status TEXT NOT NULL DEFAULT 'recording',
    FOREIGN KEY (ProfileId) REFERENCES PromptProfiles(Id)
);
```

Database location: `%LOCALAPPDATA%/MeetingAssistant/meetings.db`

---

## Folder Structure

```
MeetingAssistant/
├── package.json
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── .env.example
│
├── src/
│   ├── main/                          # Electron main process
│   │   ├── index.ts                   # Entry: app lifecycle, window, tray, shortcuts
│   │   ├── window.ts                  # Overlay BrowserWindow factory
│   │   ├── tray.ts                    # System tray icon + context menu
│   │   ├── services/
│   │   │   ├── AudioBridgeService.ts  # Spawns C# sidecar, reads audio
│   │   │   ├── TranscriptionService.ts# WebSocket to OpenAI Realtime API
│   │   │   ├── NotesService.ts        # HTTP to OpenAI Chat Completions
│   │   │   ├── ProfileStore.ts        # better-sqlite3 CRUD
│   │   │   ├── SessionStore.ts        # better-sqlite3 CRUD
│   │   │   └── DatabaseInit.ts        # Schema + seed data
│   │   └── ipc/
│   │       ├── channels.ts            # IPC channel constants
│   │       └── handlers.ts            # ipcMain.handle registrations
│   │
│   ├── preload/
│   │   └── index.ts                   # contextBridge API exposure
│   │
│   └── renderer/                      # React app
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── OverlayPanel.tsx       # Glass container + drag region
│       │   ├── CollapsedPill.tsx      # Minimized recording pill
│       │   ├── TitleBar.tsx           # Custom frameless title bar
│       │   ├── TranscriptView.tsx     # Live auto-scrolling transcript
│       │   ├── NotesView.tsx          # Rendered Markdown viewer
│       │   ├── ControlBar.tsx         # Start/Stop + profile dropdown
│       │   ├── ProfileEditor.tsx      # CRUD form
│       │   ├── SessionHistory.tsx     # Session list
│       │   ├── SessionDetail.tsx      # Transcript + notes detail
│       │   ├── StatusIndicator.tsx    # Pulsing recording dot
│       │   └── ExportBar.tsx          # Copy / Save .md buttons
│       ├── hooks/
│       │   ├── useRecording.ts
│       │   ├── useProfiles.ts
│       │   ├── useSessions.ts
│       │   └── useTranscript.ts
│       ├── stores/
│       │   └── appStore.ts            # Zustand global state
│       ├── types/
│       │   └── index.ts               # Shared interfaces
│       └── styles/
│           └── globals.css            # Tailwind + glassmorphism
│
├── sidecar/                           # C# audio capture
│   ├── AudioSidecar.csproj
│   ├── Program.cs
│   ├── Services/
│   │   ├── AudioCaptureService.cs
│   │   ├── AudioResampler.cs
│   │   └── AudioRingBuffer.cs
│   └── Protocol/
│       └── Message.cs
│
└── resources/
    ├── icon.ico
    └── tray-recording.ico
```

---

## Overlay Window Behavior

- **Position**: Right edge of screen, 10px margin, 380px wide, ~680px tall
- **Style**: Frameless, transparent background, always-on-top (screen-saver level)
- **Collapse**: Shrinks to 56x56px pill showing recording status dot
- **Toggle**: Click pill or global shortcut `Ctrl+Shift+M`
- **System tray**: Icon with context menu (Show/Hide, Start/Stop, Profiles, Quit)
- **Drag**: Custom drag region in TitleBar component

---

## Recording Lifecycle

1. User selects profile from dropdown, clicks **Start**
2. Main process creates session in SQLite (status: `recording`)
3. Sidecar starts capturing system audio, streaming PCM chunks
4. TranscriptionService connects WebSocket, forwards audio as base64
5. Transcript deltas stream to React UI in real time
6. User clicks **Stop**
7. Sidecar stops capture, WebSocket closes
8. Main process sends transcript to NotesService (LLM)
9. Notes markdown returned, saved to session (status: `completed`)
10. Notes rendered in NotesView via react-markdown

---

## Configuration

| Variable | Default | Source |
|----------|---------|--------|
| `OPENAI_API_KEY` | (required) | `.env` or environment |
| `TRANSCRIPTION_MODEL` | `gpt-4o-transcribe` | `.env` |
| `LLM_MODEL` | `gpt-4o` | `.env` |
| `LLM_ENDPOINT` | `https://api.openai.com/v1/chat/completions` | `.env` |

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No audio device | Sidecar sends error, UI disables Start with message |
| Sidecar crash | AudioBridgeService restarts once, then shows error |
| WebSocket disconnect | Retry 3x (1s/2s/4s backoff), then fail session |
| LLM API error | Session saved as `failed`, retry from History |
| Unhandled exception | Logged to file, error toast in UI |

---

## Packaging

- **Dev**: `npm run dev` (electron-vite dev server + HMR)
- **Build**: `npm run build` (Vite build + Electron compile)
- **Package**: `npm run package` (electron-builder -> NSIS installer)
- **Sidecar**: `dotnet publish -r win-x64 -c Release --self-contained -p:PublishSingleFile=true`
- Sidecar exe bundled via `extraResources` in electron-builder config
