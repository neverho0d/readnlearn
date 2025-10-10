# Database Architecture

## Overview

The application uses a **database abstraction layer** that allows seamless switching between different database backends:

- **SQLite (Tauri Desktop)** - Primary database for desktop applications
- **PostgreSQL (Cloud)** - For cloud deployment scenarios
- **MySQL (Cloud)** - Future support for MySQL deployments
- **SQLite Browser (Fallback)** - Emergency fallback for browser-only scenarios

## Architecture Principles

### 1. **TAURI-ONLY MODE** 🎯

- **The application uses ONLY Tauri mode for production**
- **No browser mode fallback** in production scenarios
- Browser mode is only for standalone web applications (not recommended)

### 2. **Database Abstraction Layer**

- All database operations go through the `DatabaseAdapter` interface
- Database-specific implementations are isolated in adapter classes
- Easy to switch between database backends without changing application code

### 3. **Environment-Based Configuration**

- Automatic detection of Tauri vs. cloud environments
- Configuration via environment variables for cloud deployment
- Fallback mechanisms for development scenarios

## Database Adapters

### SQLiteAdapter (Tauri Desktop)

```typescript
// Primary database for desktop applications
const db = await DatabaseFactory.getInstance({
    type: "sqlite",
    options: { dbPath: "sqlite:readnlearn.db" },
});
```

**Features:**

- ✅ Full FTS5 support with stemming
- ✅ Real file-based persistence
- ✅ No size limitations
- ✅ Native SQLite performance
- ✅ ACID transactions

### PostgreSQLAdapter (Cloud)

```typescript
// Cloud deployment with PostgreSQL
const db = await DatabaseFactory.getInstance({
    type: "postgresql",
    connectionString: process.env.DATABASE_URL,
});
```

**Features:**

- ✅ Full-text search with PostgreSQL's tsvector
- ✅ JSONB support for tags
- ✅ Horizontal scaling
- ✅ Advanced indexing
- ✅ ACID transactions

## Migration Path

### Current State (v0.1.6)

- ✅ SQLite with FTS5 (Tauri desktop)
- ✅ Database abstraction layer implemented
- ✅ PostgreSQL adapter ready

### Future Cloud Deployment

1. **Environment Variables:**

    ```bash
    DATABASE_URL=postgresql://user:pass@host:port/db
    # OR
    POSTGRES_HOST=localhost
    POSTGRES_PORT=5432
    POSTGRES_DB=readnlearn
    POSTGRES_USER=user
    POSTGRES_PASSWORD=pass
    ```

2. **Dependencies:**

    ```bash
    npm install pg @types/pg
    ```

3. **Deployment:**
    - The application will automatically detect cloud environment
    - Switch to PostgreSQL adapter
    - No code changes required

## Database Schema

### Core Tables

```sql
-- Main phrases table
CREATE TABLE phrases (
    id TEXT PRIMARY KEY,
    lang TEXT NOT NULL,
    text TEXT NOT NULL,
    translation TEXT,
    context TEXT,
    tags_json JSONB,  -- PostgreSQL: JSONB, SQLite: TEXT
    added_at TIMESTAMP NOT NULL,
    source_file TEXT,
    content_hash TEXT,
    line_no INTEGER,
    col_offset INTEGER,
    text_stemmed TEXT,
    translation_stemmed TEXT,
    context_stemmed TEXT
);
```

### Full-Text Search

- **SQLite:** FTS5 virtual table with triggers
- **PostgreSQL:** GIN indexes on tsvector columns

## Performance Considerations

### SQLite (Desktop)

- **File-based:** Single file database
- **FTS5:** Native full-text search
- **Size limit:** ~281 TB (practical limit: several GB)
- **Concurrency:** Single writer, multiple readers

### PostgreSQL (Cloud)

- **Network-based:** Client-server architecture
- **tsvector:** Advanced full-text search
- **Size limit:** Unlimited (with proper infrastructure)
- **Concurrency:** Multiple writers, advanced locking

## Security Considerations

### SQLite (Desktop)

- **File permissions:** Database file access control
- **Local only:** No network exposure
- **Encryption:** Optional SQLCipher support

### PostgreSQL (Cloud)

- **SSL/TLS:** Encrypted connections
- **Authentication:** User/password or certificate-based
- **Network security:** Firewall, VPN, etc.
- **Data encryption:** At-rest and in-transit

## Development Guidelines

### 1. Always Use Tauri Mode

```bash
# ✅ Correct development
npm run tauri dev

# ❌ Avoid browser mode
npm run dev
```

### 2. Database Operations

```typescript
// ✅ Use the abstraction layer
import { getDatabaseAdapter } from "./lib/db/database";
const db = await getDatabaseAdapter();
const phrases = await db.searchPhrases("search term");

// ❌ Don't access database directly
import Database from "@tauri-apps/plugin-sql";
```

### 3. Environment Detection

```typescript
// The application automatically detects:
// - Tauri desktop → SQLite
// - Cloud deployment → PostgreSQL
// - Development fallback → SQLite
```

## Troubleshooting

### Common Issues

1. **Browser Mode Warning**

    ```
    Warning: Running in browser mode - this should only be used for standalone web apps
    ```

    **Solution:** Use `npm run tauri dev` instead of `npm run dev`

2. **Database Connection Failed**

    ```
    Error: Failed to connect to database
    ```

    **Solution:** Check environment variables and database server status

3. **FTS Not Working**
    ```
    Error: FTS5 not available
    ```
    **Solution:** Ensure using Tauri mode (not browser mode)

### Debug Information

```typescript
// Get database information
const info = await DatabaseFactory.getDatabaseInfo();
console.log("Database type:", info.type);
console.log("FTS support:", info.features.fullTextSearch);
```

## Future Enhancements

### Planned Features

- [ ] MySQL adapter implementation
- [ ] Database migration system
- [ ] Connection pooling
- [ ] Read replicas support
- [ ] Database monitoring
- [ ] Backup/restore utilities

### Cloud Deployment Options

- [ ] Docker containers
- [ ] Kubernetes deployment
- [ ] Serverless functions
- [ ] Edge computing
- [ ] Multi-region support
