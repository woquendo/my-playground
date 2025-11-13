# Production Readiness Audit

**Purpose:** Identify all hardcoded values that prevent zero-code-change deployment to production.

**Goal:** Deploy to production by only changing `.env` file - no code modifications required.

**Date:** November 12, 2025  
**Status:** 🟡 Needs 4 Critical Fixes

---

## Executive Summary

### Current State
- ✅ **API URLs:** Environment-based (fixed in Phase 8.5)
- ✅ **Database Config:** Environment-based (Phase 8)
- ✅ **Security Secrets:** Environment-based (Phase 8)
- ⚠️ **Sites Data Path:** Hardcoded `data/sites.json`
- ⚠️ **Streaming Site URLs:** Hardcoded in fallback logic
- ⚠️ **HTTP Client Timeout:** Hardcoded 30000ms
- ⚠️ **API Server Port:** Defaults to 3000 (not configurable in code)

### Required Changes
4 critical issues that need environment configuration before production deployment.

---

## 🔴 Critical Issues (Must Fix Before Production)

### 1. Sites Data Path Hardcoded
**File:** `src/Application/Services/SitesService.js:31`

**Current Code:**
```javascript
const data = await this.httpClient.get('data/sites.json');
```

**Problem:**
- Path is hardcoded as `data/sites.json`
- Cannot use CDN or different data directory in production
- Cannot switch to API endpoint without code change

**Solution:**
Add `SITES_DATA_PATH` or `DATA_DIR` environment variable.

**Recommended Config:**
```javascript
// In Config/index.js
data: {
    sitesPath: getEnv('SITES_DATA_PATH', 'data/sites.json'),
    showsPath: getEnv('SHOWS_DATA_PATH', 'data/shows.json'),
    songsPath: getEnv('SONGS_DATA_PATH', 'data/songs.json')
}
```

**Usage:**
```javascript
// Development
SITES_DATA_PATH=data/sites.json

// Production (CDN)
SITES_DATA_PATH=https://cdn.myplayground.com/data/sites.json

// Production (API - Phase 9.5)
SITES_DATA_PATH=/api/streaming-sites
```

**Impact:** Medium - Sites won't load if path changes in production

---

### 2. Streaming Site URLs Hardcoded (Fallback Logic)
**File:** `src/Application/Services/SitesService.js:106-116`

**Current Code:**
```javascript
_tryCommonSearchPatterns(baseUrl, encodedTitle, siteName) {
    switch (siteName.toLowerCase()) {
        case 'aniwave':
            return `https://aniwave.at/catalog?search=${encodedTitle}&type=anime`;
        case 'hianime':
            return `https://hianime.to/search?keyword=${encodedTitle}`;
        case 'crunchyroll':
        case 'hidive':
            return `${baseUrl}/search?q=${encodedTitle}`;
        default:
            return `${baseUrl}/search?q=${encodedTitle}`;
    }
}
```

**Problem:**
- URLs for aniwave and hianime are hardcoded
- If site domains change (common for anime sites), code must be updated
- Defeats purpose of having `sites.json` configuration

**Solution:**
Remove hardcoded URLs. All sites should use `searchPattern` from `sites.json`.

**Recommended Fix:**
```javascript
_tryCommonSearchPatterns(baseUrl, encodedTitle, siteName) {
    // Log warning that site is missing searchPattern
    this.logger.warn(`Site "${siteName}" missing searchPattern, using default`);
    
    // Return default pattern only
    return `${baseUrl}/search?q=${encodedTitle}`;
}
```

**Better Solution:**
Ensure all sites in `sites.json` have proper `searchPattern` and remove this fallback entirely.

**Impact:** Low - Only affects sites without searchPattern in sites.json (currently 0)

**Action:** Update `sites.json` to ensure all sites have searchPattern, then remove hardcoded URLs.

---

### 3. HTTP Client Timeout Hardcoded
**File:** `src/Application/Bootstrap/ServiceRegistration.js:43`

**Current Code:**
```javascript
container.singleton('httpClient', () => new HttpClient({
    timeout: 30000,
    headers: {
        'User-Agent': 'MyPlayground/1.0'
    }
}));
```

**Problem:**
- Timeout is hardcoded to 30 seconds
- Cannot adjust for production (may need longer timeout for slow API or CDN)
- Cannot tune performance without code change

**Solution:**
Add `HTTP_TIMEOUT` environment variable.

**Recommended Config:**
```javascript
// In Config/index.js
http: {
    timeout: getNumberEnv('HTTP_TIMEOUT', 30000), // 30 seconds default
    retries: getNumberEnv('HTTP_RETRIES', 3),
    userAgent: getEnv('HTTP_USER_AGENT', 'MyPlayground/1.0')
}
```

**Usage:**
```javascript
// Development (fast local server)
HTTP_TIMEOUT=10000

