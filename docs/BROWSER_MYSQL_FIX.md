# Browser MySQL Import Fix

## Problem
The application was failing to load with the error:
```
TypeError: Failed to resolve module specifier "mysql2/promise". 
Relative references must start with either "/", "./", or "../".
```

## Root Cause
The browser code was attempting to import `mysql2/promise` through the `ConnectionManager`, which is a Node.js-only module. This happened because:

1. `.env` had `USE_DATABASE=true` and `STORAGE_TYPE=mysql`
2. `ServiceRegistration.js` was importing `ConnectionManager` and `MySQLShowRepository`/`MySQLMusicRepository`
3. These modules require `mysql2/promise` which only works in Node.js, not browsers

## Architecture Issue
The application has a **client-server architecture mismatch**:
- **Frontend**: Browser-based JavaScript application
- **Backend**: Python server (`server.py`) serving static files
- **Database**: MySQL that can only be accessed server-side

**The Issue**: Phase 8 implementation assumed direct browser-to-database connection, which is impossible in web applications.

## Solution Applied

### 1. Disabled Database Mode in .env
```properties
# Before
USE_DATABASE=true
STORAGE_TYPE=mysql

# After
USE_DATABASE=false
STORAGE_TYPE=localStorage
```

### 2. Removed MySQL Imports from ServiceRegistration.js
Removed these imports that caused browser errors:
```javascript
// REMOVED
import { MySQLShowRepository } from '../../Infrastructure/Repositories/MySQLShowRepository.js';
import { MySQLMusicRepository } from '../../Infrastructure/Repositories/MySQLMusicRepository.js';
import { connectionManager } from '../../Infrastructure/Database/ConnectionManager.js';
import { AuthService } from '../Services/AuthService.js';
```

### 3. Updated Repository Registration Logic
Changed registration to always use HTTP repositories in browser:
```javascript
if (useDatabase) {
    // NOTE: Database mode requires a backend API server
    logger.error('Database mode is enabled but not supported in browser');
    logger.info('Falling back to HTTP (JSON file) repositories...');
    
    // Fall back to HTTP repositories
    container.singleton('showRepository', () => new HttpShowRepository(...));
    container.singleton('musicRepository', () => new HttpMusicRepository(...));
}
```

### 4. Removed AuthService Registration
AuthService requires database connection, so removed its registration:
```javascript
// Authentication service (Phase 8)
// NOTE: Database authentication requires backend API
// Skipping auth service registration in browser environment
if (useDatabase) {
    logger.warn('AuthService skipped - requires backend API for database operations');
}
```

### 5. Updated Service Validation
Removed database-specific services from required services list:
```javascript
const requiredServices = [
    'eventBus',
    'logger',
    'httpClient',
    // ... other services
    'authManager'  // Frontend-only auth manager (no DB)
];

// NOTE: Database services (connectionManager, authService) are not available in browser
```

## What Still Works

✅ **Application loads and runs**
✅ **Schedule, Shows, Music, Import pages**
✅ **HTTP repositories with JSON file storage**
✅ **AuthManager** (frontend token management, no database)
✅ **All UI components**
✅ **Navigation and routing**

## What Doesn't Work (Requires Backend)

❌ **Database authentication** (login, register)
❌ **User isolation** (all users share JSON files)
❌ **Admin dashboard** (no database to manage)
❌ **MySQL repositories** (browser can't connect to MySQL)
❌ **AuthService** (requires database)

## Proper Solution (Future Work)

To enable Phase 8 database features, we need a **backend API server**:

### Option A: Node.js + Express Backend

**Structure:**
```
my-playground/
├── frontend/          # Browser code (existing src/)
├── backend/           # New Node.js Express server
│   ├── server.js      # Express app
│   ├── routes/        # API routes
│   ├── controllers/   # Request handlers
│   └── middleware/    # Auth middleware
├── shared/            # Shared code
│   ├── Domain/        # Domain entities
│   └── Infrastructure/
│       └── Database/  # MySQL connection
└── database/          # Migrations
```

**Backend API Endpoints:**
```
POST   /api/auth/register      # User registration
POST   /api/auth/login         # User login
GET    /api/auth/me            # Get current user
POST   /api/auth/logout        # Logout

GET    /api/shows              # Get user's shows
POST   /api/shows              # Create show
PUT    /api/shows/:id          # Update show
DELETE /api/shows/:id          # Delete show

GET    /api/music              # Get user's music
POST   /api/music              # Add song
PUT    /api/music/:id          # Update song
DELETE /api/music/:id          # Delete song

GET    /api/admin/users        # List users (admin)
PUT    /api/admin/users/:id    # Update user (admin)
```

**Frontend Changes:**
- Create API client service
- HTTP repositories call backend API instead of JSON files
- Authentication handled by API

### Option B: Extend Python Server

Add Flask/FastAPI backend to existing `server.py`:

```python
from flask import Flask, request, jsonify
import mysql.connector

app = Flask(__name__)

@app.route('/api/auth/login', methods=['POST'])
def login():
    # Handle authentication
    pass

@app.route('/api/shows', methods=['GET'])
def get_shows():
    # Get shows from MySQL
    pass
```

## Migration Path

### Phase 1: Keep Current State (DONE)
- Application works with localStorage
- No database features
- All existing functionality preserved

### Phase 2: Create Backend API
1. Choose backend framework (Express or Flask)
2. Create API server structure
3. Implement authentication endpoints
4. Implement CRUD endpoints for shows/music

### Phase 3: Create API Client
1. Create `APIClient` service in frontend
2. Create `APIShowRepository` extending `HttpShowRepository`
3. Create `APIMusicRepository` extending `HttpMusicRepository`
4. Update ServiceRegistration to use API repositories

### Phase 4: Enable Database Mode
1. Update `.env` to `USE_DATABASE=true`
2. Frontend sends API requests to backend
3. Backend connects to MySQL and returns data
4. Authentication works end-to-end

### Phase 5: Deploy
1. Deploy backend server
2. Deploy frontend
3. Configure CORS
4. Set up production database

## Files Modified

1. `.env` - Disabled database mode
2. `src/Application/Bootstrap/ServiceRegistration.js` - Removed MySQL imports and registrations
3. Created this documentation file

## Testing

After these changes:
- ✅ Server starts without errors
- ✅ Application loads in browser
- ✅ No module resolution errors
- ✅ HTTP repositories work
- ⚠️ Test failures need investigation (different issue)

## Notes

- `ConnectionManager`, `MySQLShowRepository`, `MySQLMusicRepository`, and `AuthService` still exist in the codebase
- They can be used in Node.js environments (tests, migrations, future backend)
- They are simply not imported by browser code anymore
- AuthManager (frontend token management) still works but has no backend to authenticate against

---

**Status**: Application now runs successfully. Database features awaiting backend API implementation.
