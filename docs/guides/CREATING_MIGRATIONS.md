# Creating Database Migrations - Developer Guide

## Quick Reference

```bash
# 1. Create migration file (manual - see templates below)
# 2. Write up() and down() methods
# 3. Test in development
npm run migrate:status
npm run migrate
npm run migrate:rollback

# 4. Commit and deploy
git add database/migrations/YYYYMMDDHHMMSS_*.js
git commit -m "Add migration: [description]"
```

---

## Migration File Structure

### File Naming

**Format**: `YYYYMMDDHHMMSS_descriptive_name.js`

**Examples**:
- `20251113120000_add_email_to_users.js`
- `20251113130000_create_comments_table.js`
- `20251113140000_add_user_preferences.js`

**Rules**:
- ✅ Use UTC timestamp for consistency
- ✅ Use snake_case for description
- ✅ Be descriptive but concise
- ✅ Use present tense verbs (add, create, modify, remove)
- ❌ Never reuse timestamps
- ❌ Never edit existing migration files

### Basic Template

```javascript
/**
 * Migration: YYYYMMDDHHMMSS_migration_name
 * 
 * Description: Brief explanation of what this migration does
 * 
 * Dependencies: List any migrations this depends on
 * 
 * Author: Your Name
 * Date: YYYY-MM-DD
 */

/**
 * Run the migration (forward)
 * @param {import('mysql2/promise').Connection} connection - MySQL connection with transaction
 */
export async function up(connection) {
    // Your schema changes here
}

/**
 * Rollback the migration (backward)
 * @param {import('mysql2/promise').Connection} connection - MySQL connection with transaction
 */
export async function down(connection) {
    // Undo the changes
}
```

---

## Common Migration Patterns

### 1. Create Table

```javascript
export async function up(connection) {
    await connection.query(`
        CREATE TABLE comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            show_id INT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_user_id (user_id),
            INDEX idx_show_id (show_id),
            INDEX idx_created_at (created_at),
            
            CONSTRAINT fk_comments_user
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE,
            CONSTRAINT fk_comments_show
                FOREIGN KEY (show_id) REFERENCES shows(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
}

export async function down(connection) {
    await connection.query(`DROP TABLE IF EXISTS comments;`);
}
```

### 2. Add Column

```javascript
export async function up(connection) {
    await connection.query(`
        ALTER TABLE users 
        ADD COLUMN email VARCHAR(255) UNIQUE;
    `);
    
    await connection.query(`
        ALTER TABLE users 
        ADD INDEX idx_email (email);
    `);
}

export async function down(connection) {
    await connection.query(`
        ALTER TABLE users 
        DROP INDEX idx_email;
    `);
    
    await connection.query(`
        ALTER TABLE users 
        DROP COLUMN email;
    `);
}
```

### 3. Modify Column

```javascript
export async function up(connection) {
    await connection.query(`
        ALTER TABLE shows 
        MODIFY COLUMN score DECIMAL(4,2) DEFAULT 0.00;
    `);
}

export async function down(connection) {
    await connection.query(`
        ALTER TABLE shows 
        MODIFY COLUMN score DECIMAL(3,2) DEFAULT 0.00;
    `);
}
```

### 4. Add Index

```javascript
export async function up(connection) {
    await connection.query(`
        ALTER TABLE user_shows 
        ADD INDEX idx_status_updated (status, last_updated);
    `);
}

export async function down(connection) {
    await connection.query(`
        ALTER TABLE user_shows 
        DROP INDEX idx_status_updated;
    `);
}
```

### 5. Create Foreign Key

```javascript
export async function up(connection) {
    await connection.query(`
        ALTER TABLE comments 
        ADD CONSTRAINT fk_comments_user
            FOREIGN KEY (user_id) 
            REFERENCES users(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    `);
}

export async function down(connection) {
    await connection.query(`
        ALTER TABLE comments 
        DROP FOREIGN KEY fk_comments_user;
    `);
}
```

### 6. Data Migration

```javascript
export async function up(connection) {
    // Add new column
    await connection.query(`
        ALTER TABLE users 
        ADD COLUMN full_name VARCHAR(255);
    `);
    
    // Migrate data
    await connection.query(`
        UPDATE users 
        SET full_name = CONCAT(first_name, ' ', last_name)
        WHERE first_name IS NOT NULL AND last_name IS NOT NULL;
    `);
    
    // Remove old columns (optional)
    await connection.query(`
        ALTER TABLE users 
        DROP COLUMN first_name,
        DROP COLUMN last_name;
    `);
}