// Production (may have slower CDN/API)
HTTP_TIMEOUT=30000

// Production (aggressive timeout for better UX)
HTTP_TIMEOUT=5000
```

**Impact:** Low - Only affects network request timeouts

---

### 4. Server Ports Not Fully Configurable
**File:** `api-server.js:18`

**Current Code:**
```javascript
const PORT = process.env.API_PORT || 3000;
```

**Status:** ✅ Already using environment variable!

**File:** `server.py`

**Issue:** Python static server port is hardcoded in script.

**Solution:** Check if `server.py` uses environment variable or command-line arg.

**Investigation Needed:** Review `server.py` port configuration.

---

## 🟡 Medium Priority Issues (Should Fix)

### 5. Database Connection Timeouts Hardcoded
**File:** `src/Infrastructure/Database/ConnectionManager.js:54-55`

**Current Code:**
```javascript
acquireTimeout: 10000,
connectTimeout: 10000
```

**Problem:**
- Connection timeouts are hardcoded to 10 seconds
- Cannot tune for production database performance
- May need longer timeout for remote database

**Solution:**
Add environment variables.

**Recommended Config:**
```properties
DB_ACQUIRE_TIMEOUT=10000
DB_CONNECT_TIMEOUT=10000
```

**Impact:** Low - Only affects database connection initialization

---

### 6. YouTube API URL Hardcoded
**File:** Multiple files reference YouTube URLs

**Files:**
- `src/Presentation/Components/MusicPlayer.js:357`
- `src/Presentation/Components/Shell/GlobalMusicPlayer.js:889`

**Current Code:**
```javascript
tag.src = 'https://www.youtube.com/iframe_api';
```

**Problem:**
- YouTube iframe API URL is hardcoded
- Cannot use proxy or alternative if YouTube is blocked

**Solution:**
Add `YOUTUBE_API_URL` environment variable (low priority).

**Impact:** Very Low - YouTube API URL rarely changes

---

### 7. User-Agent String Hardcoded
**File:** `src/Application/Bootstrap/ServiceRegistration.js:45`

**Current Code:**
```javascript
headers: {
    'User-Agent': 'MyPlayground/1.0'
}
```

**Problem:**
- User-Agent is hardcoded
- Cannot change for different environments
- May want different User-Agent for production

**Solution:**
Add `HTTP_USER_AGENT` environment variable.

**Recommended Config:**
```properties
# Development
HTTP_USER_AGENT=MyPlayground/1.0-dev

# Production
HTTP_USER_AGENT=MyPlayground/1.0
```

**Impact:** Very Low - User-Agent rarely needs changes

---

## 🟢 Low Priority Issues (Nice to Have)

### 8. Test Port in package.json
**File:** `package.json:18`

**Current Code:**
```json
"test-browser": "python server.py && echo 'Open http://localhost:8080/phase1-test.html'"
```

**Problem:**
- References port 8080 but server uses 8000
- Documentation inconsistency

**Solution:**
Update documentation or use environment variable.

**Impact:** Very Low - Only affects test instructions

---

### 9. Static File Paths
**Files:**
- `src/Infrastructure/Repositories/HttpShowRepository.js:24-25`
- `src/Infrastructure/Repositories/HttpMusicRepository.js:21`

**Current Code:**
```javascript
this.endpoint = options.endpoint || '/data/shows.json';
this.titlesEndpoint = options.titlesEndpoint || '/data/titles.json';
this.endpoint = options.endpoint || '/data/songs.json';
```

**Status:** ✅ Already configurable via `options` parameter!

**Problem:** None - defaults are fine, can be overridden in ServiceRegistration.

**Impact:** None - Working as designed

---

## ✅ Already Environment-Based (No Action Needed)

### API URLs ✅
- `API_URL` environment variable (Phase 8.5)
- Used in `APIShowRepository` and `APIMusicRepository`
- Production ready

### Database Configuration ✅
- All database settings in `.env`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Production ready

### Security Secrets ✅
- `JWT_SECRET`, `SESSION_SECRET`
- Must be changed for production (documented in Phase 10)
- Production ready

### CORS Origins ✅
- `CORS_ORIGIN` environment variable
- Used in `api-server.js` and config
- Production ready

### Application URLs ✅
- `APP_URL` environment variable
- Used for redirects and canonical URLs
- Production ready

### Cache Configuration ✅
- `CACHE_TTL`, `CACHE_MAX_SIZE`
- Environment-based
- Production ready

### Feature Flags ✅
- `FEATURE_SCHEDULE_UPDATES`, `FEATURE_MUSIC_PLAYER`, etc.
- Environment-based
- Production ready

---

## Implementation Priority

### Phase 8.5 (Immediate - Before Phase 9)
**Goal:** Make application fully production-ready (zero code changes for deployment)

**Tasks:**

#### 1. Add Data Paths Configuration (CRITICAL)
**Time:** 30 minutes

**Files to Update:**
1. `.env` - Add data path variables
2. `example.env` - Add data path variables
3. `src/Infrastructure/Config/index.js` - Add data configuration section
4. `src/Application/Services/SitesService.js` - Use config instead of hardcoded path
5. Update service registration to pass config

**Changes:**

**`.env` and `example.env`:**
```properties
# Data Configuration
DATA_DIR=./data
SITES_DATA_PATH=/data/sites.json
```

**`Config/index.js`:**
```javascript
// Data Configuration
data: {
    dir: getEnv('DATA_DIR', './data'),
    sitesPath: getEnv('SITES_DATA_PATH', '/data/sites.json'),
    
    // For future use
    showsPath: getEnv('SHOWS_DATA_PATH', '/data/shows.json'),
    songsPath: getEnv('SONGS_DATA_PATH', '/data/songs.json')
}
```

**`SitesService.js:31`:**
```javascript
// OLD:
const data = await this.httpClient.get('data/sites.json');

