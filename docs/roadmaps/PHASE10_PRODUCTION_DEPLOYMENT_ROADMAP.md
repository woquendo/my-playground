# Phase 10: Production Deployment Roadmap

**Status:** 🔜 Not Started  
**Priority:** High  
**Dependencies:** Phase 9 (Authentication UI)

## Overview

Deploy the My Playground application to a production server with proper hosting, domain configuration, SSL certificates, and production-grade database setup. This phase transforms the local development setup into a publicly accessible, secure web application.

## Current State

### ✅ What We Have
- Fully functional application running locally
- Backend API server (Node.js + Express)
- Frontend static files (HTML/CSS/JS)
- MySQL database schema and migrations
- Authentication system with JWT
- User management and role-based access

### ⚠️ What We Need
- Public server/hosting platform
- Domain name
- SSL/TLS certificates
- Production database instance
- Environment configuration for production
- Deployment scripts and CI/CD
- Monitoring and logging
- Backup strategy
- Security hardening

## Deployment Options

### Option 1: Cloud Hosting (Recommended)

#### Digital Ocean Droplet
**Pros:**
- Affordable ($6-12/month for starter)
- Full control over server
- Easy to scale
- Good documentation
- SSH access for manual control

**Specs Recommended:**
- Basic Droplet: 1GB RAM, 1 vCPU, 25GB SSD ($6/month)
- Regular Droplet: 2GB RAM, 1 vCPU, 50GB SSD ($12/month)

**Setup Steps:**
1. Create Digital Ocean account
2. Create Ubuntu 22.04 LTS droplet
3. Configure SSH keys
4. Set up firewall rules
5. Install Node.js, npm, MySQL, nginx
6. Configure nginx as reverse proxy
7. Deploy application code
8. Set up SSL with Let's Encrypt
9. Configure domain DNS

#### AWS EC2
**Pros:**
- Enterprise-grade reliability
- Free tier available (12 months)
- Extensive services ecosystem
- Auto-scaling capabilities

**Cons:**
- More complex setup
- Pricing can be confusing
- Overkill for small projects

**Recommended Instance:**
- t2.micro (free tier): 1GB RAM, 1 vCPU
- t3.small (paid): 2GB RAM, 2 vCPU

#### Heroku
**Pros:**
- Easiest deployment (git push to deploy)
- Automatic SSL certificates
- Built-in database options
- Great for MVPs

**Cons:**
- More expensive for same resources
- Less control over server
- No free tier for 24/7 apps anymore

**Pricing:**
- Eco plan: $5/month (app sleeps after inactivity)
- Basic: $7/month per dyno
- Database: $5-9/month for hobby tier

#### Railway / Render / Fly.io
**Pros:**
- Modern deployment platforms
- Simple configuration
- Automatic deployments from GitHub
- Good free tiers

**Cons:**
- Newer platforms (less battle-tested)
- May have resource limits on free tier

### Option 2: VPS Hosting

#### Linode, Vultr, or Hetzner
Similar to Digital Ocean but different pricing/features.

**Pricing:** $5-10/month for basic VPS

### Option 3: Shared Hosting with Node.js Support

#### Hostinger, A2 Hosting, etc.
**Pros:**
- Very affordable ($3-8/month)
- Managed environment
- cPanel interface

**Cons:**
- Less control
- Resource limitations
- May not support all Node.js features
- Shared resources affect performance

## Recommended Solution: Digital Ocean Droplet

### Why Digital Ocean?
- **Balance:** Good mix of control, price, and ease
- **Documentation:** Excellent tutorials and community
- **Cost:** Predictable monthly pricing
- **Scalability:** Easy to upgrade as app grows
- **Support:** Good community and paid support options

