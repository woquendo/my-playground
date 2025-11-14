-- ============================================
-- Populate Song Types from JSON Data
-- Migration: 20251114000002
-- ============================================

USE myplayground_dev;

-- Update all songs with their correct types based on songs.json

-- Opening songs
UPDATE songs SET type = 'Opening' WHERE title IN (
    'Call of The Night Opening',
    'Call of the Night Season 2 Opening - Mirage'
);

-- Ending songs
UPDATE songs SET type = 'Ending' WHERE title IN (
    'Call of the Night Ending',
    'Call of the Night Season 2 Ending - Nemure',
    'Emiya_UBW Extend Ending'
);

-- All other songs default to OST (Original Soundtrack)
UPDATE songs SET type = 'OST' WHERE type IS NULL;

-- Verify the update
SELECT 
    type,
    COUNT(*) as count
FROM songs
GROUP BY type
ORDER BY type;

SELECT 'Song types populated successfully!' AS status;
