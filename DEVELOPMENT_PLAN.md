# ReadNLearn Development Plan

## Current Status Analysis

### ✅ Implemented Features (Stage 0 - Foundation)

- **Core Application**: Tauri + React + TypeScript + SQLite
- **UI/UX**: Two-pane layout, dark/light themes, responsive design
- **Internationalization**: L1/L2 language support with 6 languages (EN, ES, FR, DE, IT, PT)
- **Text Reader**: Markdown rendering, file loading (.txt/.md), sample texts
- **Phrase Management**: Save phrases with position tracking, SQLite persistence
- **Dictionary Mode**: Phrase listing with search, filtering, and removal
- **Settings**: Persistent configuration, font selection, window state
- **Testing**: Vitest setup with basic test coverage

### 🔧 Current Architecture

```
/app/src/
├── adapters/          # Cloud provider interfaces (empty)
├── components/        # Reusable UI components
├── features/          # Feature modules
│   ├── phrases/      # Dictionary view, phrase cards
│   ├── reader/       # Text rendering, phrase selection
│   ├── settings/     # Language, theme, font controls
│   └── study/        # Learning mode (placeholder)
├── lib/              # Core business logic
│   ├── db/          # SQLite operations, phrase storage
│   ├── i18n/        # Internationalization
│   ├── settings/    # Settings management
│   ├── phrases/     # Phrase position calculation
│   └── state/       # App mode management
└── types/           # TypeScript definitions
```

## Development Roadmap

### 🎯 Stage 1 - MVP (Cloud Providers Only)

**Timeline: 4-6 weeks**

#### Priority 1: Core Infrastructure (Week 1-2)

- [ ] **Provider Adapters**: Implement cloud provider interfaces
    - [ ] OpenAI LLM adapter for story generation
    - [ ] DeepL/Google MT adapter for translations
    - [ ] AWS Polly TTS adapter (optional)
- [ ] **SRS Engine**: Implement SM-2 spaced repetition algorithm
- [ ] **Study Mode**: Cloze exercises and story-based learning
- [ ] **Cost Controls**: Daily token/cost caps, usage tracking

#### Priority 2: Enhanced UX (Week 3-4)

- [ ] **Phrase Dialog**: Improved phrase capture with async translation
- [ ] **Study Session**: Full learning workflow with grading
- [ ] **Settings Panel**: Provider configuration, API key management
- [ ] **Error Handling**: Toast notifications, graceful fallbacks

#### Priority 3: Polish & Testing (Week 5-6)

- [ ] **Comprehensive Testing**: Unit, integration, and E2E tests
- [ ] **Documentation**: User guides, developer docs
- [ ] **Performance**: Optimization, caching strategies
- [ ] **Security**: API key management, data privacy

### 📚 Stage 2 - Enhanced Readers (EPUB & PDF)

**Timeline: 3-4 weeks**

#### Features

- [ ] **EPUB Support**: epub.js integration, chapter navigation
- [ ] **PDF Support**: pdf.js integration, text selection
- [ ] **Library Management**: File organization, bookmarks
- [ ] **Anchor System**: Stable phrase positioning across formats

### 🏠 Stage 3 - Local Providers (Offline Mode)

**Timeline: 4-6 weeks**

#### Features

- [ ] **Local LLM**: llama.cpp integration for story generation
- [ ] **Local MT**: Marian/NLLB for offline translation
- [ ] **Local TTS**: Piper/eSpeak for audio generation
- [ ] **Provider Registry**: Dynamic provider switching

### 🔗 Stage 4 - Integrations & Export

**Timeline: 2-3 weeks**

#### Features

- [ ] **Anki Integration**: AnkiConnect for card export
- [ ] **Import/Export**: CSV, TSV, JSON formats
- [ ] **Data Migration**: Cross-platform data portability

## Technical Implementation Strategy

### 🏗️ Architecture Principles

1. **Adapter Pattern**: All external services use pluggable interfaces
2. **Local-First**: SQLite as primary storage, cloud as enhancement
3. **Type Safety**: Comprehensive TypeScript coverage
4. **Testing**: 80%+ code coverage with meaningful tests
5. **Performance**: Lazy loading, virtualization, efficient rendering

### 🧪 Testing Strategy

- **Unit Tests**: All utilities, hooks, and pure functions
- **Integration Tests**: Component interactions, data flow
- **E2E Tests**: Critical user workflows
- **Performance Tests**: Large document handling, memory usage

### 📊 Quality Metrics

- **Code Coverage**: >80% for business logic
- **Performance**: <100ms phrase save, <500ms study session start
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: No secrets in code, secure API key storage

## Immediate Next Steps

### Week 1: Foundation Enhancement

1. **Add Comprehensive Comments**: Document all existing code
2. **Expand Test Suite**: Cover all components and utilities
3. **Provider Interfaces**: Define and implement adapter contracts
4. **SRS Implementation**: Core spaced repetition algorithm

### Week 2: Core Features

1. **Study Mode**: Complete learning workflow
2. **Provider Integration**: Connect to cloud services
3. **Enhanced UX**: Improved phrase capture and management
4. **Settings Panel**: Provider configuration interface

### Success Criteria

- [ ] All existing code thoroughly documented
- [ ] Test coverage >80% for core functionality
- [ ] Study mode fully functional with cloud providers
- [ ] Settings panel allows provider configuration
- [ ] Performance meets target metrics

## Risk Mitigation

### Technical Risks

- **Provider Rate Limits**: Implement exponential backoff, caching
- **Performance**: Use virtualization for large phrase lists
- **Data Loss**: Robust SQLite backup and recovery
- **API Changes**: Version pinning, adapter abstraction

### Business Risks

- **User Adoption**: Focus on core learning workflow
- **Competition**: Emphasize local-first, privacy-focused approach
- **Maintenance**: Comprehensive documentation and testing

## Long-term Vision

### 6 Months

- Complete Stage 1-2 with robust cloud and local providers
- Active user community with feedback integration
- Performance optimizations and mobile considerations

### 12 Months

- Full Stage 3-4 implementation with local providers
- Plugin ecosystem for custom adapters
- Advanced learning features (spaced repetition variants, analytics)

### 24 Months

- Multi-platform support (mobile, web)
- Advanced integrations (Anki, Notion, Obsidian)
- AI-powered learning recommendations
- Community features and sharing
