# Release Notes - ReadNLearn v0.1.6

## 🎉 Major Improvements

### 🔧 Critical Bug Fixes
- **Fixed Phrase Decoration Issue**: Resolved critical bug where phrases with newline characters were being decorated incorrectly, cutting off the last character
- **Database Schema Migration**: Added automatic migration for existing databases to include missing `text_stemmed` columns
- **Enhanced Position Calculation**: Improved phrase position detection to handle markdown syntax differences between rendered and raw text

### 🎨 User Interface Enhancements
- **Icon-Based Mode Switching**: Replaced dropdown with intuitive icon buttons for Reader, Dictionary, and Learning modes
  - 📖 Reading Mode with book-open icon
  - 📚 Dictionary Mode with book icon  
  - 🎓 Learning Mode with graduation cap icon
- **One-Click Mode Switching**: Eliminated the need for dropdown interaction, saving users one click per mode change
- **Visual Feedback**: Clear active/inactive states with smooth transitions

### 🗄️ Database & Architecture Improvements
- **TAURI-ONLY Mode**: Officially moved to Tauri-only architecture, removing browser fallbacks
- **Database Abstraction Layer**: Implemented robust database adapter system for future cloud deployment
- **Enhanced FTS**: Improved full-text search with better stemming and word composition handling
- **Schema Migration**: Automatic database schema updates for existing installations

### 🧪 Testing & Quality Assurance
- **Comprehensive Test Suite**: Added 6 new tests for phrase decoration with newline handling
- **Regression Prevention**: Critical test to prevent newline decoration issues from recurring
- **Database Tests**: Properly handled Tauri-only database tests
- **All Tests Passing**: 70 tests passing, 2 appropriately skipped

## 🔧 Technical Details

### Database Changes
- Added `text_stemmed`, `translation_stemmed`, `context_stemmed` columns to phrases table
- Automatic migration for existing databases
- Enhanced FTS5 virtual table with stemmed content

### Code Quality
- Removed unused imports and variables
- Enhanced error handling for database operations
- Improved type safety in database adapters

### Performance
- Optimized phrase position calculation
- Reduced UI interaction overhead with icon-based mode switching
- Enhanced database query performance with proper indexing

## 🚀 What's New

### For Users
- **Faster Mode Switching**: Click directly on mode icons instead of using dropdown
- **Reliable Phrase Decoration**: Phrases with newlines now display correctly
- **Better Visual Design**: Cleaner, more intuitive interface
- **Stable Database**: Automatic schema updates ensure compatibility

### For Developers
- **TAURI-ONLY Architecture**: Simplified development with single target platform
- **Database Abstraction**: Ready for future cloud deployment with PostgreSQL
- **Enhanced Testing**: Comprehensive test coverage for critical functionality
- **Better Error Handling**: Improved debugging and error reporting

## 🐛 Bug Fixes
- Fixed phrase decoration cutting off last character when newlines present
- Resolved database schema issues with missing stemmed columns
- Fixed position calculation mismatches between rendered and raw text
- Corrected mode switching UI inconsistencies

## 🔄 Migration Notes
- **Automatic**: Database schema will be automatically updated on first run
- **No Data Loss**: All existing phrases and settings preserved
- **Backward Compatible**: Existing installations will work seamlessly

## 📋 System Requirements
- Tauri desktop environment (browser mode no longer supported)
- SQLite database (included with Tauri)
- Modern operating system (Windows, macOS, Linux)

## 🎯 Next Steps
- Enhanced learning mode features
- Cloud database integration
- Advanced phrase analytics
- Multi-language UI improvements

---

**Release Date**: $(date)  
**Version**: 0.1.6  
**Compatibility**: Tauri Desktop Only  
**Database**: SQLite with FTS5  

## 🏆 Quality Metrics
- ✅ 70 Tests Passing
- ✅ 0 Critical Issues
- ✅ 100% Core Functionality Tested
- ✅ Database Migration Tested
- ✅ UI/UX Improvements Validated
