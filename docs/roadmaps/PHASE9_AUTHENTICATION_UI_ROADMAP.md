# Phase 9: Authentication UI Implementation

**Status:** 🚧 In Progress  
**Priority:** High  
**Dependencies:** Phase 8 (Backend API & Database)

## Overview

Implement frontend authentication UI components to allow users to register accounts and log in to the application. This phase creates the user-facing authentication experience that connects to the backend API created in Phase 8.

## Current State

### ✅ Completed
- Backend API server with authentication endpoints (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`)
- JWT token generation and validation on backend
- AuthManager service in frontend (handles token storage)
- MySQL database with users table and role-based access control
- Password hashing with bcrypt
- API repositories (APIShowRepository, APIMusicRepository) ready for authenticated requests
- **Database Integration:** ALL show and music data now comes from MySQL database via API
- **Test Data:** Database populated with 444 shows, 68 songs, 1 admin user (dev@myplayground.local)
- **Router Guards:** Authentication checks on all protected routes

### ✅ Data Source Verification (100% Database-Driven)

**Confirmed Data Flow:**
```
User Action → API Repository → HTTP Request (with JWT) → Backend API → MySQL Database
```

**Data Sources by Feature:**
- **Shows:** `APIShowRepository` → `/api/shows` → MySQL `shows` table ✅
- **Music:** `APIMusicRepository` → `/api/music` → MySQL `songs` table ✅
- **Authentication:** `/api/auth/*` → MySQL `users` table ✅
- **Streaming Sites:** `SitesService` → `/data/sites.json` ⚠️ **PENDING MIGRATION**

**⚠️ Streaming Sites Migration Required:**
Currently, streaming sites are loaded from static `/data/sites.json` file. This should be migrated to MySQL to support:
- User-specific site preferences
- Custom streaming site URLs per user
- User-configured search patterns
- Enabling/disabling specific sites per user
- Future: User can add their own streaming sites

**Migration planned for:** Future phase (Phase 9.5 or Phase 11)
- Create `streaming_sites` table in database
- Create `user_streaming_sites` junction table for user preferences
- Add API endpoints: `/api/streaming-sites`
- Create `APIStreamingSitesRepository`
- Update `SitesService` to use API repository when database enabled
- Migrate data from `sites.json` to database (seed data)

**Repository Registration (ServiceRegistration.js):**
```javascript
if (useDatabase) {  // USE_DATABASE=true in .env
    container.singleton('showRepository', () => new APIShowRepository(...));
    container.singleton('musicRepository', () => new APIMusicRepository(...));
}
```

### ⚠️ Missing
- Login page UI
- Registration page UI
- Authentication form components
- Password validation and strength indicators
- Error handling for authentication failures
- Auto-redirect to login when not authenticated
- User profile display
- Logout functionality UI

## Implementation Tasks

### Task 1: Verify and Complete Authentication Page Component

**File:** `src/Presentation/Pages/AuthPage.js`

**Current Status:** ✅ File exists with basic structure

**What's Implemented:**
- Page structure with login/register toggle
- Form container rendering
- View switching between login and register

**What Needs Verification/Completion:**
- [ ] Verify AuthService integration (currently references `authService` from container)
- [ ] Ensure error handling displays properly
- [ ] Test form submission flow
- [ ] Verify redirect after successful login
- [ ] Test registration flow end-to-end

**Note:** AuthPage depends on `authService` which requires backend API. Currently references:
```javascript
this.authService = container.get('authService');
```

**⚠️ CRITICAL:** AuthService is NOT registered in ServiceRegistration.js because it requires Node.js (mysql2). Authentication must go through AuthManager which calls API endpoints directly.

**Required Fix:**
- AuthPage should use AuthManager instead of AuthService
- AuthManager needs `register()` and `login()` methods added (see Task 4)

### Task 2: Verify and Complete Authentication Form Components

**Files:** 
- `src/Presentation/Components/LoginForm.js` ✅ EXISTS
- `src/Presentation/Components/RegisterForm.js` ✅ EXISTS

**Current Status:** Files exist, need verification

**Requirements to Verify:**
- [ ] Email input with validation
- [ ] Password input with show/hide toggle
- [ ] Password strength indicator (for registration)
- [ ] Confirm password field (for registration)
- [ ] Username field (for registration)
- [ ] Submit button with loading state
- [ ] Error message display area
- [ ] Form submission handlers

**Validation Rules:**
- Email: Valid email format
- Password: Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
- Username: 3-20 characters, alphanumeric + underscores
- Confirm Password: Must match password field

### Task 3: Router Authentication Guards - ALREADY IMPLEMENTED ✅

**File:** `src/Application/Bootstrap/RouteConfiguration.js`

**Status:** ✅ COMPLETE - Authentication guards already implemented

**Requirements:**
- Add `/auth` route for authentication page
- Implement authentication guard
- Check for valid JWT token on route change
- Redirect to `/auth` if not authenticated
- Redirect to `/schedule` if authenticated and on `/auth`
- Handle token expiration (7-day expiry)

**Route Structure:**
```
/auth          → AuthPage (login/register)
/schedule      → SchedulePage (requires auth)
/shows         → ShowsPage (requires auth)
/music         → MusicPage (requires auth)
/admin         → AdminPage (requires auth + admin role)
```

### Task 4: Enhance AuthManager Service

**File:** `src/Infrastructure/Auth/AuthManager.js`

**Current State:** Basic token storage implemented

**Enhancements Needed:**
- Add registration method calling `/api/auth/register`
- Add login method calling `/api/auth/login`
- Add logout method (clear token, emit event)
- Add token refresh logic (before expiry)
- Add getCurrentUser method calling `/api/auth/me`
- Emit authentication events (login, logout, session-expired)
- Store user profile data in memory after login

**Methods to Add:**
```javascript
async register(email, password, username)
async login(email, password)
async logout()
async getCurrentUser()
async refreshToken()
isTokenExpired()
```

### Task 5: Create User Profile Component

**File:** `src/Presentation/Components/UserProfile.js`

**Requirements:**
- Display current user information
- Show username, email, role
- Logout button
- Optional: Avatar/profile picture
- Display in header/nav area
- Dropdown menu with profile options

### Task 6: Add Authentication Styling

**File:** `css/components/auth-form.css`

**Current State:** File exists but may need enhancements

**Requirements:**
- Modern, clean authentication form design
- Responsive layout (mobile-friendly)
- Focus states for inputs
- Error state styling (red borders, error messages)
- Success state styling
- Loading spinner during authentication
- Password strength indicator styling
- Toggle between login/register animations

### Task 7: Implement Session Persistence

**Requirements:**
- Check for existing token on app load
- Validate token with backend (`/api/auth/me`)
- Auto-login if valid token exists
- Handle expired tokens gracefully
- Implement "Remember Me" functionality (optional)

### Task 8: Error Handling and User Feedback

**Requirements:**
- Display API error messages to user
- Handle network failures gracefully
- Show validation errors inline
- Success messages after registration
- Toast notifications for auth events
- Handle duplicate email errors
- Handle invalid credentials errors

## API Integration

### Backend Endpoints to Use

#### Registration
```javascript
POST /api/auth/register
Body: { email, password, username }
Response: { user: { id, email, username, role }, token }
```

#### Login
```javascript
POST /api/auth/login
Body: { email, password }
Response: { user: { id, email, username, role }, token }
```

#### Get Current User
```javascript
GET /api/auth/me
Headers: { Authorization: Bearer <token> }
Response: { user: { id, email, username, role, createdAt } }
```

## Testing Requirements

### Unit Tests
- [ ] AuthForm component validation logic
- [ ] AuthManager register/login methods
- [ ] Token storage and retrieval
- [ ] Email validation
- [ ] Password strength validation

### Integration Tests
- [ ] Full registration flow (form → API → success)
- [ ] Full login flow (form → API → redirect)
- [ ] Logout flow
- [ ] Auto-redirect when not authenticated
- [ ] Token expiration handling
- [ ] Error message display

### Manual Testing
- [ ] Register new user account
- [ ] Login with registered account
- [ ] Logout functionality
- [ ] Token persists across page refreshes
- [ ] Expired token redirects to login
- [ ] Invalid credentials show error
- [ ] Duplicate email shows error
- [ ] Password validation works
- [ ] Responsive design on mobile

## Security Considerations

1. **Password Handling**
   - Never store passwords in localStorage
   - Only send passwords over HTTPS in production
   - Clear password fields after submission

2. **Token Storage**
   - Store JWT in localStorage (or httpOnly cookie for enhanced security)
   - Include token in Authorization header for API requests
   - Clear token on logout

3. **Input Validation**
   - Client-side validation for UX
   - Server-side validation for security (already implemented)
   - Sanitize all user inputs

4. **Error Messages**
   - Don't reveal whether email exists (use generic messages)
   - Rate limit authentication attempts (backend)
   - Log failed authentication attempts

## User Experience Flow

### Registration Flow
1. User clicks "Sign Up" or navigates to `/auth`
2. Form displays with email, username, password, confirm password
3. User fills form with validation feedback
4. On submit, loading state shown
5. Success: Token stored, redirect to `/schedule`
6. Error: Display error message, keep form data

### Login Flow
1. User navigates to `/auth` or is redirected when not authenticated
2. Form displays with email and password
3. User enters credentials
4. On submit, loading state shown
5. Success: Token stored, user profile loaded, redirect to intended page
6. Error: Display "Invalid credentials" message

### Logout Flow
1. User clicks logout in profile dropdown
2. Confirmation dialog (optional)
3. Token cleared from storage
4. Redirect to `/auth`
5. Toast notification: "Logged out successfully"

## Success Criteria

- ✅ Users can register new accounts through UI
- ✅ Users can login with registered credentials
- ✅ Users can logout
- ✅ JWT token stored and included in API requests
- ✅ Auto-redirect to login when not authenticated
- ✅ Session persists across page refreshes
- ✅ Password validation provides helpful feedback
- ✅ Error messages are clear and actionable
- ✅ UI is responsive and matches app design
- ✅ All authentication flows have proper loading states

## Implementation Order

### CRITICAL PRE-WORK: Fix AuthPage to Use AuthManager

**Current Issue:** AuthPage.js tries to get 'authService' from container, but AuthService is NOT registered in browser (requires Node.js/mysql2).

**File to Fix:** `src/Presentation/Pages/AuthPage.js`

**Change Required:**
```javascript
// OLD (BROKEN):
this.authService = container.get('authService');

// NEW (CORRECT):
this.authManager = container.get('authManager');
```

**Then update all method calls:**
- `authService.login()` → `authManager.login()`
- `authService.register()` → `authManager.register()`

### Implementation Steps

1. **Fix AuthPage to use AuthManager** (~15 minutes) ⚠️ CRITICAL
   - Replace authService with authManager
   - Update all method calls

2. **Enhance AuthManager** (~2-3 hours)
   - Add `async register(email, password, username)` method
   - Add `async login(email, password)` method
   - Add `async logout()` method
   - Add `async getCurrentUser()` method
   - These methods should call the backend API directly using fetch

3. **Verify/Complete LoginForm Component** (~2-3 hours)
   - Check existing implementation
   - Ensure validation works
   - Test form submission
   - Fix any bugs

4. **Verify/Complete RegisterForm Component** (~2-3 hours)
   - Check existing implementation
   - Password strength indicator
   - Confirm password matching
   - Test form submission
   - Fix any bugs

5. **Test AuthPage Integration** (~1-2 hours)
   - Test login flow end-to-end
   - Test registration flow end-to-end
   - Test error handling
   - Test loading states

6. **Add/Verify CSS Styling** (~2-3 hours)
   - Check `css/components/auth-form.css`
   - Ensure responsive design
   - Error/success states
   - Loading spinners

7. **Create UserProfile Component** (~2-3 hours)
   - Display user info in header
   - Logout button
   - Dropdown menu

8. **Add Session Persistence** (~1-2 hours)
   - Check token on app load
   - Validate token with backend
   - Auto-login if valid

9. **End-to-End Testing** (~3-4 hours)
   - Test all authentication flows
   - Test with existing database user (dev@myplayground.local)
   - Test registration of new users
   - Test logout and re-login
   - Test protected routes
   - Test API calls with JWT tokens
   - Verify ALL data comes from MySQL (not JSON files)

## Timeline Estimate

- **CRITICAL Fix (AuthPage):** 15 minutes
- **AuthManager Enhancements:** 2-3 hours
- **Form Components Verification:** 4-6 hours
- **AuthPage Testing:** 1-2 hours
- **Styling:** 2-3 hours
- **UserProfile Component:** 2-3 hours
- **Session Persistence:** 1-2 hours
- **End-to-End Testing:** 3-4 hours

**Total:** ~16-24 hours

**Total:** ~16-24 hours

## Test Credentials & Database Verification

### Existing Test User

The database already contains a test admin user:

```
Email:    dev@myplayground.local
Username: devuser
Role:     admin
Password: [Set during migration - check migration scripts or reset if needed]
```

**To reset password for test user:**
```bash
# Login to MySQL
mysql -u root -p myplayground_dev

# Generate new bcrypt hash (use Node.js)
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('TestPassword123', 10, (e,h) => console.log(h));"

# Update user password
UPDATE users SET password_hash = '[NEW_HASH]' WHERE email = 'dev@myplayground.local';
```

### Database Contents Verification

**Current Database State:**
- **Shows:** 444 records in `shows` table
- **Songs:** 68 records in `songs` table
- **Users:** 1 record in `users` table

**All user data is linked to user_id=1** (the test admin user).

**Verify data linkage:**
```sql
-- Check shows belong to user
SELECT user_id, COUNT(*) FROM shows GROUP BY user_id;

-- Check songs belong to user
SELECT user_id, COUNT(*) FROM songs GROUP BY user_id;
```

### Data Flow Verification Checklist

When testing, verify that:

- [ ] Login with test user credentials works
- [ ] After login, JWT token is stored in localStorage
- [ ] Schedule page loads shows from `/api/shows` endpoint
- [ ] Shows data comes from MySQL (444 shows displayed)
- [ ] Music page loads songs from `/api/music` endpoint
- [ ] Songs data comes from MySQL (68 songs displayed)
- [ ] All API requests include `Authorization: Bearer <token>` header
- [ ] Logout clears token and redirects to /auth
- [ ] Trying to access protected routes without token redirects to /auth
- [ ] No data is loaded from `/data/*.json` files (except sites.json for reference)

### Browser DevTools Verification

**Check in Console:**
```javascript
// Should show API repository registration
"✓ API repositories registered (calls backend at http://localhost:3000)"

// Should NOT show HTTP repository registration
// If you see this, database mode is NOT enabled:
"✓ HTTP repositories registered"
```

**Check in Network Tab:**
- Look for requests to `localhost:3000/api/*`
- Should see: `/api/shows`, `/api/music`, `/api/auth/*`
- Should NOT see: `/data/shows.json`, `/data/songs.json`

**Check in Application Tab:**
```javascript
// localStorage should contain:
localStorage.getItem('auth_token')     // JWT token
localStorage.getItem('current_user')   // User object JSON
```

## Next Steps

After Phase 9 completion, proceed to:
- **Phase 10:** Production Deployment (see PHASE10_PRODUCTION_DEPLOYMENT_ROADMAP.md)
```
