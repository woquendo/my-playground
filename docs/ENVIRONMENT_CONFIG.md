# Environment Configuration Guide

This document explains how to configure the application using environment variables for all phases of development.

## Quick Start

1. **Copy the example environment file:**
   ```bash
   cp example.env .env
   ```

2. **Update the `.env` file with your settings:**
   - Set your MySQL password in `DB_PASSWORD`
   - Update `APP_URL` when deploying to a server
   - Change security secrets for production

3. **The application will automatically load these settings**

---

## Configuration Sections

### 1. Application Configuration

Controls basic application behavior:

```env
NODE_ENV=development          # Environment: development, staging, production
DEBUG=true                     # Enable verbose logging
PORT=8000                      # Server port
HOST=localhost                 # Server host
APP_URL=http://localhost:8000  # Full application URL (important for production)
API_URL=http://localhost:3000  # Backend API URL (Phase 8+)
```

**When to update:**
- `NODE_ENV`: Change to `production` when deploying
- `APP_URL`: **CRITICAL** - Update to your domain when deploying (e.g., `https://myplayground.example.com`)
- `API_URL`: **CRITICAL** - Update for production (same as APP_URL if using nginx proxy, or separate subdomain)
- `PORT`: Change if port 8000 is already in use

**Important:** The `API_URL` variable (added in Phase 8.5) allows API repositories to work in any environment. In production, this can be:
- Same domain: `https://yourdomain.com` (nginx proxies `/api/*` to backend)
- Separate subdomain: `https://api.yourdomain.com` (requires CORS configuration)

---

### 2. Database Configuration (Phase 8)

MySQL database settings. Not used until Phase 8:

```env
DB_HOST=localhost              # MySQL server host
DB_PORT=3306                   # MySQL server port
DB_USER=root                   # MySQL username
DB_PASSWORD=your_password      # MySQL password
DB_NAME=myplayground_dev       # Database name
DB_CONNECTION_LIMIT=10         # Max concurrent connections
DB_QUEUE_LIMIT=0              # Max queued connection requests (0 = unlimited)
USE_DATABASE=false            # Enable database (false for Phase 1-7)
```

**Phase 1-7:** Keep `USE_DATABASE=false` (uses localStorage)  
**Phase 8:** Set `USE_DATABASE=true` to enable MySQL

---

### 3. External Services

API keys for optional integrations:

```env
MAL_API_KEY=                  # MyAnimeList API key (optional)
MAL_API_SECRET=               # MyAnimeList API secret (optional)
YOUTUBE_API_KEY=              # YouTube Data API key (optional)
```

**Current:** The app uses proxy scraping (no API keys required)  
**Future:** Official APIs provide better rate limits and reliability

---

### 4. Security Configuration

Authentication and CORS settings:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
CORS_ORIGIN=http://localhost:8000
```

**⚠️ IMPORTANT for Production:**
- Generate strong random secrets for `JWT_SECRET` and `SESSION_SECRET`
- Update `CORS_ORIGIN` to your domain(s) (comma-separated for multiple)
- Example: `CORS_ORIGIN=https://myplayground.com,https://www.myplayground.com`

**Generate secure secrets:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes(32))
```

---

### 5. Caching Configuration

Performance optimization settings:

```env
CACHE_TTL=300000              # Cache time-to-live in milliseconds (5 minutes)
CACHE_MAX_SIZE=100            # Maximum number of cached entries
```

**Tuning:**
- Higher `CACHE_TTL` = Less frequent API calls, but staler data
- Higher `CACHE_MAX_SIZE` = More memory usage, but better performance

---

### 6. Logging Configuration

Debug and monitoring settings:

```env
LOG_LEVEL=debug               # Logging level: debug, info, warn, error
LOG_FILE_PATH=                # Optional: path to log file (empty = console only)
```

**Levels:**
- `debug`: Everything (use in development)
- `info`: General information
- `warn`: Warning messages only
- `error`: Error messages only

---

### 7. Feature Flags

Enable/disable application features:

```env
FEATURE_SCHEDULE_UPDATES=true  # Allow schedule updates
FEATURE_MUSIC_PLAYER=true      # Enable music player
FEATURE_IMPORT=true            # Enable data import
FEATURE_EXPORT=true            # Enable data export
```

**Use cases:**
- Disable features during maintenance
- Gradual rollout of new features
- A/B testing

---

### 8. Storage Configuration

Data persistence settings:

```env
STORAGE_TYPE=localStorage     # Storage backend: localStorage or mysql
DATA_DIR=./data              # Directory for JSON file storage
```

**Phase 1-7:** `STORAGE_TYPE=localStorage`  
**Phase 8:** `STORAGE_TYPE=mysql`

---

### 9. Performance Monitoring

Resource usage tracking:

```env
ENABLE_RESOURCE_MONITOR=true  # Enable performance monitoring
MAX_MEMORY_MB=100            # Memory usage alert threshold
MAX_LOAD_TIME_MS=1000        # Page load time alert threshold
```

**Used by ResourceMonitor in Phase 6**

---

## Usage in Code

### JavaScript/Node.js

```javascript
import config from '@infrastructure/Config';

// Application settings
console.log(config.app.port);           // 8000
console.log(config.app.isDevelopment);  // true
console.log(config.app.baseUrl);        // http://localhost:8000

// Database settings
if (config.database.enabled) {
    const dbConfig = config.database.getConnectionConfig();
    // Use with mysql2
}

// Feature flags
if (config.features.musicPlayer) {
    // Initialize music player
}