### Setup Cost Breakdown
- **Droplet:** $6-12/month
- **Domain:** $10-15/year (Namecheap, Google Domains)
- **SSL:** Free (Let's Encrypt)
- **Backups:** $1-2/month (Digital Ocean snapshots)
- **Total:** ~$8-15/month

## Implementation Plan

### Phase 10.1: Server Setup

#### Task 1: Provision Server

**Platform:** Digital Ocean (or alternative)

**Steps:**
1. Create account at digitalocean.com
2. Add payment method
3. Create new Droplet:
   - Distribution: Ubuntu 22.04 LTS
   - Plan: Basic ($6/month or $12/month)
   - Datacenter: Choose closest to target users
   - Authentication: SSH keys (more secure than password)
   - Hostname: myplayground-prod
4. Note the server IP address
5. Configure firewall (ports 22, 80, 443, 3000, 3306)

#### Task 2: Initial Server Configuration

**Connect via SSH:**
```bash
ssh root@your_server_ip
```

**Update system:**
```bash
apt update && apt upgrade -y
```

**Create non-root user:**
```bash
adduser deploy
usermod -aG sudo deploy
```

**Configure SSH for new user:**
```bash
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

**Set up firewall:**
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

#### Task 3: Install Required Software

**Install Node.js (LTS):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
node --version  # Verify installation
```

**Install MySQL:**
```bash
apt install -y mysql-server
mysql_secure_installation  # Follow prompts
```

**Install nginx:**
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

**Install Git:**
```bash
apt install -y git
```

**Install PM2 (Node.js process manager):**
```bash
npm install -g pm2
```

### Phase 10.2: Database Setup

#### Task 1: Configure MySQL for Production

**Login to MySQL:**
```bash
mysql -u root -p
```

**Create production database:**
```sql
CREATE DATABASE myplayground_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'myplayground_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON myplayground_prod.* TO 'myplayground_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Secure MySQL:**
- Remove test databases
- Disable remote root login
- Use strong passwords
- Configure bind-address to 127.0.0.1 (local only)

#### Task 2: Run Database Migrations

**Clone repository:**
```bash
cd /var/www
git clone https://github.com/woquendo/my-playground.git
cd my-playground
npm install
```

**Create production .env file:**
```bash
cp .env.example .env
nano .env
```

**Set production environment variables:**
```properties
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=myplayground_user
DB_PASSWORD=strong_password_here
DB_NAME=myplayground_prod
JWT_SECRET=generate-secure-random-string-64-chars
SESSION_SECRET=generate-secure-random-string-64-chars
APP_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

**Run migrations:**
```bash
npm run migrate:up
```

**Verify tables created:**
```bash
mysql -u myplayground_user -p myplayground_prod
SHOW TABLES;
EXIT;
```

### Phase 10.3: Domain and SSL Setup

#### Task 1: Register Domain

**Options:**
- Namecheap: ~$10/year for .com
- Google Domains: ~$12/year
- Cloudflare: ~$10/year
- GoDaddy: ~$15/year (often has promotions)

**Recommended:** Namecheap or Google Domains

#### Task 2: Configure DNS

**Add DNS records:**
1. Login to domain registrar
2. Find DNS settings
3. Add A record:
   - Host: @ (or blank)
   - Points to: your_server_ip
   - TTL: 300 (5 minutes)
4. Add A record for www:
   - Host: www
   - Points to: your_server_ip
   - TTL: 300
5. Wait 5-60 minutes for DNS propagation

**Verify DNS:**
```bash
nslookup yourdomain.com
```

#### Task 3: Install SSL Certificate (Let's Encrypt)

**Install Certbot:**
```bash
apt install -y certbot python3-certbot-nginx
```

**Obtain certificate:**
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Follow prompts:**
- Enter email for renewal notices
- Agree to terms
- Choose to redirect HTTP to HTTPS (recommended)

**Verify auto-renewal:**
```bash
certbot renew --dry-run
```

**Certificate auto-renews every 90 days**

### Phase 10.4: Application Deployment

#### Task 1: Configure nginx Reverse Proxy

**Create nginx config:**
```bash
nano /etc/nginx/sites-available/myplayground
```

**Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Static files
    root /var/www/my-playground;
    index app.html index.html;

    # Serve static assets
    location / {
        try_files $uri $uri/ /app.html;
    }

    # Proxy API requests to Node.js
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
}
```

**Enable site:**
```bash
ln -s /etc/nginx/sites-available/myplayground /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

#### Task 2: Deploy Application Code

**Set proper permissions:**
```bash
chown -R deploy:deploy /var/www/my-playground
chmod -R 755 /var/www/my-playground
```

**Install dependencies:**
```bash
cd /var/www/my-playground
npm ci --production  # Use npm ci for clean install
```

