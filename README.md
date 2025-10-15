---
[![CI/CD Pipeline](https://github.com/neverho0d/readnlearn/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/neverho0d/readnlearn/actions/workflows/ci.yml)
---

# ReadNLearn - Text Reader with Learning Support

A cloud-first phrase book with offline cache and cloud providers (LLM/MT/TTS) for memorizing via short stories + cloze, then extend to readers (EPUB/PDF), local engines, and integrations (Anki, etc.).

## Tech Stack

- **Frontend**: React 19 + TypeScript + Chakra UI v3
- **Desktop**: Tauri (Rust-based)
- **Database**: Supabase (PostgreSQL with PGroonga FTS)
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
    cp env.example .env
    # Edit .env with your Supabase URL and API keys
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

```shell
/app
  /src
    /adapters          # Cloud provider adapters
    /components        # Reusable UI components
    /features          # Feature-specific components
    /lib               # Core business logic
    /state             # State management
    /types             # TypeScript type definitions
  /tests               # Test files
```
