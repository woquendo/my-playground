-- Add role-based access control (RBAC) to users table
-- This enables admin vs user permissions for features like show schedule editing

USE myplayground_dev;

-- Add role column to users table
ALTER TABLE users 
ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' 
COMMENT 'User role: user (standard access) or admin (full access)' 
AFTER bio;

-- Update dev user to admin role
UPDATE users 
SET role = 'admin' 
WHERE username = 'dev_user'
LIMIT 1;

-- Verify changes
SELECT 
    id,
    username,
    email,
    role,
    created_at
FROM users 
ORDER BY id;

-- Show column structure
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE,
    COLUMN_DEFAULT,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'myplayground_dev' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'role';

SELECT '✓ User roles added successfully. Dev user is now admin.' as status;
