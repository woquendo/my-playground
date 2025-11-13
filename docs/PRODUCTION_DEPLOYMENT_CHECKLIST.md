# Production Deployment Checklist

## Pre-Deployment (Development Phase)

### Code Preparation
- [ ] All tests passing (`npm test`)
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] CHANGELOG.md updated with version notes
- [ ] Git branch merged to main/master

### Database Migration Testing
- [ ] All migrations tested locally
  ```bash
  npm run migrate:status
  npm run migrate
  npm run migrate:rollback
  npm run migrate  # Re-apply
  ```
- [ ] Rollback tested successfully
- [ ] Data integrity verified after migration
- [ ] Performance tested with production-like data volume
- [ ] No destructive migrations without backup plan

### Security Audit
- [ ] Environment variables reviewed (no secrets in code)
- [ ] JWT_SECRET changed from default
- [ ] Database passwords are strong (16+ characters)
- [ ] Default admin user password changed
- [ ] SQL injection prevention verified
- [ ] XSS protection in place
- [ ] CORS configured correctly
- [ ] Rate limiting implemented
- [ ] HTTPS enforced (production only)

### Configuration
- [ ] `.env` file configured for production
  ```ini
  NODE_ENV=production
  USE_DATABASE=true
  DB_HOST=your-production-db
  DB_NAME=myplayground_prod
  JWT_SECRET=<64-char-random-string>
  # etc.
  ```
- [ ] Database connection limits appropriate for server
- [ ] Log level set to 'info' or 'warn' (not 'debug')
- [ ] External API keys valid and production-ready
- [ ] Cache TTL values optimized

---

## Deployment Day

### Pre-Deployment Backup
- [ ] **CRITICAL**: Create complete database backup
  ```bash
  mysqldump -u root -p myplayground_prod > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup file is not empty
- [ ] Store backup in secure location
- [ ] Test backup restoration (optional but recommended)

### Server Preparation
- [ ] Server resources adequate (CPU, RAM, Disk)
- [ ] Node.js version matches development (20.x)
- [ ] MySQL server running and accessible
- [ ] Firewall rules configured
- [ ] SSL certificates installed
- [ ] Domain DNS configured correctly

### Deploy Application Code
```bash
# 1. Connect to production server
ssh user@production-server

# 2. Navigate to application directory
cd /var/www/myplayground

# 3. Pull latest code
git pull origin main

# 4. Install dependencies
npm install --production

# 5. Verify environment configuration
cat .env  # Ensure production settings
```

### Run Database Migrations
```bash
# 1. Check current migration status
npm run migrate:status

# 2. Preview pending migrations (dry-run)
node scripts/migrate.js migrate --dry-run

# 3. Run migrations
npm run migrate

# 4. Verify migrations completed
npm run migrate:status
# Should show all migrations as ✓ executed

# 5. Verify data integrity
mysql -u root -p
USE myplayground_prod;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM shows;
SELECT COUNT(*) FROM songs;
# Verify counts match expectations
```

### Start/Restart Application
```bash
# Using PM2 (recommended)
pm2 restart myplayground
pm2 save

# Or using systemd
sudo systemctl restart myplayground

# Or direct node
npm start
```

### Post-Deployment Verification
- [ ] Application starts without errors
  ```bash
  pm2 logs myplayground --lines 50
  # Check for errors
  ```
- [ ] Database connection successful
- [ ] Login functionality works
- [ ] User roles enforced correctly
- [ ] Admin dashboard accessible
- [ ] Show schedule displays correctly
- [ ] Music player functional
- [ ] All API endpoints responding
- [ ] Frontend loads without errors (check browser console)

### Smoke Tests
- [ ] **Login Test**: Login with existing user
- [ ] **Registration Test**: Create new test user
- [ ] **Authorization Test**: Verify admin-only features hidden from regular users
- [ ] **CRUD Test**: Create/read/update/delete show entry
- [ ] **Music Test**: Play song, add to favorites
- [ ] **Playlist Test**: Create/edit playlist
- [ ] **Search Test**: Search shows and songs
- [ ] **Performance Test**: Page load times acceptable (<2s)

---

## Post-Deployment Monitoring

### Immediate (First Hour)
- [ ] Check application logs every 10 minutes
  ```bash
  pm2 logs myplayground --lines 100
  # Look for errors, warnings, unusual activity
  ```
- [ ] Monitor database connections
  ```sql
  SHOW PROCESSLIST;
  # Verify connection count is reasonable
  ```
- [ ] Monitor server resources
  ```bash
  htop
  # Check CPU, memory, disk usage
  ```
- [ ] Test critical user flows manually

### Short-term (First 24 Hours)
- [ ] Check error logs for patterns
- [ ] Monitor user activity/registrations
- [ ] Verify scheduled tasks running (if any)
- [ ] Check database query performance
  ```sql
  SHOW FULL PROCESSLIST;
  # Look for slow queries
  ```
- [ ] Monitor disk space (logs can grow)
- [ ] Review security logs for suspicious activity

### Ongoing (Weekly)
- [ ] Review application logs
- [ ] Database backup verification
- [ ] Performance metrics review
- [ ] User feedback review
- [ ] Security updates check
- [ ] Dependency updates (`npm outdated`)

---

## Rollback Procedure

### When to Rollback
- Critical bugs affecting core functionality
- Data corruption or loss detected
- Security vulnerabilities discovered
- Performance degradation (>50% slower)
- Migration failures causing data issues

### Rollback Steps

#### 1. Stop Application
```bash
pm2 stop myplayground
# Or
sudo systemctl stop myplayground
```

#### 2. Rollback Database Migrations
```bash
# Option A: Rollback last batch
npm run migrate:rollback

