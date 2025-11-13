# Database Migration System - Deployment Guide

## Overview

This project uses a professional database migration system for managing schema changes in a production environment. The system ensures:

- ✅ **Versioned Migrations**: Timestamp-based ordering (YYYYMMDDHHMMSS)
- ✅ **Automatic Tracking**: Records all executed migrations
- ✅ **Rollback Support**: Safely undo changes with down() methods
- ✅ **Transaction Safety**: Each migration runs in a transaction
- ✅ **Deployment Ready**: Simple CLI for production deployments

---

## Quick Start

### 1. Initial Setup (First Deployment)

```bash
# Install dependencies
npm install

# Run all migrations
npm run migrate

# Seed database with initial data (optional)
npm run db:seed
```

### 2. Check Migration Status

```bash
npm run migrate:status
```

Output:
```
📊 Migration Status
════════════════════════════════════════
Total Migrations: 2
Executed: 2
Pending: 0
────────────────────────────────────────
✓ 20251113000001 create_initial_schema
  └─ Executed: 11/13/2025, 12:00:00 AM (batch 1)
✓ 20251113000002 add_user_roles
  └─ Executed: 11/13/2025, 12:00:05 AM (batch 1)
════════════════════════════════════════
```

### 3. Standard Deployment Process

```bash
# 1. Pull latest code
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Run pending migrations
npm run migrate

# 4. Restart application
npm start
```

---

## Migration Commands

### Run Migrations

```bash
# Run all pending migrations
npm run migrate

# Or use the CLI directly
node scripts/migrate.js migrate

# Run specific number of migrations
node scripts/migrate.js migrate:step 1

# Dry run (see what would execute)
node scripts/migrate.js migrate --dry-run
```

### Check Status

```bash
# Show migration status
npm run migrate:status

# Or
node scripts/migrate.js status
```

### Rollback

```bash
# Rollback last batch
npm run migrate:rollback

# Rollback specific number of migrations
node scripts/migrate.js rollback:step 1

# Dry run rollback
node scripts/migrate.js rollback --dry-run
```

### Reset Database (⚠️ DESTRUCTIVE)

```bash
# Reset database (rollback all migrations)
npm run migrate:reset

# Fresh database (reset + migrate)
npm run migrate:fresh
```

---

## Creating New Migrations

### 1. Naming Convention

Format: `YYYYMMDDHHMMSS_descriptive_name.js`

Example: `20251113120000_add_email_verification.js`

### 2. Migration Template

Create file in `database/migrations/`:

```javascript
/**
 * Migration: YYYYMMDDHHMMSS_descriptive_name
 * 
 * Description of what this migration does.
 */

/**
 * Run migration (up)
 * @param {import('mysql2/promise').Connection} connection
 */
export async function up(connection) {
    // Add your schema changes here
    await connection.query(`
        ALTER TABLE users 
        ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    `);

    await connection.query(`
        ALTER TABLE users 
        ADD INDEX idx_email_verified (email_verified);
    `);
}

/**
 * Rollback migration (down)
 * @param {import('mysql2/promise').Connection} connection
 */
export async function down(connection) {
    // Undo the changes
    await connection.query(`
        ALTER TABLE users 
        DROP INDEX idx_email_verified;
    `);

    await connection.query(`
        ALTER TABLE users 
        DROP COLUMN email_verified;
    `);
}
```

### 3. Best Practices

✅ **Always include down() method** for rollbacks
✅ **Use transactions** (automatic, but be aware)
✅ **Test migrations** in development first
✅ **Keep migrations small** and focused
✅ **Document complex changes** in comments
✅ **Never edit executed migrations** - create new ones instead

---

## Production Deployment Workflow

### Standard Deployment (Zero Downtime)

```bash
#!/bin/bash
# deploy.sh - Production deployment script

set -e  # Exit on error

echo "🚀 Starting deployment..."

# 1. Backup database
echo "📦 Creating database backup..."
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# 3. Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# 4. Run migrations
echo "🗄️  Running database migrations..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "❌ Migration failed! Deployment aborted."
    exit 1
fi

# 5. Run tests (optional)
echo "🧪 Running tests..."
npm test

# 6. Restart application
echo "🔄 Restarting application..."
pm2 restart myplayground

echo "✅ Deployment complete!"
```

### Rollback Procedure

If deployment fails:

```bash
# 1. Rollback migrations
npm run migrate:rollback

# 2. Restore previous code version
git checkout <previous-commit>

# 3. Reinstall dependencies
npm install --production

# 4. Restart application
pm2 restart myplayground

# 5. If needed, restore database from backup
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backup_YYYYMMDD_HHMMSS.sql
```

---

## Migration System Architecture

### Migration Tracking Table

The system automatically creates `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INT,
    batch INT NOT NULL,
    INDEX idx_version (version),
    INDEX idx_batch (batch)
);
```

