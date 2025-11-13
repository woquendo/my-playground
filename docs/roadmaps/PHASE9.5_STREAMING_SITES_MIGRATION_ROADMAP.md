# Phase 9.5: Streaming Sites Database Migration

**Status:** 📋 Planned (Optional Enhancement)  
**Priority:** Medium  
**Dependencies:** Phase 9 (Authentication UI)  
**Estimated Time:** 6-8 hours

## Overview

Migrate streaming sites data from static JSON file (`/data/sites.json`) to MySQL database to enable user-specific site preferences and customization. This allows users to configure their own preferred streaming sites and disable sites they don't use.

## Current Implementation

### How It Works Now

**File:** `/data/sites.json`
```json
{
  "sites": [
    {
      "name": "Aniwave",
      "url": "https://aniwave.at/",
      "searchPattern": "/catalog?search={encoded}&type=anime"
    },
    {
      "name": "Crunchyroll",
      "url": "https://www.crunchyroll.com/",
      "searchPattern": "/search?q={encoded}"
    }
    // ... more sites
  ]
}
```

**Service:** `src/Application/Services/SitesService.js`
- Loads sites from static JSON file
- Same sites shown for all users
- No user customization possible
- No per-user site preferences

**Usage:**
- ShowCard component displays streaming site buttons
- Each show can be linked to specific sites
- Users click site buttons to search for show on that site

### Limitations

- ❌ All users see the same sites
- ❌ Cannot disable unwanted sites
- ❌ Cannot add custom streaming sites
- ❌ Cannot reorder site buttons
- ❌ No user preferences for default sites
- ❌ Static data requires code changes to add new sites

## Proposed Solution

### Database Schema

#### Table 1: `streaming_sites` (Global Sites)
```sql
CREATE TABLE streaming_sites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  url VARCHAR(255) NOT NULL,
  search_pattern VARCHAR(500),
  icon_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_active (is_active),
  INDEX idx_order (display_order)
);
```

**Purpose:** Master list of all available streaming sites (maintained by admins)

#### Table 2: `user_streaming_sites` (User Preferences)
```sql
CREATE TABLE user_streaming_sites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  site_id INT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  custom_url VARCHAR(255),
  custom_search_pattern VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES streaming_sites(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_site (user_id, site_id),
  INDEX idx_user_enabled (user_id, is_enabled)
);
```

**Purpose:** User-specific settings for each streaming site

**Features:**
- Enable/disable sites per user
- Custom display order per user
- Custom URLs (for regional variations)
- Custom search patterns (if user prefers different search URL)

### Backend API Endpoints

#### Get User's Streaming Sites
```
GET /api/streaming-sites
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "name": "Crunchyroll",
    "url": "https://www.crunchyroll.com/",
    "searchPattern": "/search?q={encoded}",
    "iconUrl": null,
    "isEnabled": true,
    "displayOrder": 1,
    "isCustom": false
  },
  {
    "id": 2,
    "name": "Aniwave",
    "url": "https://aniwave.at/",
    "searchPattern": "/catalog?search={encoded}&type=anime",
    "iconUrl": null,
    "isEnabled": false,
    "displayOrder": 2,
    "isCustom": false
  }
]
```

#### Update User Site Preferences
```
PUT /api/streaming-sites/:id
Authorization: Bearer <token>

Body:
{
  "isEnabled": true,
  "displayOrder": 1,
  "customUrl": null,
  "customSearchPattern": null
}

Response: Updated site preferences
```

#### Get All Available Sites (Admin Only)
```
GET /api/admin/streaming-sites
Authorization: Bearer <token>
X-Require-Role: admin

Response: All streaming sites in database
```

#### Create New Global Site (Admin Only)
```
POST /api/admin/streaming-sites
Authorization: Bearer <token>
X-Require-Role: admin

Body:
{
  "name": "Netflix",
  "url": "https://www.netflix.com/",
  "searchPattern": "/search?q={encoded}",
  "iconUrl": null
}

Response: Created streaming site
```

### Frontend Changes

#### New Repository: `APIStreamingSitesRepository`

**File:** `src/Infrastructure/Repositories/APIStreamingSitesRepository.js`