# Option B: Restore from backup (if migrations can't be rolled back)
mysql -u root -p myplayground_prod < backup_YYYYMMDD_HHMMSS.sql
```

#### 3. Restore Previous Code Version
```bash
# Find previous stable commit
git log --oneline -10

# Checkout previous version
git checkout <previous-stable-commit>

# Reinstall dependencies
npm install --production
```

#### 4. Restart Application
```bash
pm2 restart myplayground
pm2 save
```

#### 5. Verify Rollback
- [ ] Application starts successfully
- [ ] Core functionality working
- [ ] Data integrity confirmed
- [ ] Notify users of temporary issue (if needed)

---

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Lead Developer | [Your Name] | [Email/Phone] | 24/7 for critical |
| Database Admin | [DBA Name] | [Email/Phone] | Business hours |
| Server Admin | [SA Name] | [Email/Phone] | On-call |
| Project Manager | [PM Name] | [Email/Phone] | Business hours |

---

## Common Issues and Solutions

### Issue: Database connection timeout
**Symptoms**: "Connection lost" errors in logs
**Solution**:
```bash
# Check MySQL is running
sudo systemctl status mysql

# Check connection limits
mysql> SHOW VARIABLES LIKE 'max_connections';

# Increase if needed in my.cnf
max_connections = 200

# Restart MySQL
sudo systemctl restart mysql
```

### Issue: Migration fails partway
**Symptoms**: Some tables created, some missing
**Solution**:
```bash
# Migrations are transactional, so partial failure shouldn't happen
# But if it does:

# 1. Check migration status
npm run migrate:status

# 2. If migration is recorded but incomplete, remove record
mysql> DELETE FROM schema_migrations WHERE version = 'YYYYMMDDHHMMSS';

# 3. Fix migration file
# 4. Re-run migration
npm run migrate
```

### Issue: Application won't start
**Symptoms**: pm2 shows "errored" status
**Solution**:
```bash
# Check logs
pm2 logs myplayground --lines 100

# Common causes:
# - Environment variable missing (.env file)
# - Port already in use
# - Database connection failed
# - Syntax error in code

# Verify .env exists and is readable
ls -la .env
cat .env | grep DB_HOST

# Test database connection manually
mysql -u $DB_USER -p$DB_PASSWORD -h $DB_HOST $DB_NAME
```

### Issue: Users can't login
**Symptoms**: "Invalid credentials" despite correct password
**Solution**:
```bash
# Check JWT_SECRET is set
echo $JWT_SECRET

# Verify user exists in database
mysql> SELECT id, username, role FROM users WHERE username = 'username';

# Check password hash exists
mysql> SELECT LENGTH(password_hash) FROM users WHERE username = 'username';
# Should return 60 (bcrypt hash length)

# If needed, reset user password via CLI (create script)
```

---

## Performance Optimization (Post-Launch)

### Database
- [ ] Add indexes for slow queries
- [ ] Optimize frequently-run queries
- [ ] Enable query cache (if applicable)
- [ ] Set up replication (for high traffic)
- [ ] Regular ANALYZE TABLE commands

### Application
- [ ] Enable response compression (gzip)
- [ ] Implement caching (Redis/Memcached)
- [ ] Optimize image loading
- [ ] Enable CDN for static assets
- [ ] Implement connection pooling (already done)

### Server
- [ ] Enable HTTP/2
- [ ] Configure nginx/Apache reverse proxy
- [ ] Set up load balancer (for scaling)
- [ ] Enable firewall and fail2ban
- [ ] Configure logrotate for log management

---

## Documentation Updates

After successful deployment:
- [ ] Update README.md with production info
- [ ] Document any deployment-specific issues encountered
- [ ] Update architecture diagrams if changes made
- [ ] Record performance baselines
- [ ] Update team wiki/knowledge base

---

## Version Control

### Tag Release
```bash
# After successful deployment
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0
```

### Create Release Notes
Document in GitHub/GitLab releases:
- Features added
- Bugs fixed
- Migration notes
- Breaking changes
- Known issues

---

## Compliance and Legal

### Privacy & Data Protection
- [ ] User data encrypted at rest
- [ ] User data encrypted in transit (HTTPS)
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Cookie consent implemented (if applicable)
- [ ] GDPR compliance verified (if EU users)
- [ ] Data retention policy defined

### Backups and Recovery
- [ ] Automated daily backups configured
- [ ] Backup retention policy defined (30 days recommended)
- [ ] Disaster recovery plan documented
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined

---

## Success Criteria

Deployment is considered successful when:
- ✅ All smoke tests pass
- ✅ No errors in application logs (first hour)
- ✅ Database migrations completed successfully
- ✅ User login and registration working
- ✅ Admin features accessible to admins only
- ✅ Core functionality (shows, music) working
- ✅ Performance within acceptable range
- ✅ No data loss or corruption
- ✅ Rollback procedure tested and documented

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Watch for issues
2. **Gather user feedback** - Check for UX issues
3. **Performance tuning** - Optimize based on real usage
4. **Security audit** - Review logs for vulnerabilities
5. **Plan next iteration** - Document lessons learned

---

**Last Updated**: November 13, 2025  
**Version**: 1.0.0  
**Status**: ✅ Ready for Production Deployment