### Batch System

Migrations are grouped into batches:
- **Batch 1**: Initial deployment migrations
- **Batch 2**: First update deployment
- **Batch 3**: Second update deployment
- etc.

Rollback affects only the most recent batch by default.

### Transaction Safety

Each migration runs in a transaction:
- ✅ If migration succeeds → COMMIT
- ❌ If migration fails → ROLLBACK (no partial changes)

---

## Existing Migrations

### 20251113000001_create_initial_schema.js

Creates foundational database structure:
- `users` - User accounts with authentication
- `shows` - Anime show catalog (shared)
- `user_shows` - User-specific show associations
- `songs` - Music tracks
- `user_songs` - User-song associations with favorites
- `playlists` - Music playlists
- `streaming_sites` - Streaming platforms
- `show_streaming_sites` - Show-to-site mappings

Also inserts:
- 8 default streaming sites
- Dev user account

### 20251113000002_add_user_roles.js

Adds role-based access control:
- Adds `role` column to users table (ENUM: 'user', 'admin')
- Sets dev user as admin
- Adds index on role column

---

## Environment Configuration

Ensure `.env` file contains:

```ini
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-secure-password
DB_NAME=myplayground_prod
DB_CONNECTION_LIMIT=10

# Authentication
JWT_SECRET=your-super-secret-production-key
JWT_EXPIRATION=7d

# Application
USE_DATABASE=true
NODE_ENV=production
```

---

## Troubleshooting

### Migration Fails with "Table already exists"

**Problem**: Migration attempting to create existing table

**Solution**:
```bash
# Check migration status
npm run migrate:status

# If migration wasn't recorded, manually record it
mysql -u root -p
INSERT INTO schema_migrations (version, name, batch) 
VALUES ('20251113000001', 'create_initial_schema', 1);
```

### Cannot Rollback Migration

**Problem**: Migration missing down() method

**Solution**: Manually undo changes:
```bash
# Connect to database
mysql -u root -p myplayground_dev

# Manually undo changes
# Then remove from tracking table
DELETE FROM schema_migrations WHERE version = 'YYYYMMDDHHMMSS';
```

### Migration Stuck in Progress

**Problem**: Migration interrupted, transaction not committed

**Solution**:
```bash
# Check for locks
SHOW PROCESSLIST;

# Kill hanging process if needed
KILL <process_id>;

# Verify migration table
SELECT * FROM schema_migrations ORDER BY id DESC;
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run migrate
        env:
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_USER: ${{ secrets.DB_USER }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          DB_NAME: ${{ secrets.DB_NAME }}
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to production
        run: ./deploy.sh
```

---

## Security Best Practices

### Production Checklist

- [ ] Change default dev user password
- [ ] Use strong JWT_SECRET (random 64+ characters)
- [ ] Enable SSL/TLS for database connections
- [ ] Restrict database user permissions (no DROP, ALTER in production)
- [ ] Set up automated database backups
- [ ] Enable query logging
- [ ] Configure firewall rules
- [ ] Use environment variables (never commit secrets)
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerting

### Database Permissions

Create migration-specific user:

```sql
-- Create migration user with limited permissions
CREATE USER 'migration_user'@'localhost' IDENTIFIED BY 'secure-password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP 
ON myplayground_prod.* 
TO 'migration_user'@'localhost';

FLUSH PRIVILEGES;
```

---

## Monitoring and Maintenance

### Regular Tasks

**Daily**:
- Monitor application logs
- Check database connections
- Verify backup completion

**Weekly**:
- Review migration execution times
- Check for failed migration attempts
- Analyze slow queries

**Monthly**:
- Test rollback procedures
- Review and optimize indexes
- Update database statistics

### Health Checks

Add to your monitoring:

```javascript
// Check migration status
async function checkMigrationHealth() {
    const status = await migrationManager.status();
    const pending = status.filter(m => m.status === 'pending');
    
    if (pending.length > 0) {
        alert('Pending migrations detected!');
    }
}
```

---

## Support and Resources

### Documentation
- **Migration Manager**: `src/Database/MigrationManager.js`
- **CLI Tool**: `scripts/migrate.js`
- **Phase 8 Summary**: `docs/phase-summaries/PHASE8_COMPLETION_SUMMARY.md`

### Getting Help

1. Check migration status: `npm run migrate:status`
2. Review logs in `logs/` directory
3. Check database: `SELECT * FROM schema_migrations;`
4. Test in development first
5. Consult team before production rollbacks

---

## Version History

| Version | Date | Migrations | Description |
|---------|------|------------|-------------|
| 1.0.0 | 2025-11-13 | 1-2 | Initial schema + user roles |

---

**Last Updated**: November 13, 2025  
**Migration System Version**: 1.0.0  
**Status**: ✅ Production Ready