// Security
const jwtSecret = config.security.jwt.secret;
```

### Python (server.py)

For the Python server, environment variables can be accessed using `os.environ`:

```python
import os

port = int(os.getenv('PORT', 8000))
debug = os.getenv('DEBUG', 'false').lower() == 'true'
```

---

## Environment-Specific Configuration

### Development (Local)

```env
NODE_ENV=development
DEBUG=true
APP_URL=http://localhost:8000
USE_DATABASE=false
LOG_LEVEL=debug
```

### Staging (Test Server)

```env
NODE_ENV=staging
DEBUG=true
APP_URL=https://staging.myplayground.com
USE_DATABASE=true
LOG_LEVEL=info
CORS_ORIGIN=https://staging.myplayground.com
```

### Production (Live Server)

```env
NODE_ENV=production
DEBUG=false
APP_URL=https://myplayground.com
USE_DATABASE=true
LOG_LEVEL=warn
CORS_ORIGIN=https://myplayground.com,https://www.myplayground.com

# Change these secrets!
JWT_SECRET=<generated-secret-here>
SESSION_SECRET=<generated-secret-here>
```

---

## Domain Configuration

### Why is APP_URL important?

The `APP_URL` is used for:

1. **CORS validation** - Ensures requests come from your domain
2. **Redirects** - Generating proper URLs for redirects
3. **Email links** - If you add email notifications (Phase 8+)
4. **OAuth callbacks** - If you add social login (future)
5. **API responses** - Generating full URLs in API responses

### Setting up a custom domain

When you deploy to a server with a custom domain:

1. **Update APP_URL:**
   ```env
   APP_URL=https://myplayground.yourdomain.com
   ```

2. **Update CORS_ORIGIN:**
   ```env
   CORS_ORIGIN=https://myplayground.yourdomain.com
   ```

3. **Configure your web server** (Apache/Nginx) to:
   - Point to your application directory
   - Proxy requests to port 8000 (or your configured PORT)
   - Handle SSL/HTTPS certificates

4. **Example Nginx configuration:**
   ```nginx
   server {
       listen 80;
       server_name myplayground.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

---

## Security Best Practices

### 1. Never commit `.env` to Git
- ✅ `.env` is already in `.gitignore`
- ✅ Commit `example.env` as a template
- ❌ Never share your `.env` file publicly

### 2. Use strong secrets in production
```bash
# Generate a secure JWT secret
openssl rand -base64 32

# Or in PowerShell:
[Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes(32))
```

### 3. Different secrets per environment
- Development: Can use simple secrets for convenience
- Staging: Use different secrets than production
- Production: Use strong, unique, randomly generated secrets

### 4. Rotate secrets regularly
- Change `JWT_SECRET` every 90 days in production
- Update all users' sessions when rotating

### 5. Use environment variables on server
- Many hosting providers (Vercel, Heroku, AWS) have built-in secret management
- Never hardcode secrets in your codebase

---

## Validation

The configuration module automatically validates settings on startup:

```javascript
import config from '@infrastructure/Config';

// Manual validation (optional)
try {
    config.validate();
    console.log('✅ Configuration is valid');
} catch (error) {
    console.error('❌ Configuration error:', error.message);
}
```

**Validation checks:**
- PORT is between 1-65535
- Database credentials are present if `USE_DATABASE=true`
- JWT secret is changed in production
- Required environment variables are set

---

## Troubleshooting

### Issue: "Configuration validation failed"

**Solution:** Check that all required variables are set in `.env`

```bash
# Verify .env file exists
ls -la .env

# Check for syntax errors (no spaces around =)
# ✅ Correct: PORT=8000
# ❌ Wrong:   PORT = 8000
```

### Issue: Changes to .env not taking effect

**Solution:** 
1. Restart the server/application
2. Clear browser cache
3. Verify `.env` is in the project root

### Issue: Database connection fails

**Solution:**
1. Verify MySQL is running: `Get-Service MySQL*`
2. Test connection: `mysql -u root -p`
3. Check credentials in `.env` match MySQL settings
4. Ensure `USE_DATABASE=false` for Phase 1-7

---

## Phase-Specific Requirements

### Phase 1-7 (Current)
```env
USE_DATABASE=false
STORAGE_TYPE=localStorage
```

### Phase 8 (Database Migration)
```env
USE_DATABASE=true
STORAGE_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=myplayground_dev
```

---

## Additional Resources

- [dotenv documentation](https://github.com/motdotla/dotenv)
- [mysql2 documentation](https://github.com/sidorares/node-mysql2)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CORS Configuration](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## Quick Reference

| Variable | Phase | Required | Default | Description |
|----------|-------|----------|---------|-------------|
| `NODE_ENV` | 1+ | No | `development` | Application environment |
| `PORT` | 1+ | No | `8000` | Server port |
| `APP_URL` | 1+ | Yes (prod) | `http://localhost:8000` | Application URL |
| `USE_DATABASE` | 8 | No | `false` | Enable MySQL |
| `DB_PASSWORD` | 8 | Yes (if USE_DATABASE=true) | - | MySQL password |
| `JWT_SECRET` | 8 | Yes (prod) | - | JWT signing secret |
| `CORS_ORIGIN` | 1+ | Yes (prod) | `http://localhost:8000` | Allowed origins |

---

**Next Steps:**
1. Copy `example.env` to `.env`
2. Update `DB_PASSWORD` with your MySQL password
3. Review all settings and adjust as needed
4. Start Phase 1 development! 🚀
