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

### Task 1: Create Authentication Page Component

**File:** `src/Presentation/Pages/AuthPage.js`

**Requirements:**
- Toggle between login and registration forms
- Responsive design matching existing app style
- Form validation (email format, password strength)
- Display error messages from API
- Loading states during authentication
- Auto-redirect to schedule page on success

**Features:**
```javascript
class AuthPage {
  constructor({ authManager, eventBus, logger, container });
  
  // Methods
  render() // Render login/register forms
  handleLogin(email, password) // Process login
  handleRegister(email, password, username) // Process registration
  switchToLogin() // Toggle to login form
  switchToRegister() // Toggle to register form
  validateEmail(email) // Email validation
  validatePassword(password) // Password strength check
}
```

### Task 2: Create Authentication Form Components

**File:** `src/Presentation/Components/AuthForm.js`

**Requirements:**
- Reusable form component for login/register
- Email input with validation
- Password input with show/hide toggle
- Password strength indicator (for registration)
- Confirm password field (for registration)
- Username field (for registration)
- Submit button with loading state
- Error message display area

**Validation Rules:**
- Email: Valid email format
- Password: Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
- Username: 3-20 characters, alphanumeric + underscores
- Confirm Password: Must match password field

### Task 3: Update App Router for Authentication

**File:** `app.html` and router logic

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

1. **Enhance AuthManager** (add register/login/logout methods)
2. **Create AuthForm Component** (reusable form with validation)
3. **Create AuthPage** (container for auth forms)
4. **Add CSS Styling** (auth-form.css enhancements)
5. **Update Router** (add /auth route, authentication guard)
6. **Create UserProfile Component** (header display + logout)
7. **Add Session Persistence** (check token on app load)
8. **Test & Refine** (all flows working smoothly)

## Timeline Estimate

- **AuthManager Enhancements:** 2-3 hours
- **AuthForm Component:** 3-4 hours
- **AuthPage Implementation:** 2-3 hours
- **Styling:** 2-3 hours
- **Router Updates:** 1-2 hours
- **UserProfile Component:** 2-3 hours
- **Testing & Debugging:** 3-4 hours

**Total:** ~15-22 hours

## Next Steps

After Phase 9 completion, proceed to:
- **Phase 10:** Production Deployment (see PHASE10_PRODUCTION_DEPLOYMENT_ROADMAP.md)