**Build frontend (if needed):**
```bash
# If you have a build step, run it here
# npm run build
```

#### Task 3: Start Application with PM2

**Start API server:**
```bash
pm2 start api-server.js --name myplayground-api
pm2 save  # Save process list
pm2 startup  # Auto-start on server reboot
```

**Verify running:**
```bash
pm2 status
pm2 logs myplayground-api
```

**Monitor:**
```bash
pm2 monit
```

### Phase 10.5: Production Environment Configuration

#### Task 1: Update Environment Variables

**Production .env file:**
```properties
NODE_ENV=production
DEBUG=false
PORT=8000
HOST=0.0.0.0
API_PORT=3000

APP_URL=https://yourdomain.com

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=myplayground_user
DB_PASSWORD=STRONG_RANDOM_PASSWORD
DB_NAME=myplayground_prod
DB_CONNECTION_LIMIT=10

USE_DATABASE=true

# Security
JWT_SECRET=GENERATE_64_CHAR_RANDOM_STRING
JWT_EXPIRATION=7d
SESSION_SECRET=GENERATE_64_CHAR_RANDOM_STRING
CORS_ORIGIN=https://yourdomain.com

# Caching
CACHE_TTL=300000
CACHE_MAX_SIZE=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/www/my-playground/logs/app.log

# Features
FEATURE_SCHEDULE_UPDATES=true
FEATURE_MUSIC_PLAYER=true
FEATURE_IMPORT=true
FEATURE_EXPORT=true

STORAGE_TYPE=mysql
ENABLE_RESOURCE_MONITOR=true
```

**Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Task 2: Update API Server Configuration

**File:** `api-server.js`