export async function down(connection) {
    // Restore old columns
    await connection.query(`
        ALTER TABLE users 
        ADD COLUMN first_name VARCHAR(255),
        ADD COLUMN last_name VARCHAR(255);
    `);
    
    // Reverse data migration (best effort)
    await connection.query(`
        UPDATE users 
        SET first_name = SUBSTRING_INDEX(full_name, ' ', 1),
            last_name = SUBSTRING_INDEX(full_name, ' ', -1)
        WHERE full_name IS NOT NULL;
    `);
    
    // Remove new column
    await connection.query(`
        ALTER TABLE users 
        DROP COLUMN full_name;
    `);
}
```

### 7. Add Enum Values

```javascript
export async function up(connection) {
    await connection.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('user', 'admin', 'moderator') 
        DEFAULT 'user';
    `);
}

export async function down(connection) {
    // First, update any moderators to users
    await connection.query(`
        UPDATE users 
        SET role = 'user' 
        WHERE role = 'moderator';
    `);
    
    await connection.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('user', 'admin') 
        DEFAULT 'user';
    `);
}
```

### 8. Create Junction Table

```javascript
export async function up(connection) {
    await connection.query(`
        CREATE TABLE user_favorites (
            user_id INT NOT NULL,
            show_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            PRIMARY KEY (user_id, show_id),
            INDEX idx_show_id (show_id),
            
            CONSTRAINT fk_favorites_user
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE,
            CONSTRAINT fk_favorites_show
                FOREIGN KEY (show_id) REFERENCES shows(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
}

export async function down(connection) {
    await connection.query(`DROP TABLE IF EXISTS user_favorites;`);
}
```

---

## Best Practices

### ✅ DO

1. **Always include down() method**
   ```javascript
   // Even for destructive operations
   export async function down(connection) {
       // Best effort rollback
       await connection.query(`DROP TABLE IF EXISTS new_table;`);
   }
   ```

2. **Use IF EXISTS / IF NOT EXISTS**
   ```javascript
   await connection.query(`DROP TABLE IF EXISTS temp_table;`);
   await connection.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
   ```

3. **Handle existing data carefully**
   ```javascript
   // Good: Handle NULL values
   await connection.query(`
       UPDATE users 
       SET email = CONCAT(username, '@example.com')
       WHERE email IS NULL;
   `);
   ```

4. **Add indexes for foreign keys**
   ```javascript
   // Always index FK columns
   await connection.query(`
       ALTER TABLE comments 
       ADD INDEX idx_user_id (user_id);
   `);
   ```

5. **Use transactions (automatic)**
   ```javascript
   // Each migration runs in a transaction automatically
   // No need to BEGIN/COMMIT
   ```

6. **Test rollback immediately**
   ```bash
   npm run migrate
   npm run migrate:rollback  # Test down() works
   npm run migrate           # Re-apply
   ```

### ❌ DON'T

1. **Never edit executed migrations**
   ```javascript
   // ❌ BAD: Editing existing migration
   // ✅ GOOD: Create new migration to fix issues
   ```

2. **Don't use SELECT in migrations**
   ```javascript
   // ❌ BAD: Can break on empty tables
   const [rows] = await connection.query(`SELECT * FROM users;`);
   
   // ✅ GOOD: Use INSERT/UPDATE with WHERE conditions
   await connection.query(`
       UPDATE users SET role = 'admin' WHERE username = 'admin';
   `);
   ```

3. **Don't forget indexes on foreign keys**
   ```javascript
   // ❌ BAD: FK without index
   FOREIGN KEY (user_id) REFERENCES users(id)
   
   // ✅ GOOD: With index
   INDEX idx_user_id (user_id),
   FOREIGN KEY (user_id) REFERENCES users(id)
   ```

4. **Don't hardcode values that should be ENV**
   ```javascript
   // ❌ BAD: Hardcoded password
   await connection.query(`
       INSERT INTO users (username, password_hash) 
       VALUES ('admin', 'hardcoded123');
   `);
   
   // ✅ GOOD: Use environment or let application handle
   // Initial users should be created via seeding script
   ```

5. **Don't create migrations with circular dependencies**
   ```javascript
   // ❌ BAD: Table A references B, B references A in same migration
   // ✅ GOOD: Create tables first, then add FKs in separate migration
   ```

---

## Testing Migrations

### Local Testing Workflow

```bash
# 1. Check current status
npm run migrate:status

# 2. Create backup (optional but recommended)
mysqldump -u root -p myplayground_dev > backup_before_test.sql

# 3. Run migration
npm run migrate

# 4. Verify changes
mysql -u root -p myplayground_dev
DESCRIBE table_name;
SELECT * FROM schema_migrations ORDER BY id DESC LIMIT 5;

# 5. Test rollback
npm run migrate:rollback

# 6. Verify rollback worked
mysql -u root -p myplayground_dev
DESCRIBE table_name;  # Should be back to previous state

# 7. Re-apply migration
npm run migrate

# 8. Run application tests
npm test
```

### Dry Run Testing

```bash
# See what would execute without making changes
node scripts/migrate.js migrate --dry-run
node scripts/migrate.js rollback --dry-run
```

### Testing Checklist

- [ ] Migration runs without errors
- [ ] All indexes are created
- [ ] Foreign keys work correctly
- [ ] Rollback restores previous state
- [ ] Application still works after migration
- [ ] Application still works after rollback + re-migrate
- [ ] No data loss occurs
- [ ] Performance is acceptable

---

## Complex Migration Examples

### Example 1: Splitting a Column

```javascript
/**
 * Split 'name' column into 'first_name' and 'last_name'
 */
export async function up(connection) {
    // 1. Add new columns
    await connection.query(`
        ALTER TABLE users 
        ADD COLUMN first_name VARCHAR(255),
        ADD COLUMN last_name VARCHAR(255);
    `);
    
    // 2. Migrate data (handle various name formats)
    await connection.query(`
        UPDATE users 
        SET 
            first_name = SUBSTRING_INDEX(name, ' ', 1),
            last_name = CASE 
                WHEN name LIKE '% %' THEN SUBSTRING_INDEX(name, ' ', -1)
                ELSE ''
            END
        WHERE name IS NOT NULL;
    `);
    
    // 3. Add indexes
    await connection.query(`
        ALTER TABLE users 
        ADD INDEX idx_first_name (first_name),
        ADD INDEX idx_last_name (last_name);
    `);
    
    // 4. Remove old column (only after verifying data)
    // Consider keeping old column temporarily in production
    await connection.query(`
        ALTER TABLE users 
        DROP COLUMN name;
    `);
}

export async function down(connection) {
    // Restore original structure
    await connection.query(`
        ALTER TABLE users 
        ADD COLUMN name VARCHAR(255);
    `);
    
    // Reconstruct data
    await connection.query(`
        UPDATE users 
        SET name = CONCAT_WS(' ', first_name, last_name)
        WHERE first_name IS NOT NULL;
    `);
    
    await connection.query(`
        ALTER TABLE users 
        ADD INDEX idx_name (name);
    `);
    
    // Remove split columns
    await connection.query(`
        ALTER TABLE users 
        DROP INDEX idx_first_name,
        DROP INDEX idx_last_name,
        DROP COLUMN first_name,
        DROP COLUMN last_name;
    `);
}
```

### Example 2: Adding Soft Deletes

```javascript
/**
 * Add soft delete support to shows table
 */
export async function up(connection) {
    // Add deleted_at column
    await connection.query(`
        ALTER TABLE shows 
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
    `);
    
    // Add index for queries filtering deleted items
    await connection.query(`
        ALTER TABLE shows 
        ADD INDEX idx_deleted_at (deleted_at);
    `);
    
    // Create view for non-deleted shows (optional)
    await connection.query(`
        CREATE OR REPLACE VIEW active_shows AS
        SELECT * FROM shows WHERE deleted_at IS NULL;
    `);
}

export async function down(connection) {
    // Drop view
    await connection.query(`DROP VIEW IF EXISTS active_shows;`);
    
    // Remove column and index
    await connection.query(`
        ALTER TABLE shows 
        DROP INDEX idx_deleted_at,
        DROP COLUMN deleted_at;
    `);
}
```

### Example 3: Changing Primary Key

```javascript
/**
 * Change primary key from auto-increment to UUID
 */
export async function up(connection) {
    // 1. Add new UUID column
    await connection.query(`
        ALTER TABLE users 
        ADD COLUMN uuid CHAR(36) NOT NULL UNIQUE;
    `);
    
    // 2. Generate UUIDs for existing records
    await connection.query(`
        UPDATE users 
        SET uuid = UUID();
    `);
    
    // 3. Update foreign key references (requires multiple steps)
    // First, add UUID column to related tables
    await connection.query(`
        ALTER TABLE user_shows 
        ADD COLUMN user_uuid CHAR(36);
    `);
    
    // Copy UUID values
    await connection.query(`
        UPDATE user_shows us
        JOIN users u ON us.user_id = u.id
        SET us.user_uuid = u.uuid;
    `);
    
    // 4. Drop old foreign key
    await connection.query(`
        ALTER TABLE user_shows 
        DROP FOREIGN KEY fk_user_shows_user;
    `);
    
    // 5. Drop old primary key
    await connection.query(`
        ALTER TABLE users 
        DROP PRIMARY KEY;
    `);
    
    // 6. Set UUID as new primary key
    await connection.query(`
        ALTER TABLE users 
        ADD PRIMARY KEY (uuid);
    `);
    
    // 7. Update foreign key to use UUID
    await connection.query(`
        ALTER TABLE user_shows 
        DROP COLUMN user_id,
        CHANGE COLUMN user_uuid user_id CHAR(36) NOT NULL;
    `);
    
    await connection.query(`
        ALTER TABLE user_shows 
        ADD CONSTRAINT fk_user_shows_user
            FOREIGN KEY (user_id) REFERENCES users(uuid)
            ON DELETE CASCADE;
    `);
    
    // 8. Drop old id column
    await connection.query(`
        ALTER TABLE users 
        DROP COLUMN id;
    `);
}

export async function down(connection) {
    // Rollback is complex - recommend fresh database restore
    // This is a destructive change that's hard to reverse
    throw new Error('This migration cannot be safely rolled back. Restore from backup.');
}
```

---

## Troubleshooting

### Migration Fails with "Duplicate column name"

```javascript
// Solution: Use IF NOT EXISTS (MySQL 8.0.12+)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
```

### Migration Fails with "Can't DROP column"

```javascript
// Check if column exists first
SHOW COLUMNS FROM users LIKE 'old_column';

// Or use IF EXISTS
ALTER TABLE users DROP COLUMN IF EXISTS old_column;
```

### Foreign Key Constraint Fails

```javascript
// Ensure referenced column exists and has index
// Check data types match exactly

// Debug query:
SELECT * FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'your_table';
```

### Migration Stuck or Slow

```javascript
// Check for locks
SHOW PROCESSLIST;

// Large data migrations should be chunked
// Instead of:
UPDATE users SET status = 'active';  // ❌ Locks entire table

// Do:
UPDATE users SET status = 'active' WHERE id BETWEEN 1 AND 1000;
UPDATE users SET status = 'active' WHERE id BETWEEN 1001 AND 2000;
// etc.
```

---

## Migration Checklist

Before committing a migration:

- [ ] Migration follows naming convention
- [ ] Both up() and down() methods implemented
- [ ] down() successfully reverses up()
- [ ] Migration tested locally (up + down + up)
- [ ] No hardcoded sensitive data
- [ ] Indexes added for all foreign keys
- [ ] Character set is utf8mb4_unicode_ci
- [ ] Comments explain complex logic
- [ ] Application tests pass after migration
- [ ] Peer review completed (if applicable)

---

## Resources

- **Migration Manager Code**: `src/Database/MigrationManager.js`
- **CLI Tool**: `scripts/migrate.js`
- **Deployment Guide**: `docs/guides/DATABASE_MIGRATION_GUIDE.md`
- **MySQL Reference**: https://dev.mysql.com/doc/refman/8.0/en/

---

**Last Updated**: November 13, 2025  
**Version**: 1.0.0
