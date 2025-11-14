-- ============================================
-- Migration: Add playlist_songs junction table
-- Date: 2025-11-14
-- Purpose: Replace JSON song_ids array with proper relational junction table
-- ============================================

USE myplayground_dev;

-- ============================================
-- Create playlist_songs junction table
-- ============================================
CREATE TABLE IF NOT EXISTS playlist_songs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    playlist_id VARCHAR(100) NOT NULL,
    song_id VARCHAR(100) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    
    -- Ensure unique song per playlist
    UNIQUE KEY unique_playlist_song (playlist_id, song_id),
    
    -- Indexes for performance
    INDEX idx_playlist (playlist_id, position),
    INDEX idx_song (song_id),
    INDEX idx_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Migration Notes:
-- ============================================
-- This table replaces the song_ids JSON column in playlists table
-- Benefits:
--   - Unlimited playlist size (no JSON size limit)
--   - Better query performance with indexed joins
--   - Support for song ordering (position column)
--   - Track when songs were added (added_at column)
--   - Proper foreign key constraints
--   - No duplicate songs per playlist (unique constraint)
--
-- The song_ids column in playlists table is kept for backward compatibility
-- but should be considered deprecated
-- ============================================
