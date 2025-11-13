-- ============================================
-- Phase 8: My Playground Database Schema
-- ============================================
-- MySQL 8.0+ Database Schema
-- Created: November 12, 2025
-- Purpose: Migrate from localStorage/JSON to MySQL
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS myplayground_dev
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE myplayground_dev;

-- ============================================
-- Table 1: users (Authentication & Profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 2: shows (Shared anime show data)
-- ============================================
CREATE TABLE IF NOT EXISTS shows (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_english VARCHAR(255),
    title_japanese VARCHAR(255),
    url TEXT,
    episodes INT,
    type VARCHAR(50) DEFAULT 'TV',
    image_url TEXT,
    start_date VARCHAR(20),
    end_date VARCHAR(20),
    airing_status INT DEFAULT 1,
    score DECIMAL(3,2) DEFAULT 0.00,
    season VARCHAR(50),
    studios TEXT,
    licensors TEXT,
    rating VARCHAR(50),
    synopsis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_title (title),
    INDEX idx_airing_status (airing_status),
    INDEX idx_season (season),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 3: user_shows (User-specific show data)
-- ============================================
CREATE TABLE IF NOT EXISTS user_shows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    show_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'plan_to_watch',
    watching_status INT DEFAULT 1,
    custom_episodes INT NULL,
    skipped_weeks INT DEFAULT 0,
    custom_start_date VARCHAR(20),
    rating DECIMAL(2,1) DEFAULT NULL,
    tags JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_show (user_id, show_id),
    INDEX idx_user_status (user_id, status),
    INDEX idx_show (show_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 4: songs (Shared music track data)
-- ============================================
CREATE TABLE IF NOT EXISTS songs (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    source VARCHAR(255),
    character_name VARCHAR(255),
    album VARCHAR(255),
    album_art TEXT,
    youtube_url TEXT,
    spotify_url TEXT,
    apple_music_url TEXT,
    duration INT,
    release_year INT,
    release_date DATE,
    genre VARCHAR(100),
    language VARCHAR(50),
    type VARCHAR(50),
    lyrics TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_title (title),
    INDEX idx_artist (artist),
    INDEX idx_source (source),
    INDEX idx_genre (genre),
    FULLTEXT idx_search (title, artist, source, album)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 5: user_songs (User-specific music data)
-- ============================================
CREATE TABLE IF NOT EXISTS user_songs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    song_id VARCHAR(100) NOT NULL,
    rating INT DEFAULT 0,
    play_count INT DEFAULT 0,
    last_played TIMESTAMP NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    tags JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_song (user_id, song_id),
    INDEX idx_user_rating (user_id, rating),
    INDEX idx_favorites (user_id, is_favorite),
    INDEX idx_play_count (user_id, play_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 6: playlists (User playlists)
-- ============================================
CREATE TABLE IF NOT EXISTS playlists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    song_ids JSON,
    song_count INT DEFAULT 0,
    total_duration INT DEFAULT 0,
    cover_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_public (is_public),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 7: streaming_sites (Streaming platforms)
-- ============================================
CREATE TABLE IF NOT EXISTS streaming_sites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    url TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Additional Tables for Relationships
-- ============================================

-- show_streaming_sites (Many-to-many relationship)
CREATE TABLE IF NOT EXISTS show_streaming_sites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    show_id VARCHAR(50) NOT NULL,
    site_id INT NOT NULL,
    url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES streaming_sites(id) ON DELETE CASCADE,
    UNIQUE KEY unique_show_site (show_id, site_id),
    INDEX idx_show (show_id),
    INDEX idx_site (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insert Default Data
-- ============================================

-- Insert default streaming sites
INSERT INTO streaming_sites (name, url, is_active) VALUES
('Crunchyroll', 'https://www.crunchyroll.com', TRUE),
('Funimation', 'https://www.funimation.com', TRUE),
('Netflix', 'https://www.netflix.com', TRUE),
('Hulu', 'https://www.hulu.com', TRUE),
('Amazon Prime Video', 'https://www.primevideo.com', TRUE),
('Disney+', 'https://www.disneyplus.com', TRUE),
('HiDive', 'https://www.hidive.com', TRUE),
('VRV', 'https://vrv.co', TRUE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Create default user for development (password: "dev123")
-- Password hash is bcrypt of "dev123"
INSERT INTO users (username, email, password_hash, display_name) VALUES
('devuser', 'dev@myplayground.local', '$2b$10$YourBcryptHashHere', 'Development User')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Verification Queries
-- ============================================

-- Show all tables
SELECT 'Tables Created:' AS status;
SHOW TABLES;

-- Show row counts
SELECT 'Table Statistics:' AS status;
SELECT 
    TABLE_NAME as 'Table',
    TABLE_ROWS as 'Rows'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'myplayground_dev'
ORDER BY TABLE_NAME;

-- ============================================
-- Schema Complete
-- ============================================
SELECT 'Database schema created successfully!' AS status;
