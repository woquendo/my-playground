-- Fix schema issues identified during migration
-- Run this script to fix the score and playlist ID column issues

USE myplayground_dev;

-- Fix 1: Change score column to allow values up to 10.00
-- Current: DECIMAL(3,2) max = 9.99
-- New: DECIMAL(4,2) max = 99.99 (but we'll use 0-10 range)
ALTER TABLE shows 
MODIFY COLUMN score DECIMAL(4,2) DEFAULT NULL COMMENT 'User rating (0.00-10.00)';

-- Fix 2: Change playlist ID from INT to VARCHAR to support YouTube playlist IDs
-- Current: INT AUTO_INCREMENT (numeric only)
-- New: VARCHAR(100) (supports alphanumeric YouTube IDs like 'OLAK5uy_...')
ALTER TABLE playlists 
DROP PRIMARY KEY,
MODIFY COLUMN id VARCHAR(100) NOT NULL COMMENT 'YouTube playlist ID or custom ID',
ADD PRIMARY KEY (id);

-- Verify changes
SELECT 
    'shows.score type' as fix,
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'myplayground_dev' 
    AND TABLE_NAME = 'shows' 
    AND COLUMN_NAME = 'score'

UNION ALL

SELECT 
    'playlists.id type' as fix,
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'myplayground_dev' 
    AND TABLE_NAME = 'playlists' 
    AND COLUMN_NAME = 'id';

-- Show summary
SELECT '✓ Schema fixes applied successfully' as status;
