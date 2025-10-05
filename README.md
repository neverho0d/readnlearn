# ReadNLearn - Text Reader with Learning Support

A local-first phrase book with cloud providers (LLM/MT/TTS) for memorizing via short stories + cloze, then extend to readers (EPUB/PDF), local engines, and integrations (Anki, etc.).

## Tech Stack

- **Frontend**: React 18 + TypeScript + Chakra UI v3
- **Desktop**: Tauri (Rust-based)
- **Database**: SQLite (better-sqlite3)
- **State Management**: Zustand
- **Testing**: Vitest + Testing Library
- **Cloud Providers**: OpenAI v6, DeepL, Google Translate

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. Run development server:
   ```bash
   npm run tauri:dev
   ```

4. Run tests:
   ```bash
   npm run test
   ```

## Project Structure