Ensure production-ready settings:
- CORS configured for production domain
- Trust proxy headers (for nginx)
- Rate limiting enabled
- Proper error handling (don't expose stack traces)

### Phase 10.6: Testing Production Deployment

#### Task 1: Smoke Tests

**Test checklist:**
- [ ] Domain resolves to server IP
- [ ] HTTPS works (no certificate warnings)
- [ ] HTTP redirects to HTTPS
- [ ] Homepage loads correctly
- [ ] Static assets load (CSS, JS, images)
- [ ] API health check: `https://yourdomain.com/api/health`
- [ ] Registration works
- [ ] Login works
- [ ] Schedule page loads with data
- [ ] Database queries execute
- [ ] JWT authentication works
- [ ] Logout works

#### Task 2: Performance Testing

**Test:**
- Page load times under 2 seconds
- API response times under 500ms
- Concurrent user handling (use tools like Apache Bench)

**Tools:**
```bash
# Install Apache Bench
apt install apache2-utils

# Test API endpoint
ab -n 1000 -c 10 https://yourdomain.com/api/health

# Test homepage
ab -n 100 -c 5 https://yourdomain.com/
```

#### Task 3: Security Testing

**Verify:**
- [ ] SSL certificate valid (A+ rating on ssllabs.com)
- [ ] SQL injection protection
- [ ] XSS protection headers
- [ ] CSRF protection (if forms posted)
- [ ] Rate limiting on authentication endpoints
- [ ] Secure password hashing (bcrypt)
- [ ] JWT tokens expire properly
- [ ] MySQL not accessible remotely

### Phase 10.7: Monitoring and Maintenance

#### Task 1: Set Up Logging

**Create log directory:**
```bash
mkdir -p /var/www/my-playground/logs
chown deploy:deploy /var/www/my-playground/logs
```

**Configure log rotation:**
```bash
nano /etc/logrotate.d/myplayground
```

```
/var/www/my-playground/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

#### Task 2: Set Up Monitoring

**PM2 Monitoring:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Optional: UptimeRobot**
- Free service to monitor uptime
- Sends alerts if site goes down
- Configure at uptimerobot.com

**Optional: New Relic / Datadog**
- Application performance monitoring
- Free tiers available

#### Task 3: Database Backups

**Automated daily backups:**
```bash
nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="myplayground_prod"
DB_USER="myplayground_user"
DB_PASSWORD="your_password"

mkdir -p $BACKUP_DIR
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/myplayground_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "myplayground_*.sql.gz" -mtime +30 -delete
```

**Make executable:**
```bash
chmod +x /usr/local/bin/backup-db.sh
```

**Schedule with cron:**
```bash
crontab -e
```

Add line:
```
0 2 * * * /usr/local/bin/backup-db.sh
```

### Phase 10.8: Deployment Scripts

#### Create deployment script for updates

**File:** `scripts/deploy.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Deploying My Playground..."

# Navigate to project directory
cd /var/www/my-playground

# Pull latest code
echo "📥 Pulling latest code from git..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Run database migrations
echo "🗄️ Running database migrations..."
npm run migrate:up

# Restart API server
echo "🔄 Restarting API server..."
pm2 restart myplayground-api

# Reload nginx
echo "🔧 Reloading nginx..."
systemctl reload nginx

echo "✅ Deployment complete!"
pm2 status
```

**Make executable:**
```bash
chmod +x scripts/deploy.sh
```

## Security Hardening Checklist

- [ ] SSH: Disable root login, use SSH keys only
- [ ] Firewall: Only allow necessary ports (22, 80, 443)
- [ ] MySQL: Local access only, strong passwords
- [ ] SSL: A+ rating on SSL Labs
- [ ] Environment variables: Secure secrets, not in git
- [ ] Updates: Regular system updates (`apt update && apt upgrade`)
- [ ] Backups: Daily automated database backups
- [ ] Monitoring: Uptime and error monitoring
- [ ] Rate limiting: On authentication endpoints
- [ ] CORS: Only allow production domain
- [ ] Headers: Security headers configured in nginx
- [ ] Logging: Log authentication attempts and errors

## Cost Estimation

### Monthly Costs
- **Server (Digital Ocean):** $6-12/month
- **Domain (annual/12):** ~$1/month
- **Backups:** $1-2/month
- **SSL:** Free (Let's Encrypt)
- **Total:** ~$8-15/month

### One-Time Costs
- **Domain registration:** $10-15/year
- **Setup time:** ~8-16 hours

### Scaling Costs
- Upgrade droplet: $18-24/month (4GB RAM)
- Managed database: $15-25/month
- CDN (Cloudflare): Free or $20/month

## Success Criteria

- ✅ Application accessible at custom domain with HTTPS
- ✅ Users can register and login
- ✅ All features work in production
- ✅ Database queries execute properly
- ✅ API authentication works
- ✅ SSL certificate valid and auto-renewing
- ✅ Server monitoring in place
- ✅ Daily database backups configured
- ✅ Deployment process documented
- ✅ Performance acceptable (< 2s page load)

## Rollback Plan

If deployment fails:

1. **Keep old version running:** Don't stop current service until new version verified
2. **Git tags:** Tag releases for easy rollback
   ```bash
   git tag -a v1.0.0 -m "Production release"
   git checkout v1.0.0
   ```
3. **Database backups:** Restore from backup if needed
4. **PM2 previous:** `pm2 reload myplayground-api --update-env`

## Timeline Estimate

- **Server setup:** 2-4 hours
- **Database configuration:** 1-2 hours
- **Domain and SSL:** 1-2 hours
- **Application deployment:** 2-3 hours
- **Testing and verification:** 2-4 hours
- **Monitoring setup:** 1-2 hours
- **Documentation:** 1-2 hours

**Total:** ~10-19 hours (spread over 2-3 days for DNS propagation)

## Next Steps After Deployment

1. **Monitor for first 48 hours:** Watch logs, check errors
2. **Optimize performance:** Enable caching, CDN if needed
3. **User testing:** Get feedback from real users
4. **Analytics:** Add Google Analytics or similar
5. **SEO:** Add meta tags, sitemap.xml
6. **Marketing:** Share with community!

## Support Resources

- **Digital Ocean Docs:** https://docs.digitalocean.com/
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **PM2 Documentation:** https://pm2.keymetrics.io/docs/
- **nginx Documentation:** https://nginx.org/en/docs/
- **MySQL Documentation:** https://dev.mysql.com/doc/

## Conclusion

This roadmap provides a complete path from local development to production deployment. Follow each phase carefully, test thoroughly, and don't hesitate to consult documentation or community resources when needed.

**Remember:** Start small, test often, and scale as needed. Good luck with your deployment! 🚀