```javascript
export class APIStreamingSitesRepository {
  constructor({ httpClient, logger, authManager }) {
    this.httpClient = httpClient;
    this.logger = logger;
    this.authManager = authManager;
    this.baseUrl = 'http://localhost:3000/api';
  }

  async getUserSites() {
    // GET /api/streaming-sites
    // Returns user's enabled sites in display order
  }

  async updateSitePreference(siteId, preferences) {
    // PUT /api/streaming-sites/:id
    // Update user's preferences for a site
  }

  async toggleSite(siteId, isEnabled) {
    // Quick toggle enable/disable
  }

  async reorderSites(siteIds) {
    // Update display order for multiple sites
  }
}
```

#### Updated Service: `SitesService`

**File:** `src/Application/Services/SitesService.js`

**Changes:**
```javascript
// OLD: Always loads from JSON
async loadSites() {
  const data = await this.httpClient.get('data/sites.json');
  return data.sites;
}

// NEW: Load from API if database enabled
async loadSites() {
  if (this.useDatabase && this.sitesRepository) {
    // Load from API - user-specific sites
    return await this.sitesRepository.getUserSites();
  } else {
    // Fallback to JSON file
    const data = await this.httpClient.get('data/sites.json');
    return data.sites;
  }
}
```

#### Service Registration Update

**File:** `src/Application/Bootstrap/ServiceRegistration.js`

```javascript
if (useDatabase) {
  // Register streaming sites repository
  container.singleton('streamingSitesRepository', () => 
    new APIStreamingSitesRepository({
      httpClient: container.get('httpClient'),
      logger,
      authManager: container.get('authManager')
    })
  );

  // Update sites service to use repository
  container.singleton('sitesService', () => new SitesService({
    storage: container.get('storage'),
    httpClient: container.get('httpClient'),
    sitesRepository: container.get('streamingSitesRepository'),
    useDatabase: true,
    logger
  }));
}
```

## Implementation Tasks

### Task 1: Database Schema Creation

**Create Migration:** `database/migrations/YYYYMMDD_create_streaming_sites_tables.js`

- [ ] Create `streaming_sites` table
- [ ] Create `user_streaming_sites` table
- [ ] Add indexes for performance
- [ ] Add foreign key constraints

### Task 2: Seed Initial Data

**Create Migration:** `database/migrations/YYYYMMDD_seed_streaming_sites.js`

- [ ] Migrate data from `sites.json` to `streaming_sites` table
- [ ] Create default enabled sites for existing users

**Seed Data:**
```javascript
const defaultSites = [
  { name: 'Aniwave', url: 'https://aniwave.at/', searchPattern: '/catalog?search={encoded}&type=anime', displayOrder: 1 },
  { name: 'animex', url: 'http://animex.one/', searchPattern: null, displayOrder: 2 },
  { name: 'hianime', url: 'https://hianime.to/', searchPattern: '/search?keyword={encoded}', displayOrder: 3 },
  { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/', searchPattern: '/search?q={encoded}', displayOrder: 4 },
  { name: 'hidive', url: 'https://www.hidive.com/', searchPattern: '/search?q={encoded}', displayOrder: 5 }
];
```

### Task 3: Backend API Implementation

**File:** `api-server.js` or separate routes file

- [ ] Add `GET /api/streaming-sites` endpoint
- [ ] Add `PUT /api/streaming-sites/:id` endpoint
- [ ] Add `POST /api/streaming-sites/:id/toggle` endpoint
- [ ] Add `PUT /api/streaming-sites/reorder` endpoint
- [ ] Add admin endpoints for site management
- [ ] Add authentication middleware
- [ ] Test all endpoints with Postman/Insomnia

### Task 4: Frontend Repository Implementation

**File:** `src/Infrastructure/Repositories/APIStreamingSitesRepository.js`

- [ ] Create repository class
- [ ] Implement `getUserSites()` method
- [ ] Implement `updateSitePreference()` method
- [ ] Implement `toggleSite()` method
- [ ] Implement `reorderSites()` method
- [ ] Add error handling
- [ ] Add loading states

### Task 5: Update SitesService

**File:** `src/Application/Services/SitesService.js`

- [ ] Add database mode detection
- [ ] Update `loadSites()` to use API when available
- [ ] Update `getSites()` to return user-specific sites
- [ ] Maintain backward compatibility with JSON mode
- [ ] Add caching for performance
- [ ] Update tests

