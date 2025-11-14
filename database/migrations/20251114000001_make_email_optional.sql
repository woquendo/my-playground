-- ============================================
-- Migration: Make email field optional
-- Date: 2025-11-14
-- ============================================

USE myplayground_dev;

-- Make email nullable and remove unique constraint
ALTER TABLE users 
    MODIFY COLUMN email VARCHAR(255) NULL,
    DROP INDEX email;

-- Add unique constraint that allows NULL values
-- Note: In MySQL, multiple NULL values are allowed in unique columns
ALTER TABLE users
    ADD UNIQUE KEY unique_email (email);

SELECT 'Email field is now optional' AS status;