// NEW:
const data = await this.httpClient.get(this.config.data.sitesPath);
```

**`ServiceRegistration.js`:**
```javascript
// Add config to SitesService constructor
container.singleton('sitesService', () => new SitesService({
    storage: container.get('storageService'),
    httpClient: container.get('httpClient'),
    logger,
    config  // ← Add config
}));
```

**Production `.env`:**
```properties
# Option 1: CDN
SITES_DATA_PATH=https://cdn.myplayground.com/data/sites.json

# Option 2: API (Phase 9.5)
SITES_DATA_PATH=/api/streaming-sites
```

---

#### 2. Remove Hardcoded Streaming Site URLs (CRITICAL)
**Time:** 15 minutes

**File:** `src/Application/Services/SitesService.js:106-116`

**Option A: Remove Fallback (Recommended)**
```javascript
_tryCommonSearchPatterns(baseUrl, encodedTitle, siteName) {
    // All sites should have searchPattern in sites.json
    this.logger.error(`Site "${siteName}" missing searchPattern in sites.json`);
    return `${baseUrl}/search?q=${encodedTitle}`; // Generic fallback only
}
```

**Option B: Keep Warning, Remove Hardcoded URLs**
```javascript
_tryCommonSearchPatterns(baseUrl, encodedTitle, siteName) {
    this.logger.warn(`Site "${siteName}" missing searchPattern, using default pattern`);
    return `${baseUrl}/search?q=${encodedTitle}`;
}
```

**Verify `data/sites.json`:**
Ensure all sites have proper `searchPattern` (currently all 5 sites have it ✅).

---

#### 3. Make HTTP Client Timeout Configurable (RECOMMENDED)
**Time:** 20 minutes

**Files to Update:**
1. `.env` - Add HTTP configuration
2. `example.env` - Add HTTP configuration
3. `src/Infrastructure/Config/index.js` - Add http configuration section
4. `src/Application/Bootstrap/ServiceRegistration.js` - Use config for HttpClient

**`.env` and `example.env`:**
```properties
# HTTP Client Configuration
HTTP_TIMEOUT=30000
HTTP_USER_AGENT=MyPlayground/1.0
```

**`Config/index.js`:**
```javascript
// HTTP Client Configuration
http: {
    timeout: getNumberEnv('HTTP_TIMEOUT', 30000), // 30 seconds
    userAgent: getEnv('HTTP_USER_AGENT', 'MyPlayground/1.0'),
    retries: getNumberEnv('HTTP_RETRIES', 3)
}
```

**`ServiceRegistration.js:42-46`:**
```javascript
// OLD:
container.singleton('httpClient', () => new HttpClient({
    timeout: 30000,
    headers: {
        'User-Agent': 'MyPlayground/1.0'
    }
}));

