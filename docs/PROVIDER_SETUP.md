# Provider Setup Guide

This guide will help you configure cloud providers for enhanced ReadNLearn features.

## Overview

ReadNLearn supports several cloud providers for different features:

- **OpenAI**: Required for learning mode (story generation, cloze exercises)
- **DeepL**: High-quality translations (recommended)
- **Google Translate**: Free translation alternative
- **AWS Polly**: Text-to-speech for audio stories

## OpenAI Setup (Required for Learning Mode)

### Getting an API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to "API Keys" in the left sidebar
4. Click "Create new secret key"
5. Give it a name (e.g., "ReadNLearn")
6. Copy the key (you won't see it again!)

### Configuring in ReadNLearn

1. Open ReadNLearn settings
2. Go to "Providers" tab
3. Enter your OpenAI API key
4. Choose your model:
    - **GPT-4**: Best quality, higher cost
    - **GPT-3.5-turbo**: Good quality, lower cost
5. Set usage limits (recommended: $5-10/month)

### Cost Estimation

- **GPT-4**: ~$0.03 per 1K tokens
- **GPT-3.5-turbo**: ~$0.002 per 1K tokens
- **Typical session**: 100-500 tokens
- **Monthly cost**: $2-10 for regular use

## DeepL Setup (Recommended for Translations)

### Getting an API Key

1. Go to [DeepL API](https://www.deepl.com/pro-api)
2. Sign up for a free account
3. Go to "Account" → "API Keys"
4. Copy your API key

### Configuring in ReadNLearn

1. Open ReadNLearn settings
2. Go to "Providers" tab
3. Enter your DeepL API key
4. Set usage limits (recommended: $2-5/month)

### Cost Estimation

- **Free tier**: 500,000 characters/month
- **Pro tier**: $6.99/month for 1M characters
- **Typical phrase**: 10-50 characters
- **Monthly usage**: Usually within free tier

## Google Translate Setup (Free Alternative)

### Getting an API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Cloud Translation API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the API key

### Configuring in ReadNLearn

1. Open ReadNLearn settings
2. Go to "Providers" tab
3. Enter your Google API key
4. Set usage limits (recommended: $1-3/month)

### Cost Estimation

- **Free tier**: 500,000 characters/month
- **Paid tier**: $20 per 1M characters
- **Monthly cost**: Usually free for personal use

## AWS Polly Setup (Optional for Audio)

### Getting API Credentials

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Create an IAM user with Polly permissions
3. Generate access keys
4. Note your region (e.g., us-east-1)

### Configuring in ReadNLearn

1. Open ReadNLearn settings
2. Go to "Providers" tab
3. Enter your AWS access key
4. Enter your AWS secret key
5. Select your region
6. Set usage limits (recommended: $1-3/month)

### Cost Estimation

- **Standard voices**: $4.00 per 1M characters
- **Neural voices**: $16.00 per 1M characters
- **Typical story**: 100-500 characters
- **Monthly cost**: $1-5 for regular use

## Cost Management

### Setting Limits

1. **Daily Limits**: Prevent overspending
2. **Monthly Limits**: Long-term budget control
3. **Usage Alerts**: Get notified at 80% usage
4. **Provider Priority**: Choose which providers to use

### Recommended Budgets

**Beginner (Light Use)**

- OpenAI: $5/month
- DeepL: Free tier
- Google: Free tier
- **Total**: $5/month

**Intermediate (Regular Use)**

- OpenAI: $10/month
- DeepL: $7/month
- Google: Free tier
- **Total**: $17/month

**Advanced (Heavy Use)**

- OpenAI: $20/month
- DeepL: $7/month
- Google: $5/month
- Polly: $5/month
- **Total**: $37/month

## Security Best Practices

### API Key Security

1. **Never share your keys**: Keep them private
2. **Use environment variables**: Don't hardcode in scripts
3. **Rotate regularly**: Change keys every 6 months
4. **Monitor usage**: Check for unexpected charges

### Key Storage

- Keys are stored locally on your device
- Never transmitted to ReadNLearn servers
- Encrypted in your system keychain
- You can revoke keys at any time

## Troubleshooting

### Common Issues

**"Invalid API key" error**

- Check key is copied correctly
- Verify key is active in provider dashboard
- Ensure key has correct permissions

**"Rate limit exceeded" error**

- Wait a few minutes and try again
- Check your usage limits
- Consider upgrading your plan

**"Insufficient credits" error**

- Add credits to your account
- Check your billing settings
- Verify payment method

**Slow responses**

- Check your internet connection
- Try a different provider
- Reduce request frequency

### Getting Help

1. **Provider Documentation**: Check official docs
2. **ReadNLearn Support**: Contact our support team
3. **Community Forums**: Ask other users
4. **GitHub Issues**: Report bugs

## Alternative Setups

### Local Providers (Advanced)

For privacy-conscious users, you can use local alternatives:

- **Local LLM**: llama.cpp with models
- **Local MT**: Marian or NLLB
- **Local TTS**: Piper or eSpeak

### Hybrid Approach

Use cloud providers for learning mode and local providers for basic features:

1. **Cloud**: OpenAI for story generation
2. **Local**: Basic translation and TTS
3. **Offline**: Cached responses when possible

## Migration Between Providers

### Switching Translation Providers

1. Export your current phrases
2. Change provider in settings
3. Re-translate phrases (optional)
4. Test with a few phrases first

### Switching LLM Providers

1. Note your current model settings
2. Change provider in settings
3. Test story generation
4. Adjust quality settings if needed

## Monitoring and Analytics

### Usage Tracking

ReadNLearn tracks your usage to help you:

- **Monitor costs**: See spending per provider
- **Optimize usage**: Identify expensive operations
- **Set limits**: Prevent overspending
- **Track progress**: Monitor learning efficiency

### Cost Optimization

1. **Use caching**: Avoid duplicate requests
2. **Batch operations**: Group similar requests
3. **Choose models wisely**: Balance cost vs. quality
4. **Set realistic limits**: Don't over-provision

## Support and Resources

### Documentation

- [OpenAI API Docs](https://platform.openai.com/docs)
- [DeepL API Docs](https://www.deepl.com/docs-api)
- [Google Translate API Docs](https://cloud.google.com/translate/docs)
- [AWS Polly Docs](https://docs.aws.amazon.com/polly/)

### Community

- **Discord Server**: Real-time help and discussions
- **GitHub Discussions**: Technical questions
- **Reddit Community**: User tips and tricks
- **YouTube Tutorials**: Video guides

### Professional Support

- **Enterprise Support**: For organizations
- **Custom Integrations**: Tailored solutions
- **Training Sessions**: Learn advanced features
- **Priority Support**: Faster response times
