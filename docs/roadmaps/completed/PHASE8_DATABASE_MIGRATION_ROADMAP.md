# Phase 8: Database Migration Roadmap

**Status:** 🔄 PLANNED  
**Timeline:** Week 14-17 (February 10 - March 9, 2026)  
**Target Start:** December 2025  
**Estimated Effort:** 70 hours

---

## 📋 Overview

Phase 8 migrates data storage from localStorage/JSON files to MySQL database. This enables multi-user support, better data integrity, and prepares the application for production deployment.

### What This Phase Delivers

- **MySQL Database** - 7 tables with proper schema
- **Database Repositories** - MySQLShowRepository, MySQLMusicRepository
- **Migration Scripts** - Automated data migration from JSON/localStorage
- **Authentication System** - User accounts and session management
- **Connection Management** - Database connection pooling
- **Deployment Guide** - Production deployment documentation

---

## 🎯 Goals & Objectives

### Primary Goals

1. **Design Database Schema**
   - User isolation (multi-tenant ready)
   - Referential integrity with foreign keys
   - Proper indexing for performance
   - Audit timestamps (created_at, updated_at)

2. **Implement MySQL Repositories**
   - MySQLShowRepository extending Repository base class
   - MySQLMusicRepository with same interface as LocalStorage version
   - Zero breaking changes for business logic
   - Connection pooling and error handling

3. **Data Migration**
   - Migrate shows.json to MySQL
   - Migrate songs.json to MySQL
   - Migrate localStorage user data
   - Preserve all existing data
   - Validation after migration

4. **Authentication System**
   - User registration/login
   - Session management
   - Password hashing (bcrypt)
   - JWT tokens for API
   - User profile management

5. **Local Testing Setup**
   - Docker Compose for local MySQL
   - Test database seeding
   - Migration testing workflow
   - No hosting required for development

### Success Metrics

- ✅ All data migrated without loss
- ✅ Repository interface unchanged
- ✅ Authentication working
- ✅ Database performance acceptable
- ✅ Local testing environment functional

---

## 🏗️ Architecture

### Database Schema (7 Tables)

```sql
-- Users table (authentication & profile)
users
├── id (INT, PRIMARY KEY, AUTO_INCREMENT)
├── username (VARCHAR(50), UNIQUE, NOT NULL)
├── email (VARCHAR(255), UNIQUE, NOT NULL)
├── password_hash (VARCHAR(255), NOT NULL)
├── created_at (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
└── updated_at (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE)

-- Shows table (anime show data - shared)
shows
├── id (VARCHAR(50), PRIMARY KEY)
├── title (VARCHAR(255), NOT NULL)
├── title_english (VARCHAR(255))
├── title_japanese (VARCHAR(255))
├── episodes (INT)
├── type (VARCHAR(50))
├── image_url (TEXT)
├── start_date (VARCHAR(20))
├── end_date (VARCHAR(20))
├── airing_status (INT)
├── score (DECIMAL(3,2))
├── season (VARCHAR(50))
├── studios (TEXT)
├── licensors (TEXT)
└── created_at (TIMESTAMP)

-- User shows (user-specific show data)
user_shows
├── id (INT, PRIMARY KEY, AUTO_INCREMENT)
├── user_id (INT, FOREIGN KEY → users.id)
├── show_id (VARCHAR(50), FOREIGN KEY → shows.id)
├── status (VARCHAR(50), NOT NULL)
├── watching_status (INT, DEFAULT 1)
├── custom_episodes (INT)
├── skipped_weeks (INT, DEFAULT 0)
├── custom_start_date (VARCHAR(20))
├── rating (DECIMAL(2,1))
├── tags (JSON)
├── notes (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Songs table (music track data - shared)
songs
├── id (VARCHAR(100), PRIMARY KEY)
├── title (VARCHAR(255), NOT NULL)
├── artist (VARCHAR(255))
├── source (VARCHAR(255))
├── album (VARCHAR(255))
├── album_art (TEXT)
├── youtube_url (TEXT)
├── spotify_url (TEXT)
├── duration (INT)
├── release_year (INT)
├── genre (VARCHAR(100))
└── created_at (TIMESTAMP)

-- User songs (user-specific music data)
user_songs
├── id (INT, PRIMARY KEY, AUTO_INCREMENT)
├── user_id (INT, FOREIGN KEY → users.id)
├── song_id (VARCHAR(100), FOREIGN KEY → songs.id)
├── rating (INT, DEFAULT 0)
├── play_count (INT, DEFAULT 0)
├── last_played (TIMESTAMP)
├── tags (JSON)
├── notes (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Playlists table
playlists
├── id (INT, PRIMARY KEY, AUTO_INCREMENT)
├── user_id (INT, FOREIGN KEY → users.id)
├── name (VARCHAR(255), NOT NULL)
├── description (TEXT)
├── song_ids (JSON)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Streaming sites table
streaming_sites
├── id (INT, PRIMARY KEY, AUTO_INCREMENT)
├── name (VARCHAR(100), NOT NULL, UNIQUE)
├── url_pattern (VARCHAR(255), NOT NULL)
├── icon_url (TEXT)
├── is_active (BOOLEAN, DEFAULT TRUE)
└── created_at (TIMESTAMP)
```

