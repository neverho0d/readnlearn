---
[![CI/CD Pipeline](https://github.com/neverho0d/readnlearn/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/neverho0d/readnlearn/actions/workflows/ci.yml)
---

# ReadNLearn - Intelligent Text Reader with SRS Learning

A cloud-first text reader and phrase book with offline cache and cloud providers (LLM/MT/TTS) for memorizing via Spaced Repetition System (SRS) and cloze deletions.

## Overview

The core concept is to create an intelligent reading assistant that transforms any text into a personalized learning experience. When you encounter unfamiliar phrases while reading, you can capture them with a simple selection, and the application will:

- **Automatically translate and explain** the phrase using AI-powered translation services, using the phrase context to get the best possible translation
- **Create personalized study cards** based on your proficiency level (A1, A2, B1, B2, C1, C2)
- **Target specific learning difficulties** - select areas where you typically struggle (e.g., tense/aspect, gender agreement, word order, prepositions)
- **Personalized explanations** - AI focuses explanations on your selected difficulty areas for more targeted learning
- **Schedule spaced repetition** to ensure long-term retention through scientifically-proven SRS algorithms

This transforms passive reading into active learning, building your vocabulary and comprehension systematically while maintaining the natural flow of reading.

ReadNLearn is an application that helps you learn foreign languages through contextual phrase capture and AI-powered study sessions.

### The application provides

- **Two-pane reading interface** with synchronized text and phrase panels
- **Smart phrase capture** with automatic translation and explanation
- **AI-powered study sessions** with cloze exercises and story generation
- **Spaced repetition system** for optimal learning retention
- **Cloud-first architecture** with offline caching for seamless experience

### Key Features

- **Reading Mode**: Load text files, select phrases, and save them with automatic translation
- **Dictionary Mode**: Search, filter, and manage your saved phrases with advanced full-text search
- **Learning Mode**: Practice with AI-generated cloze exercises and contextual stories
- **Multi-language support** with configurable L1/L2 language pairs
- **Cloud providers**: OpenAI, DeepL, Google Translate integration
- **Offline-first**: Works offline with local caching and sync when online

## Tech Stack

- **Frontend**: React 19 + TypeScript + Chakra UI v3
- **Desktop**: Tauri (Rust-based) with native proxy functions
- **Database**: Supabase (PostgreSQL with PGroonga FTS) + IndexedDB cache
- **State Management**: Zustand + React Context
- **Testing**: Vitest + Testing Library + 90%+ coverage
- **Cloud Providers**: OpenAI v6, DeepL, Google Translate, Amazon Polly (TTS)
- **Authentication**: Supabase Auth with OAuth support
- **Internationalization**: Built-in i18n with L1/L2 language support

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Rust (for Tauri development)
- Supabase account and project

### Installation

1. **Clone and install dependencies:**

    ```bash
    git clone https://github.com/neverho0d/readnlearn.git
    cd readnlearn
    npm install
    ```

2. **Set up environment variables:**

    ```bash
    cp env.example .env
    # Edit .env with your Supabase URL and API keys
    ```

3. **Configure Supabase:**
    - Create a new Supabase project
    - Run the database migrations (see `docs/` folder)
    - Set up authentication providers

4. **Run development server:**

    ```bash
    npm run tauri:dev
    ```

### Testing

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in UI mode
npm run test:ui
```

### Building

```bash
# Build for development
npm run tauri:build

# Pre-release checks
npm run pre-release
```

## Project Structure

```shell
/app
  /src
    /adapters          # Cloud provider adapters (LLM, MT, TTS)
    /components        # Reusable UI components
    /features          # Feature modules (reader, phrases, study, auth, settings)
    /lib               # Core business logic (SRS, database, validation)
    /state             # State management (Zustand stores)
    /types             # TypeScript type definitions
  /tests               # Test files (unit, integration, coverage)
  /docs                # Documentation and setup guides
  /scripts             # Database migrations and utilities
```

## Application Modes

### 📖 Reading Mode

- **Text Loading**: Support for .txt, .md files with format detection
- **Phrase Selection**: Click and drag to select phrases for translation
- **Two-pane Layout**: Synchronized text and phrase panels
- **Decoration System**: Dashed underlines and markers for saved phrases
- **Context Capture**: Automatic context extraction for better translations

### 📚 Dictionary Mode

- **Advanced Search**: Full-text search across phrases, translations, and context
- **Tag Filtering**: Organize phrases with custom tags
- **File Scoping**: Search within current file or across all files
- **Pagination**: Navigate through large phrase collections
- **Bulk Operations**: Manage multiple phrases at once

### 🧠 Learning Mode

- **Study Sessions**: AI-generated cloze exercises and contextual stories
- **SRS Algorithm**: Spaced repetition with SM-2 scheduling
- **Progress Tracking**: Statistics and learning analytics
- **Card Generation**: Automatic card creation from saved phrases
- **Grading System**: 1-4 scale for difficulty assessment

## Architecture

### Database Layer

- **Supabase**: Primary cloud database with PostgreSQL
- **IndexedDB**: Offline cache for desktop applications
- **Real-time Sync**: Bidirectional synchronization
- **Full-text Search**: PGroonga FTS for advanced search capabilities

### Provider System

- **Translation**: DeepL, Google Translate with fallback chains
- **LLM**: OpenAI GPT for story generation and explanations
- **TTS**: Amazon Polly for text-to-speech (optional)
- **Caching**: Intelligent caching to reduce API costs

### Security & Privacy

- **API Key Management**: Secure storage in OS keychain
- **User Authentication**: Supabase Auth with OAuth
- **Data Privacy**: Clear disclosure of cloud provider usage
- **Offline Mode**: Local-only operation when preferred

## Current Status

### ✅ Implemented Features (v0.1.9)

- **Core Reading Interface**: Two-pane layout with phrase capture
- **Dictionary Management**: Advanced search and filtering
- **Study Sessions**: SRS-based learning with cloze exercises
- **Cloud Providers**: OpenAI, DeepL, Google Translate integration
- **Authentication**: Supabase Auth with user management
- **Database**: Full Supabase integration with offline caching
- **Testing**: Comprehensive test suite with 90%+ coverage

### 🚧 In Development

- **TTS Integration**: Amazon Polly text-to-speech support
- **Enhanced UI**: Improved user experience and accessibility
- **Performance**: Optimization for large phrase collections
- **Documentation**: User guides and API documentation

### 📋 Roadmap

- **Stage 2**: EPUB/PDF reader support
- **Stage 3**: Local AI providers (llama.cpp, Marian)
- **Stage 4**: Anki integration and import/export
- **Mobile**: React Native mobile application

## Contributing

We welcome contributions! Please see our [Development Guide](docs/DEVELOPMENT_GUIDE.md) for setup instructions and coding standards.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the full test suite: `npm run ci`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