// NEW:
container.singleton('httpClient', () => new HttpClient({
    timeout: config.http.timeout,
    headers: {
        'User-Agent': config.http.userAgent
    }
}));
```

---

#### 4. Make Database Timeouts Configurable (OPTIONAL)
**Time:** 15 minutes

**`.env` and `example.env`:**
```properties
# Database Timeouts
DB_ACQUIRE_TIMEOUT=10000
DB_CONNECT_TIMEOUT=10000
```

**`Config/index.js` - Update database section:**
```javascript
database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: getNumberEnv('DB_PORT', 3306),
    user: getEnv('DB_USER', 'root'),
    password: getEnv('DB_PASSWORD', ''),
    name: getEnv('DB_NAME', 'myplayground_dev'),
    connectionLimit: getNumberEnv('DB_CONNECTION_LIMIT', 10),
    queueLimit: getNumberEnv('DB_QUEUE_LIMIT', 0),
    acquireTimeout: getNumberEnv('DB_ACQUIRE_TIMEOUT', 10000),
    connectTimeout: getNumberEnv('DB_CONNECT_TIMEOUT', 10000),
    // ... rest of config
}
```

**`ConnectionManager.js:54-55`:**
```javascript
// OLD:
acquireTimeout: 10000,
connectTimeout: 10000

// NEW:
acquireTimeout: dbConfig.acquireTimeout,
connectTimeout: dbConfig.connectTimeout
```

---

## Testing Checklist

After implementing fixes, verify production readiness:

### Local Testing (Development)
```bash
# 1. Verify current .env works
npm start
npm run server

# Open http://localhost:8000
# Verify all features work
```

### Production Simulation
```bash
# 1. Create production.env file
cp .env production.env

# 2. Update production.env
NODE_ENV=production
DEBUG=false
APP_URL=https://myplayground.com
API_URL=https://myplayground.com
SITES_DATA_PATH=/data/sites.json
HTTP_TIMEOUT=30000
# ... etc

# 3. Test with production config
mv .env development.env
mv production.env .env

# 4. Restart servers
npm run server
npm start

# 5. Verify everything still works
# 6. Restore development config
mv .env production.env
mv development.env .env
```

### Production Deployment
```bash
# On production server:
# 1. Upload code (no changes needed!)
git clone <repo>
cd my-playground

# 2. Create production .env
nano .env
# (paste production values)

# 3. Install dependencies
npm install

# 4. Run migrations
npm run migrate:up

# 5. Start servers
pm2 start ecosystem.config.js

# 6. Verify deployment
curl https://myplayground.com/api/health
```

---

## Summary

### Current Production Readiness: 85%

**Already Environment-Based (85%):**
- ✅ API URLs (Phase 8.5)
- ✅ Database configuration
- ✅ Security secrets
- ✅ CORS origins
- ✅ Application URLs
- ✅ Cache configuration
- ✅ Feature flags

**Needs Configuration (15%):**
- ⚠️ Sites data path (CRITICAL)
- ⚠️ Streaming site URLs in fallback (CRITICAL)
- ⚠️ HTTP client timeout (RECOMMENDED)
- ⚠️ Database timeouts (OPTIONAL)

### Estimated Time to 100% Production Ready

**Critical Fixes:** 45 minutes  
**Recommended Fixes:** 20 minutes  
**Optional Fixes:** 15 minutes  
**Testing:** 30 minutes  

**Total:** 1.5 - 2 hours

### Post-Implementation Status

After implementing critical fixes:
- ✅ **Zero code changes** required for production deployment
- ✅ **Only .env file** needs to be updated
- ✅ **Same codebase** works in development, staging, and production
- ✅ **Deployment pipeline** can push to production without modifications

---

## Next Steps

1. **Implement Phase 8.5 fixes** (this document)
2. **Test with production simulation** (checklist above)
3. **Update documentation** (reference this audit)
4. **Proceed to Phase 9** (Authentication UI)
5. **Deploy to production** (Phase 10)

---

## References

- **Environment Config Guide:** `docs/ENVIRONMENT_CONFIG.md`
- **Production Deployment:** `docs/roadmaps/PHASE10_PRODUCTION_DEPLOYMENT_ROADMAP.md`
- **Config Module:** `src/Infrastructure/Config/index.js`
- **Service Registration:** `src/Application/Bootstrap/ServiceRegistration.js`
- **Sites Service:** `src/Application/Services/SitesService.js`

---

**Status:** Ready for implementation  
**Estimated Completion:** Phase 8.5 (1-2 hours)  
**Production Ready:** After Phase 8.5 + Phase 9 + Phase 10