### Data Separation Strategy

**Shared Data (Object State):**
- `shows` table - Core anime information from MyAnimeList
- `songs` table - Core track information

**User Data (User State):**
- `user_shows` table - Watching progress, custom dates, ratings
- `user_songs` table - Play counts, ratings, personal notes
- `playlists` table - User playlists

**Why This Design:**
- ✅ No duplication of show/song metadata
- ✅ Multiple users can track the same show independently
- ✅ Easy to update shared data (e.g., new episodes announced)
- ✅ User-specific data isolated per user

---

## 📦 Deliverables

### 8.1 MySQL Database Setup

**File:** `docs/database/SCHEMA.md` (Already exists)

**Setup Script:**

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS anime_tracker
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE anime_tracker;

-- Create all tables (see schema above)
-- Add indexes for performance
CREATE INDEX idx_user_shows_user_id ON user_shows(user_id);
CREATE INDEX idx_user_shows_show_id ON user_shows(show_id);
CREATE INDEX idx_user_shows_status ON user_shows(status);
CREATE INDEX idx_user_songs_user_id ON user_songs(user_id);
CREATE INDEX idx_user_songs_song_id ON user_songs(song_id);
CREATE INDEX idx_shows_season ON shows(season);
CREATE INDEX idx_shows_airing_status ON shows(airing_status);
```

---

### 8.2 MySQL Repository Implementation

**File:** `src/Infrastructure/Repositories/MySQLShowRepository.js`

**Purpose:** MySQL implementation of ShowRepository interface.

**Key Features:**

```javascript
import mysql from 'mysql2/promise';

export class MySQLShowRepository extends Repository {
    constructor({ connectionPool, logger }) {
        super();
        this.pool = connectionPool;
        this.logger = logger;
    }

    /**
     * Find all shows for user
     */
    async findAll(userId) {
        try {
            const [rows] = await this.pool.execute(
                `SELECT 
                    s.*,
                    us.status,
                    us.watching_status,
                    us.custom_episodes,
                    us.skipped_weeks,
                    us.custom_start_date,
                    us.rating,
                    us.tags,
                    us.notes
                FROM shows s
                INNER JOIN user_shows us ON s.id = us.show_id
                WHERE us.user_id = ?`,
                [userId]
            );

            return rows.map(row => this._rowToShow(row));
        } catch (error) {
            this.logger.error('Failed to find all shows', { error });
            throw new RepositoryError('Failed to retrieve shows', error);
        }
    }

    /**
     * Find show by ID for user
     */
    async findById(showId, userId) {
        try {
            const [rows] = await this.pool.execute(
                `SELECT 
                    s.*,
                    us.status,
                    us.watching_status,
                    us.custom_episodes,
                    us.skipped_weeks,
                    us.custom_start_date,
                    us.rating,
                    us.tags,
                    us.notes
                FROM shows s
                LEFT JOIN user_shows us ON s.id = us.show_id AND us.user_id = ?
                WHERE s.id = ?`,
                [userId, showId]
            );

            if (rows.length === 0) return null;

            return this._rowToShow(rows[0]);
        } catch (error) {
            this.logger.error('Failed to find show', { showId, error });
            throw new RepositoryError('Failed to retrieve show', error);
        }
    }

