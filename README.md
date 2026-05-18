# Local LLM — a private, offline ChatGPT-style mobile app

> [!NOTE]
> THIS IS A VIBE CODED APP. Currently I understand the architecture, but I don't understand the code a to z, but i will try to. If I do, I will update the README.md informing you 🥲

A React Native (Expo SDK 55) app that runs a multimodal LLM locally on the
device using [Cactus Compute](https://docs.cactuscompute.com/). All chats,
messages, attachments, and settings live in on-device SQLite. After the
one-time model download, the app works fully offline. There is no cloud
fallback, no telemetry, no analytics, and no remote logging.

- **Model:** `google/gemma-4-E2B-it` (Cactus alias `gemma-4-e2b-it`)
- **Runtime:** `cactus-react-native` + `react-native-nitro-modules`
- **Storage:** `expo-sqlite` (WAL) + `expo-file-system` (attachments on disk)
- **UI:** all custom in-project components built on React Native primitives
- **Network use:** only the one-time model download

> The app does not ship the model in the binary. After install, you are
> prompted to download `google/gemma-4-E2B-it` once. Every later inference
> runs locally.

---

## Requirements

- Node.js 20+
- macOS with Xcode 16+ (for iOS) and/or Android Studio Ladybug+ (for Android)
- CocoaPods (`brew install cocoapods`) for iOS native builds
- Watchman recommended on macOS
- A real device or a fully-provisioned simulator/emulator — `cactus-react-native`
  uses Nitro Modules with native code, so **Expo Go is not supported**

## Setup

```sh
# 1. Install JS dependencies
npm install

# 2. Generate the native iOS/Android projects from the Expo config
npx expo prebuild --clean

# 3. Install iOS CocoaPods (macOS only)
cd ios && pod install && cd ..

# 4. Run a dev build on a device or simulator
npm run ios        # or
npm run android
```

The first launch will:

1. Open the SQLite database, run migrations, and seed local settings.
2. Show the **On-device model** screen.
3. Download `google/gemma-4-E2B-it` once. Progress is persisted across restarts.
4. Initialize the model.
5. From then on, the app works completely offline.

## How model download works

Tapping **Download model** calls `CactusLM.download({ onProgress })`. Cactus
fetches the model artifacts and stores them in the device's app sandbox. The
download progress is persisted to the `model_state` table so the UI can resume
showing the right state across launches.

Once `isDownloaded` is true, the app never makes another outbound network
request. All `complete()` calls force these flags so cloud handoff is impossible:

```ts
{
  telemetryEnabled: false,
  confidenceThreshold: 0,
}
```

Both are merged into the options on every call inside `src/ai/cactusClient.ts`,
so call sites cannot accidentally re-enable them.

## Offline / privacy guarantees

- No telemetry, analytics, or remote logging is sent from this app.
- Cloud handoff is disabled at the SDK call level on every request.
- Threads, messages, and attachment metadata live in `expo-sqlite` inside the
  app sandbox.
- Attachments themselves live on disk under
  `${documentDirectory}/attachments/<threadId>/<attachmentId>.<ext>` and are
  referenced from SQLite — they are never uploaded.
- Settings (theme, inference parameters, etc.) live in the local `settings`
  table.
- The only outbound network use after install is the one-time model download.
  After that, the app does not need internet to function.
- **Delete all local data** from Settings clears all chats, attachments, the
  RAG corpus, and persisted settings.
- **Delete local model** removes the on-device model file and resets model
  state. You can re-download later.

## Supported modalities

| Kind             | Behavior                                                                                |
| ---------------- | --------------------------------------------------------------------------------------- |
| Images           | Sent to the local model as vision input via `complete({ images: [path] })`.             |
| Audio            | Stored locally and shown in the message. Audio understanding is disabled in this build. |
| Video            | Stored locally and shown in the message. Video understanding is not supported.          |
| PDFs / Documents | Stored locally. PDF text extraction is not bundled (no extractor dep).                  |

Unsupported modalities never crash and always produce a clear inline message
("Stored locally but not processed: …"). The system prompt instructs the model
to acknowledge unsupported modalities honestly.

## Known limitations

- **Expo Go is unsupported.** You must run a development build via
  `npx expo prebuild` + `npm run ios` / `npm run android`.
- **Audio understanding.** Cactus's Gemma 4 endpoint accepts raw 16-bit PCM
  samples. The app does not bundle a JS-side audio decoder, so audio
  attachments are stored and previewed only.
- **PDF / document text.** No PDF parser is bundled, so PDF/document files are
  stored locally with a clear "not processed" message.
- **Video understanding.** Local video understanding is not in scope for this
  build.
- **RAG.** Cactus's built-in corpus dir / `ragQuery` is wired up but the app
  does not auto-add documents to it. Save-to-memory affordances can be built on
  top of `src/ai/rag.ts` (`saveCorpusNote`) without adding new dependencies.

## Project layout

```
src/
  app/                       Expo Router file-system routes
    _layout.tsx              Providers + root <Stack/>
    index.tsx                Redirect to /chat
    chat/_layout.tsx         Stack for chat routes
    chat/index.tsx           Empty-state new chat
    chat/[threadId].tsx      Thread chat screen
    model.tsx                Download / initialize model
    settings.tsx             Theme, inference params, data controls
  providers/
    ThemeProvider.tsx        System / light / dark, persisted
    DatabaseProvider.tsx     Opens SQLite, runs migrations, exposes repos
    CactusProvider.tsx       Model state + generation controller singleton
  components/
    chat/                    ChatScreen, ChatHeader, ThreadDrawer, MessageList,
                             MessageBubble, Composer, AttachmentPreview,
                             StreamingCursor, ModelGate, ThreadListItem
    common/                  Button, IconButton, Modal, TextInput, Surface,
                             EmptyState, LoadingState, ErrorBoundary, Icons,
                             Divider, ProgressBar
  db/
    sqlite.ts                Singleton DB factory
    migrations.ts            Versioned migrations runner (v1 schema)
    repositories/            threadsRepo, messagesRepo, attachmentsRepo,
                             settingsRepo, modelStateRepo
  ai/
    cactusClient.ts          CactusLM wrapper; forces telemetry/cloud off
    promptBuilder.ts         System prompt + recent N + attachment summaries
    generationController.ts  Send, regenerate, edit, cancel orchestration
    attachmentPipeline.ts    Kind detection + copy-into-docs
    rag.ts                   Corpus dir + ragQuery passthrough
  hooks/
    useTheme, useDatabase, useCactus, useThreads, useMessages,
    useChatGeneration, useModelState, useSettings
  native/
    sqlite.ts                Thin execute/query/transaction over expo-sqlite
    fileStore.ts             Attachments / models / corpus dir helpers
  theme/                     Colors (light/dark), spacing, typography
  utils/                     ids, time, errors, json
```

## Database schema (v1)

Created by `src/db/migrations.ts` inside a transaction.

- `threads(id PK, title, created_at, updated_at, pinned, archived)`
- `messages(id PK, thread_id FK→threads CASCADE, role CHECK, content,
status CHECK, error, created_at, updated_at, parent_message_id,
metadata_json)`
- `attachments(id PK, message_id FK→messages CASCADE, thread_id FK→threads
CASCADE, kind CHECK, mime_type, filename, local_uri, size_bytes,
extracted_text, processing_status, created_at, metadata_json)`
- `settings(key PK, value)`
- `model_state(model_id PK, display_name, local_alias, downloaded, initialized,
download_progress, local_path, updated_at)`

Indexes:

- `idx_threads_updated_at`
- `idx_threads_pinned_updated_at`
- `idx_messages_thread_created`
- `idx_attachments_message`
- `idx_attachments_thread`

Pragmas applied per open:

- `PRAGMA journal_mode = WAL`
- `PRAGMA foreign_keys = ON`
- `PRAGMA synchronous = NORMAL`
- `PRAGMA temp_store = MEMORY`

## Generation flow

1. User taps **Send**.
2. `GenerationController.start` inserts the user message (`complete`) and a
   blank assistant placeholder (`streaming`) in SQLite.
3. The recent context (`settings.contextMessageLimit` messages) is loaded and
   passed through `PromptBuilder.buildChatPrompt` along with the required
   system prompt and any attachment summaries.
4. `CactusClient.complete({ messages, onToken })` streams tokens. Each token
   is mirrored to UI state immediately and flushed to SQLite every ~80ms.
5. On completion, the assistant message status flips to `complete`; the thread
   `updated_at` is bumped; if it was the first message in the thread, a short
   title is generated locally and saved.
6. **Stop** during streaming calls `CactusClient.stop()` and finalizes the
   assistant message as `cancelled`.
7. **Regenerate** deletes the failed/last assistant message and re-runs the
   stream.
8. **Edit message** updates the user message, deletes everything after it,
   then regenerates.

## Inference settings

Editable from **Settings → Inference**. All values are persisted in the
`settings` table and validated/clamped on read.

- `contextMessageLimit` — how many recent messages to include in the prompt.
- `temperature`, `topP`, `topK` — sampler parameters.
- `maxTokens` — hard ceiling on tokens generated per response.

## Data deletion

From **Settings**:

- **Delete local model** — removes the model from device and resets model
  state. Other local data is kept.
- **Delete all local data** — wipes every chat, message, attachment, saved
  memory, and setting. The model file is kept unless you also delete it.

## Scripts

- `npm run ios` — build & run iOS dev client.
- `npm run android` — build & run Android dev client.
- `npm run prebuild` — regenerate native projects from the Expo config (use
  after editing `app.json`).
- `npm run start` — start the Metro dev server.
- `npm run lint` — `expo lint`.

## License & assets

This app does not use OpenAI or ChatGPT names, logos, icons, or copyrighted
assets. All UI is custom React Native, with simple Unicode glyph icons.
