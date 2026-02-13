# MeetingAssistant -- Architecture Context

> **Purpose**: Windows-only AI meeting assistant. Captures system audio, transcribes in real time, generates structured meeting notes via LLM, persists sessions locally. One-click export to Slack and Notion.
> **UI**: Electron + React transparent floating overlay (Cluely-style), pinned to right edge, collapsible to a pill.
> **Audio**: C# .NET 8 sidecar using NAudio WasapiLoopbackCapture, communicates with Electron via stdio JSON lines.
> **Multi-provider**: Transcription via OpenAI Realtime or Deepgram. Notes via OpenAI-compatible providers (OpenAI, OpenRouter, Groq, Together, Fireworks, Ollama, Kimi, Gemini, GLM, DeepSeek, Mistral, Perplexity, xAI, etc.) or Anthropic Claude. Per-profile LLM overrides supported.

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
│  │ (child process) │   │ (ipcMain.handle)    │   │ sql.js (WASM) │  │
│  └────────────────┘   └──────────┬──────────┘   └───────────────┘  │
│                                   │                                  │
│  ┌────────────────┐   ┌──────────┴──────────┐   ┌───────────────┐  │
│  │ AuditService   │   │ IntegrationService  │   │ Terminology   │  │
│  │ (structured    │   │ Slack / Notion      │   │ Store         │  │
│  │  audit log)    │   │ export              │   │ (hints)       │  │
│  └────────────────┘   └─────────────────────┘   └───────────────┘  │
│                                   │ contextBridge                    │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────┐
│                     Electron Renderer (React + Vite)                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Overlay Panel │  │ Transcript   │  │ Notes View   │              │
│  │ (glassmorphism│  │ View (live)  │  │ (Markdown)   │              │
│  │  400px right) │  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Control Bar   │  │ Profile      │  │ Session      │              │
│  │ Start/Stop    │  │ Editor + LLM │  │ History +    │              │
│  │               │  │ Overrides    │  │ Search       │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Export Bar    │  │ Settings +   │  │ Session      │              │
│  │ Slack/Notion/ │  │ Terminology  │  │ Detail +     │              │
│  │ Copy/Save     │  │ + Retention  │  │ Feedback     │              │
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
| HTTP | Node.js fetch | LLM notes + integration APIs |
| Database | sql.js (WASM) | Local SQLite persistence |
| Audio Capture | NAudio 2.2+ (C#/.NET 8) | WasapiLoopbackCapture |
| IPC Sidecar | child_process stdio | JSON lines over stdin/stdout |
| Build | electron-vite + electron-builder | Dev server + packaging |

---

## Phase 1 Features (VC-Scale Additions)

### Regenerate Notes
- Failed or completed sessions can regenerate notes from the Session Detail view.
- Uses the same `notes:generate` IPC handler; profile's LLM config applied.

### Searchable Session History
- Full-text search across profile name, title, transcript text, and notes markdown.
- `SessionStore.search()` uses SQL `LIKE` queries.
- Real-time search-as-you-type in the SessionHistory component.

### Structured Action Items
- Default profile prompts extract structured action items with **Task**, **Owner**, and **Due Date**.
- Three seed profiles: General Meeting, Engineering Standup, Sales Call.

### Notes Feedback Loop
- Thumbs up/down feedback on generated notes, stored per session.
- Schema: `FeedbackRating INTEGER, FeedbackText TEXT` on MeetingSessions.
- Builds a dataset for future personalization and quality evaluation.

### Per-Profile LLM Overrides
- Each profile can override the global LLM provider, model, and endpoint.
- Schema: `LlmProviderOverride, LlmModelOverride, LlmEndpointOverride` on PromptProfiles.
- NotesService receives config overrides when generating notes.

### Terminology / Glossary Store
- Users add product names, people, jargon via Settings.
- Terminology is injected into both transcription prompts and notes system prompts.
- Schema: `Terminology(Id, Term, Definition, CreatedAt)`.

### One-Click Slack Export
- Send meeting notes to a Slack channel via incoming webhook.
- Configurable via Settings (`slack_webhook_url`).
- Formats notes as Slack Block Kit (header + sections).

### One-Click Notion Export
- Create a Notion page in a database with meeting notes.
- Configurable via Settings (`notion_api_key`, `notion_database_id`).
- Converts markdown headings and bullets to Notion blocks.

### System Tray Quick Actions
- Start Recording submenu with profile selection.
- Stop Recording when active.
- Dynamic menu updates based on recording state.

### Security Hardening
- IPC settings key allowlist (rejects arbitrary key writes).
- Input validation on all IPC handlers (type checks, non-empty strings).
- Audit logging of all security-relevant events.

### Audit Logging
- `AuditLog` table: timestamp, action, resource, resourceId, details.
- Logs: app start, recording start/stop, notes generation, exports, feedback, settings changes, data purge.

### Data Retention Policy
- Configurable auto-delete of sessions older than N days.
- Runs on app startup; configurable via Settings (`retention_days`).
- Audit-logged.

### Toast Notifications
- In-app toast system for copy confirmations, export results, errors.
- Auto-dismiss after 2.5 seconds with slide-up animation.

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
| **OpenAI-Compatible** | Any model at any endpoint that speaks the OpenAI Chat Completions format: OpenAI, OpenRouter, Groq, Together AI, Fireworks, Ollama (`localhost:11434`), Kimi, Gemini, GLM, DeepSeek, Mistral, Perplexity, xAI, LM Studio, vLLM | `POST /v1/chat/completions` |
| **Anthropic Claude** | claude-sonnet-4-20250514, claude-3-5-sonnet, claude-3-5-haiku | `POST /v1/messages` with `x-api-key` |

Implementation: `src/main/services/NotesService.ts` -- branches on effective provider (global or per-profile override).

### Integrations

| Integration | Protocol | Configuration |
|-------------|----------|---------------|
| **Slack** | Incoming Webhook (POST) | `slack_webhook_url` in Settings |
| **Notion** | REST API v2022-06-28 | `notion_api_key` + `notion_database_id` in Settings |

Implementation: `src/main/services/IntegrationService.ts`

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

## Data Models

### PromptProfile

```typescript
interface PromptProfile {
  id: string;                       // UUID
  name: string;                     // "Engineering Standup", "Sales Call"
  transcriptionPrompt: string;      // keyword hints for transcription
  notesPrompt: string;              // system instructions for LLM notes
  outputFormat: string;             // "markdown"
  llmProviderOverride?: string;     // per-profile LLM provider
  llmModelOverride?: string;        // per-profile LLM model
  llmEndpointOverride?: string;     // per-profile LLM endpoint
  createdAt: string;                // ISO 8601
  updatedAt: string;
}
```

### MeetingSession

```typescript
interface MeetingSession {
  id: string;
  profileId: string;
  profileName: string;
  title?: string;
  startedAt: string;
  endedAt?: string;
  transcriptText: string;
  notesMarkdown?: string;
  status: 'recording' | 'generating' | 'completed' | 'failed';
  feedbackRating?: number;          // +1 (good) or -1 (poor)
  feedbackText?: string;
}
```

### TerminologyEntry

```typescript
interface TerminologyEntry {
  id: string;
  term: string;
  definition?: string;
  createdAt: string;
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
    LlmProviderOverride TEXT,
    LlmModelOverride TEXT,
    LlmEndpointOverride TEXT,
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS MeetingSessions (
    Id TEXT PRIMARY KEY,
    ProfileId TEXT NOT NULL,
    ProfileName TEXT NOT NULL,
    Title TEXT,
    StartedAt TEXT NOT NULL,
    EndedAt TEXT,
    TranscriptText TEXT DEFAULT '',
    NotesMarkdown TEXT,
    Status TEXT NOT NULL DEFAULT 'recording',
    FeedbackRating INTEGER,
    FeedbackText TEXT,
    FOREIGN KEY (ProfileId) REFERENCES PromptProfiles(Id)
);

CREATE TABLE IF NOT EXISTS AppSettings (
    Key TEXT PRIMARY KEY,
    Value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS AuditLog (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Timestamp TEXT NOT NULL,
    Action TEXT NOT NULL,
    Resource TEXT NOT NULL,
    ResourceId TEXT,
    Details TEXT
);

CREATE TABLE IF NOT EXISTS Terminology (
    Id TEXT PRIMARY KEY,
    Term TEXT NOT NULL UNIQUE,
    Definition TEXT,
    CreatedAt TEXT NOT NULL
);
```

Database location: `%LOCALAPPDATA%/MeetingAssistant/data/meetings.db`

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
│   │   ├── index.ts                   # Entry: app lifecycle, window, tray, shortcuts, retention
│   │   ├── window.ts                  # Overlay BrowserWindow factory
│   │   ├── tray.ts                    # System tray icon + context menu + quick actions
│   │   ├── services/
│   │   │   ├── AudioBridgeService.ts  # Spawns C# sidecar, reads audio
│   │   │   ├── TranscriptionService.ts# WebSocket to OpenAI Realtime API
│   │   │   ├── NotesService.ts        # LLM notes with per-profile overrides + terminology
│   │   │   ├── ProfileStore.ts        # Profile CRUD + LLM override fields
│   │   │   ├── SessionStore.ts        # Session CRUD + search + feedback + retention
│   │   │   ├── SettingsStore.ts       # App settings (keys, models, providers, integrations)
│   │   │   ├── AuditService.ts        # Structured audit logging
│   │   │   ├── TerminologyStore.ts    # Terminology/glossary store
│   │   │   ├── IntegrationService.ts  # Slack + Notion export
│   │   │   └── DatabaseInit.ts        # Schema + migrations + seed data
│   │   └── ipc/
│   │       ├── channels.ts            # IPC channel constants (50+ channels)
│   │       └── handlers.ts            # ipcMain.handle + security hardening
│   │
│   ├── preload/
│   │   └── index.ts                   # contextBridge API exposure (30+ methods)
│   │
│   └── renderer/                      # React app
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── OverlayPanel.tsx       # Glass container + toast notifications
│       │   ├── CollapsedPill.tsx      # Minimized recording pill
│       │   ├── TitleBar.tsx           # Custom frameless title bar
│       │   ├── TranscriptView.tsx     # Live auto-scrolling transcript
│       │   ├── NotesView.tsx          # Rendered Markdown viewer
│       │   ├── ControlBar.tsx         # Start/Stop + profile dropdown
│       │   ├── ProfileEditor.tsx      # CRUD + per-profile LLM overrides
│       │   ├── SessionHistory.tsx     # Session list + real-time search
│       │   ├── SessionDetail.tsx      # Notes + transcript + regenerate + feedback + export
│       │   ├── StatusIndicator.tsx    # Pulsing recording dot
│       │   ├── ExportBar.tsx          # Copy / Save .md / Slack / Notion
│       │   └── SettingsView.tsx       # Providers + integrations + terminology + retention
│       ├── hooks/
│       │   ├── useRecording.ts
│       │   ├── useProfiles.ts
│       │   ├── useSessions.ts         # + searchSessions
│       │   └── useTranscript.ts
│       ├── stores/
│       │   └── appStore.ts            # Zustand global state + toast + terminology
│       ├── types/
│       │   ├── index.ts               # Shared interfaces (extended)
│       │   └── window.d.ts            # ElectronAPI type declarations
│       └── styles/
│           └── globals.css            # Tailwind + glassmorphism + toast animation
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

- **Position**: Right edge of screen, 12px margin, 400px wide, ~720px tall
- **Style**: Frameless, transparent background, always-on-top (screen-saver level)
- **Collapse**: Shrinks to 60x60px pill showing recording status dot
- **Toggle**: Click pill or global shortcut `Ctrl+Shift+M`
- **System tray**: Icon with context menu (Show/Hide, Start/Stop with profile picker, Quit)
- **Drag**: Custom drag region in TitleBar component

---

## Recording Lifecycle

1. User selects profile from dropdown (or tray submenu), clicks **Start**
2. Main process creates session in SQLite (status: `recording`)
3. Terminology hints injected into transcription prompt
4. Sidecar starts capturing system audio, streaming PCM chunks
5. TranscriptionService connects WebSocket, forwards audio as base64
6. Transcript deltas stream to React UI in real time
7. User clicks **Stop**
8. Sidecar stops capture, WebSocket closes
9. Main process sends transcript to NotesService (LLM) with profile's LLM config
10. Notes markdown returned, saved to session (status: `completed`)
11. Notes rendered in NotesView via react-markdown
12. User can regenerate, provide feedback, or export to Slack/Notion

---

## Configuration

| Variable | Default | Source |
|----------|---------|--------|
| `OPENAI_API_KEY` | (required) | `.env` or Settings |
| `TRANSCRIPTION_MODEL` | `gpt-4o-transcribe` | `.env` or Settings |
| `LLM_MODEL` | `gpt-4o` | `.env` or Settings |
| `LLM_ENDPOINT` | `https://api.openai.com/v1/chat/completions` | `.env` or Settings |
| `DEEPGRAM_API_KEY` | (optional) | `.env` or Settings |
| `ANTHROPIC_API_KEY` | (optional) | `.env` or Settings |
| `SLACK_WEBHOOK_URL` | (optional) | Settings |
| `NOTION_API_KEY` | (optional) | Settings |
| `NOTION_DATABASE_ID` | (optional) | Settings |
| `RETENTION_DAYS` | (optional) | Settings |

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No audio device | Sidecar sends error, UI disables Start with message |
| Sidecar crash | AudioBridgeService restarts once, then shows error |
| WebSocket disconnect | Retry 3x (1s/2s/4s backoff), then fail session |
| LLM API error | Session saved as `failed`, regenerate from Session Detail |
| Integration export fail | Toast notification with error message |
| Invalid IPC input | Rejected with validation error, audit-logged |
| Unhandled exception | Logged to console, error toast in UI |

---

## Security

- IPC settings key allowlist prevents arbitrary writes to AppSettings
- All IPC handlers validate input types and non-empty strings
- AuditLog tracks all security-relevant operations
- API keys stored locally in SQLite (future: OS keychain)
- Context isolation enabled; nodeIntegration disabled

---

## Packaging

- **Dev**: `npm run dev` (electron-vite dev server + HMR)
- **Build**: `npm run build` (Vite build + Electron compile)
- **Package**: `npm run package` (electron-builder -> NSIS installer)
- **Sidecar**: `dotnet publish -r win-x64 -c Release --self-contained -p:PublishSingleFile=true`
- Sidecar exe bundled via `extraResources` in electron-builder config