    /**
     * Save show (insert or update)
     */
    async save(show, userId) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Insert/update show data (shared)
            await connection.execute(
                `INSERT INTO shows (
                    id, title, title_english, title_japanese, episodes,
                    type, image_url, start_date, end_date, airing_status,
                    score, season, studios, licensors
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    episodes = VALUES(episodes),
                    image_url = VALUES(image_url)`,
                [
                    show.getId(),
                    show.title,
                    show.titleEnglish,
                    show.titleJapanese,
                    show.episodes,
                    show.type,
                    show.imageUrl,
                    show.startDate?.format(),
                    show.endDate?.format(),
                    show.airingStatus.getValue(),
                    show.score,
                    show.season,
                    show.studios,
                    show.licensors
                ]
            );

            // Insert/update user-specific data
            await connection.execute(
                `INSERT INTO user_shows (
                    user_id, show_id, status, watching_status,
                    custom_episodes, skipped_weeks, custom_start_date,
                    rating, tags, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    status = VALUES(status),
                    watching_status = VALUES(watching_status),
                    custom_episodes = VALUES(custom_episodes),
                    skipped_weeks = VALUES(skipped_weeks),
                    custom_start_date = VALUES(custom_start_date),
                    rating = VALUES(rating),
                    tags = VALUES(tags),
                    notes = VALUES(notes),
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    userId,
                    show.getId(),
                    show.status.getValue(),
                    show.watchingStatus,
                    show.customEpisodes,
                    show.skippedWeeks,
                    show.customStartDate?.format(),
                    show.rating,
                    JSON.stringify(show.tags),
                    show.notes
                ]
            );

            await connection.commit();

            this.logger.info('Show saved', { id: show.getId(), userId });

            return show;
        } catch (error) {
            await connection.rollback();
            this.logger.error('Failed to save show', { error });
            throw new RepositoryError('Failed to save show', error);
        } finally {
            connection.release();
        }
    }

    /**
     * Delete show for user
     */
    async delete(showId, userId) {
        try {
            const [result] = await this.pool.execute(
                'DELETE FROM user_shows WHERE show_id = ? AND user_id = ?',
                [showId, userId]
            );

            this.logger.info('Show deleted', { showId, userId });

            return result.affectedRows > 0;
        } catch (error) {
            this.logger.error('Failed to delete show', { showId, error });
            throw new RepositoryError('Failed to delete show', error);
        }
    }

    /**
     * Convert database row to Show domain model
     * @private
     */
    _rowToShow(row) {
        return new Show({
            id: row.id,
            title: row.title,
            titleEnglish: row.title_english,
            titleJapanese: row.title_japanese,
            episodes: row.episodes,
            type: row.type,
            imageUrl: row.image_url,
            startDate: row.start_date,
            endDate: row.end_date,
            airingStatus: row.airing_status,
            score: row.score,
            season: row.season,
            studios: row.studios,
            licensors: row.licensors,
            status: row.status,
            watchingStatus: row.watching_status,
            customEpisodes: row.custom_episodes,
            skippedWeeks: row.skipped_weeks,
            customStartDate: row.custom_start_date,
            rating: row.rating,
            tags: row.tags ? JSON.parse(row.tags) : [],
            notes: row.notes
        });
    }
}
```

---

### 8.3 Data Migration Scripts

**File:** `scripts/migrate-to-mysql.js`

```javascript
import fs from 'fs/promises';
import mysql from 'mysql2/promise';

/**
 * Migrate shows from JSON to MySQL
 */
async function migrateShows(connection, userId) {
    console.log('Migrating shows...');
    
    // Read shows.json
    const showsData = JSON.parse(
        await fs.readFile('data/shows.json', 'utf-8')
    );

    let migrated = 0;
    let errors = 0;

    for (const show of showsData) {
        try {
            // Insert show (shared data)
            await connection.execute(
                `INSERT IGNORE INTO shows (
                    id, title, title_english, episodes, type,
                    image_url, start_date, airing_status, score, season
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    show.id,
                    show.title,
                    show.title_english,
                    show.episodes,
                    show.type,
                    show.image_url,
                    show.start_date,
                    show.airing_status,
                    show.score,
                    show.season
                ]
            );

