# ReadNLearn User Guide

## Getting Started

### Installation

1. Download the latest release from the GitHub repository
2. Install the application on your system
3. Launch ReadNLearn

### First Time Setup

1. **Create Account**: Sign up with your email address
2. **Language Settings**: Set your native language (L1) and target language (L2)
3. **Provider Configuration**: Set up your API keys for cloud providers (optional)

## Core Features

### Reading Mode

The main reading interface where you can:

- **Load Text**: Import text files (.txt, .md) or use sample texts
- **Select Phrases**: Click and drag to select phrases you want to learn
- **Save Phrases**: Add phrases to your learning collection with automatic translation
- **View Annotations**: See saved phrases highlighted in the text with markers

#### How to Use Reading Mode

1. Load a text file using the "Load File" button
2. Select phrases by clicking and dragging over text
3. Click "Add Phrase" in the popup dialog
4. The phrase will be automatically translated and saved
5. Saved phrases appear highlighted in the text with numbered markers

### Dictionary Mode

Browse and manage all your saved phrases:

- **Search**: Find phrases by text or translation
- **Filter**: Filter by tags, difficulty, or date added
- **Edit**: Modify translations, add notes, or delete phrases
- **Export**: Export your phrase collection

#### Dictionary Features

- **Search Bar**: Type to search through all phrases
- **Tags**: Organize phrases with custom tags
- **Sorting**: Sort by date, difficulty, or alphabetically
- **Bulk Actions**: Select multiple phrases for batch operations

### Learning Mode

Practice with spaced repetition system:

- **Study Sessions**: Review phrases using cloze exercises and generated stories
- **Progress Tracking**: Monitor your learning progress and statistics
- **Adaptive Scheduling**: Phrases are scheduled based on your performance
- **Story Generation**: AI-generated stories that include your phrases

#### How to Use Learning Mode

1. Click the "Learning" mode button
2. Start a new study session
3. Complete cloze exercises for each phrase
4. Read the generated story with highlighted phrases
5. Grade your performance (1-4 scale)
6. Review your session statistics

## Study System

### Spaced Repetition Algorithm (SM-2)

The app uses the SuperMemo 2 algorithm to schedule phrase reviews:

- **Grade 1 (Again)**: Complete blackout - review in 1 day
- **Grade 2 (Hard)**: Incorrect response - review in 1 day
- **Grade 3 (Good)**: Correct after hesitation - review in 6 days
- **Grade 4 (Easy)**: Perfect response - review in 15+ days

### Study Session Flow

1. **Cloze Exercises**: Fill-in-the-blank exercises for each phrase
2. **Story Generation**: AI creates a story including all phrases
3. **Story Review**: Read the story with phrase highlights and glosses
4. **Grading**: Rate your overall understanding (1-4)
5. **SRS Update**: Algorithm updates review schedules based on performance

## Settings

### Language Settings

- **L1 (Native Language)**: Your primary language
- **L2 (Target Language)**: Language you're learning
- **Auto-detect L2**: Automatically detect target language from text
- **Explanation Mode**: When L1=L2, show explanations instead of translations

### Provider Settings

Configure cloud providers for enhanced features:

#### OpenAI (Required for Learning Mode)

- **API Key**: Your OpenAI API key
- **Model**: Choose between GPT-4, GPT-3.5-turbo
- **Usage Limits**: Set daily/monthly spending limits

#### Translation Services

- **DeepL**: High-quality translations (recommended)
- **Google Translate**: Free alternative
- **Usage Limits**: Set translation limits

#### Text-to-Speech (Optional)

- **AWS Polly**: Generate audio for stories
- **Voice Selection**: Choose voice for target language
- **Audio Quality**: Balance quality vs. cost

### Cost Controls

- **Daily Limits**: Set maximum daily spending per provider
- **Monthly Limits**: Set maximum monthly spending
- **Usage Tracking**: Monitor your API usage and costs
- **Alerts**: Get notified when approaching limits

## Tips for Effective Learning

### Phrase Selection

- Choose phrases that are new or challenging
- Include context when possible
- Don't save too many phrases at once
- Focus on phrases you encounter naturally

### Study Sessions

- Study regularly (daily is best)
- Be honest with your grading
- Don't rush through exercises
- Take breaks between sessions

### Story Generation

- Stories help with context and retention
- Read stories aloud for pronunciation practice
- Use TTS to hear proper pronunciation
- Focus on how phrases are used in context

## Troubleshooting

### Common Issues

**Phrases not saving**

- Check your internet connection
- Verify API keys are configured
- Try refreshing the page

**Translations not appearing**

- Check translation provider settings
- Verify API keys are valid
- Check usage limits

**Study mode not working**

- Ensure you have saved phrases
- Check OpenAI API key configuration
- Verify you have phrases due for review

**Performance issues**

- Clear browser cache
- Check available disk space
- Close other applications

### Getting Help

- **Documentation**: Check the online documentation
- **Community**: Join the Discord server
- **Issues**: Report bugs on GitHub
- **Support**: Contact support for technical issues

## Privacy and Security

### Data Storage

- Your phrases are stored securely in Supabase
- Local caching for offline access
- No data is shared with third parties

### API Keys

- Keys are stored securely in your system
- Never shared with the application servers
- You can revoke keys at any time

### Usage Tracking

- Only basic usage statistics are collected
- No personal data is tracked
- You can opt out of analytics

## Advanced Features

### Keyboard Shortcuts

- `Ctrl+O`: Open file
- `Ctrl+S`: Save current session
- `Ctrl+N`: New phrase
- `Ctrl+F`: Search phrases
- `Ctrl+L`: Toggle learning mode

### Import/Export

- **CSV Export**: Export phrases to spreadsheet
- **JSON Export**: Full data export
- **Anki Integration**: Export to Anki flashcards
- **Backup**: Regular automatic backups

### Customization

- **Themes**: Light and dark themes
- **Fonts**: Customize reading fonts
- **Layout**: Adjust pane sizes
- **Notifications**: Configure toast notifications

## Best Practices

### Learning Strategy

1. **Start Small**: Begin with 5-10 phrases per session
2. **Consistency**: Study daily for best results
3. **Context**: Always include context when saving phrases
4. **Review**: Regularly review old phrases
5. **Practice**: Use phrases in real conversations

### Content Selection

- **Authentic Materials**: Use real texts, not textbooks
- **Interest-Based**: Choose topics you're interested in
- **Difficulty**: Mix easy and challenging phrases
- **Variety**: Include different types of phrases

### Study Habits

- **Regular Schedule**: Study at the same time daily
- **Focused Sessions**: 15-30 minutes is optimal
- **Active Learning**: Engage with the content
- **Real Application**: Use phrases in real situations

## FAQ

**Q: How many phrases should I save per day?**
A: Start with 5-10 phrases and adjust based on your schedule and retention.

**Q: Can I use the app offline?**
A: Yes, saved phrases and basic functionality work offline. Cloud features require internet.

**Q: How much does it cost to use?**
A: The app is free. You only pay for cloud provider usage (OpenAI, DeepL, etc.).

**Q: Can I import my existing vocabulary?**
A: Yes, you can import from CSV files or other vocabulary apps.

**Q: Is my data safe?**
A: Yes, your data is encrypted and stored securely. You control your API keys.

**Q: Can I use it for multiple languages?**
A: Yes, you can learn multiple languages by switching L2 settings.

**Q: How accurate are the translations?**
A: Very accurate, especially with DeepL. Google Translate is good for basic phrases.

**Q: Can I share my progress with others?**
A: Currently no, but this feature is planned for future versions.