### Task 6: Update Service Registration

**File:** `src/Application/Bootstrap/ServiceRegistration.js`

- [ ] Register streaming sites repository
- [ ] Update sites service registration
- [ ] Pass repository to service when database enabled
- [ ] Test service resolution

### Task 7: UI for Site Management (Optional)

**Create Component:** `src/Presentation/Components/StreamingSitesManager.js`

**Features:**
- [ ] List all available streaming sites
- [ ] Toggle enable/disable for each site
- [ ] Drag-and-drop to reorder sites
- [ ] Edit custom URL for regional variations
- [ ] Save preferences button
- [ ] Reset to defaults button

**Add to Settings/Profile Page**

### Task 8: Testing

- [ ] Unit tests for repository
- [ ] Unit tests for updated service
- [ ] Integration tests for API endpoints
- [ ] End-to-end test: Load sites from database
- [ ] End-to-end test: Toggle site visibility
- [ ] End-to-end test: Reorder sites
- [ ] Test fallback to JSON when database disabled

## Benefits

### For Users
- ✅ Customize which streaming sites appear
- ✅ Disable sites they don't use
- ✅ Reorder sites to show favorites first
- ✅ Add custom regional URLs (e.g., Crunchyroll UK vs US)
- ✅ Cleaner interface (only show relevant sites)

### For Developers
- ✅ Easy to add new streaming sites (database admin interface)
- ✅ No code changes needed to add/remove sites
- ✅ User-specific data properly isolated
- ✅ Consistent with rest of application (all data in MySQL)
- ✅ Better maintainability

### For Admins
- ✅ Manage streaming sites through admin panel
- ✅ See which sites are most popular
- ✅ Update site URLs when they change domains
- ✅ Deactivate dead/discontinued sites
- ✅ Add new sites without deployment

## Migration Strategy

### Phase 1: Database Setup (No Breaking Changes)
1. Create database tables
2. Seed with data from sites.json
3. Create default preferences for existing users
4. Deploy migration

### Phase 2: Backend Implementation (Backward Compatible)
1. Implement API endpoints
2. Keep JSON file as fallback
3. Test with feature flag
4. Deploy backend

### Phase 3: Frontend Implementation (Gradual Rollout)
1. Implement API repository
2. Update SitesService with dual mode
3. Test with database mode enabled
4. Deploy frontend

### Phase 4: Full Migration (After Testing)
1. Enable database mode for all users
2. Monitor for issues
3. Eventually deprecate sites.json (keep as backup)

## Rollback Plan

If issues arise:
1. Set `USE_DATABASE=false` in .env
2. Application falls back to sites.json
3. No data loss (database tables remain intact)
4. Fix issues and re-enable

## Timeline Estimate

- **Database Schema:** 1 hour
- **Data Migration:** 30 minutes
- **Backend API:** 2-3 hours
- **Frontend Repository:** 1-2 hours
- **Service Updates:** 1 hour
- **UI Component (optional):** 2-3 hours
- **Testing:** 1-2 hours

**Total:** 6-8 hours (without UI component)  
**Total with UI:** 8-11 hours

## Success Criteria

- ✅ All streaming sites data comes from MySQL
- ✅ Users can enable/disable sites
- ✅ Users can reorder sites
- ✅ Fallback to JSON still works when database disabled
- ✅ No performance degradation
- ✅ All existing sites migrated successfully
- ✅ Admins can add new sites via admin panel

## Future Enhancements

### Phase 9.6 or Later:
- User-created custom streaming sites
- Site categories (Legal, Unofficial, etc.)
- Site ratings and reviews
- Regional availability flags
- Direct deep links (not just search)
- Site status monitoring (check if site is up)
- Integration with streaming calendars

## Related Documentation

- Database schema: `database/schema.sql`
- Migration guide: `docs/guides/CREATING_MIGRATIONS.md`
- API documentation: To be created in Phase 9.5
- Current sites data: `/data/sites.json`

---

**Note:** This phase is optional and can be implemented after Phase 9 (Authentication UI) is complete. It's not critical for basic functionality but significantly improves user experience and maintainability.

**Recommended Implementation:** After Phase 9 and before Phase 10 (Production Deployment)