            // Insert user-specific data
            await connection.execute(
                `INSERT INTO user_shows (
                    user_id, show_id, status, watching_status,
                    custom_episodes, skipped_weeks, custom_start_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    show.id,
                    show.status,
                    show.watching_status || 1,
                    show.custom_episodes,
                    show.skipped_weeks || 0,
                    show.custom_start_date
                ]
            );

            migrated++;
        } catch (error) {
            console.error(`Failed to migrate show ${show.id}:`, error.message);
            errors++;
        }
    }

    console.log(`Shows migrated: ${migrated}, Errors: ${errors}`);
}

/**
 * Migrate songs from JSON to MySQL
 */
async function migrateSongs(connection, userId) {
    console.log('Migrating songs...');
    
    // Read songs.json
    const songsData = JSON.parse(
        await fs.readFile('data/songs.json', 'utf-8')
    );

    let migrated = 0;
    let errors = 0;

    for (const song of songsData) {
        try {
            // Insert song (shared data)
            await connection.execute(
                `INSERT IGNORE INTO songs (
                    id, title, artist, source, youtube_url, album_art
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    song.id,
                    song.title,
                    song.artist,
                    song.source,
                    song.youtube_url,
                    song.album_art
                ]
            );

            // Insert user-specific data
            await connection.execute(
                `INSERT INTO user_songs (
                    user_id, song_id, rating, play_count, last_played
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    userId,
                    song.id,
                    song.rating || 0,
                    song.play_count || 0,
                    song.last_played
                ]
            );

            migrated++;
        } catch (error) {
            console.error(`Failed to migrate song ${song.id}:`, error.message);
            errors++;
        }
    }

    console.log(`Songs migrated: ${migrated}, Errors: ${errors}`);
}

/**
 * Main migration
 */
async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'anime_tracker'
    });

    try {
        // Create default user if needed
        const [users] = await connection.execute(
            'SELECT id FROM users WHERE username = ?',
            ['admin']
        );

        let userId;
        if (users.length === 0) {
            const [result] = await connection.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                ['admin', 'admin@example.com', 'temp_hash']
            );
            userId = result.insertId;
        } else {
            userId = users[0].id;
        }

        // Run migrations
        await migrateShows(connection, userId);
        await migrateSongs(connection, userId);

        console.log('Migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

main();
```

---

### 8.4 Local Testing with Docker

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: anime_tracker_mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: anime_tracker
      MYSQL_USER: anime_user
      MYSQL_PASSWORD: anime_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    command: --default-authentication-plugin=mysql_native_password

volumes:
  mysql_data:
```

**Start Local MySQL:**
```bash
docker-compose up -d
```

---

### 8.5 Authentication System

**File:** `src/Application/Services/AuthService.js`

**Key Features:**
- User registration with password hashing (bcrypt)
- Login with JWT token generation
- Session management
- Password reset functionality

---

## ✅ Success Criteria (Planned)

### Functionality
- [ ] All data migrated to MySQL
- [ ] Repository interface unchanged
- [ ] Authentication working
- [ ] Multi-user support
- [ ] Data integrity maintained

### Performance
- [ ] Query response time < 100ms
- [ ] Database properly indexed
- [ ] Connection pooling working
- [ ] No N+1 query problems

### Security
- [ ] Passwords hashed with bcrypt
- [ ] SQL injection prevented (parameterized queries)
- [ ] JWT tokens secure
- [ ] User data isolated

---

## 🎓 Implementation Plan

### Week 1: Database Setup
- Create MySQL schema
- Setup local Docker environment
- Test database connections
- Create migration scripts

### Week 2: Repository Implementation
- Implement MySQLShowRepository
- Implement MySQLMusicRepository
- Write repository tests
- Verify interface compatibility

### Week 3: Data Migration
- Run migration scripts
- Validate migrated data
- Test application with MySQL
- Fix any issues

### Week 4: Authentication & Deployment
- Implement authentication system
- Test multi-user scenarios
- Write deployment guide
- Performance testing

---

## 📚 Related Documentation

- Database Schema: `docs/database/SCHEMA.md`
- Migration Guide: `docs/database/MIGRATION_GUIDE.md`
- Local Testing: `docs/database/LOCAL_TESTING_GUIDE.md`
- All previous phases: [Complete Modernization Roadmap](./COMPLETE_MODERNIZATION_ROADMAP.md)

---

**Phase 8 Status:** 🔄 **PLANNED** - Target Start: December 2025
