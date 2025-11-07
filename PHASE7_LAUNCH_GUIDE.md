# Phase 7 Launch Guide
## How to Test the Modern Application

---

## 🚀 Quick Start

### Step 1: Start the Server
```powershell
# Navigate to project directory
cd "c:\Users\willi\Desktop\My Playground\my-playground"

# Start Python server (serves on port 8000)
npm run dev
# OR
python server.py
```

### Step 2: Open the Application
Open your browser and navigate to:
```
http://localhost:8000/app.html
```

---

## 🧪 What to Test

### Bootstrap Process
**Expected:** Loading spinner → Application loads → Shows schedule page

**Watch for:**
- ✅ Loading spinner appears
- ✅ Loading spinner disappears after ~2 seconds
- ✅ Header with "Anime Tracker" title appears
- ✅ Navigation menu appears (Schedule, Shows, Music, Import)
- ✅ Schedule page content loads
- ❌ Error message (check console)

### Navigation
**Test:** Click navigation menu items

**Expected:**
- ✅ URL changes (e.g., `/schedule` → `/shows`)
- ✅ Page content changes
- ✅ Active nav item updates (highlighted)
- ✅ No page reload (SPA navigation)

### Pages to Test

#### 1. Schedule Page (`/schedule`)
- ✅ Shows weekly schedule
- ✅ Search box works
- ✅ Status filter works
- ✅ Sort dropdown works

#### 2. Shows Page (`/shows`)
- ✅ Shows all shows in grid
- ✅ Search works
- ✅ Status filter works
- ✅ Airing status filter works
- ✅ "+1 Episode" button works
- ✅ Toast notification appears

#### 3. Music Page (`/music`)
- ✅ Shows track list
- ✅ Search works
- ✅ Type filter works
- ✅ Play button works

#### 4. Import Page (`/import`)
- ✅ MAL import form visible
- ✅ File import forms visible
- ✅ Export buttons visible
- ✅ Forms are functional

### Theme Toggle
**Test:** Click theme button (🌙) in header

**Expected:**
- ✅ Icon changes to ☀️
- ✅ Theme changes (if styles defined)
- ✅ Preference saved in localStorage

### Toast Notifications
**Test:** Increment episode on Shows page

**Expected:**
- ✅ Toast appears top-right
- ✅ Toast shows success message
- ✅ Toast auto-dismisses after 3 seconds
- ✅ Close button (×) works

---

## 🐛 Common Issues

### Issue: "Failed to bootstrap application"
**Cause:** Missing files or import errors

**Solutions:**
1. Check browser console for specific error
2. Verify all files exist:
   ```powershell
   # Check if AppBootstrap.js exists
   ls src/Application/Bootstrap/AppBootstrap.js
   ```
3. Check file paths in imports (case-sensitive!)

### Issue: "Cannot find module"
**Cause:** Import path incorrect or file missing

**Solutions:**
1. Check exact error message in console
2. Verify file exists at specified path
3. Check import path uses `.js` extension

### Issue: "Repository not found"
**Cause:** Service registration issue

**Solutions:**
1. Check ServiceRegistration.js
2. Verify repository names match
3. Check container.get() calls use correct names

### Issue: "Navigation doesn't work"
**Cause:** Router not initialized or routes not registered

**Solutions:**
1. Check RouteConfiguration.js
2. Verify routes are registered
3. Check console for router errors

### Issue: Empty page / No data
**Cause:** Data files not loading or repositories failing

**Solutions:**
1. Check if `/data/shows.json` exists
2. Check if `/data/songs.json` exists
3. Verify server is serving static files correctly
4. Check network tab for 404 errors

### Issue: Components not rendering
**Cause:** Existing components incompatible with new architecture

**Solutions:**
1. Check component constructor parameters
2. Verify component has `render()` method
3. Check if component extends `BaseComponent`
4. Update component to match new interface

---

## 🔍 Browser Console Checks

### On Page Load
Look for these messages:
```
✅ 🚀 Bootstrapping application...
✅ ✓ Core services initialized
✅ ✓ Services registered
✅ ✓ Application state initialized
✅ ✓ Shell rendered
✅ ✓ Router initialized
✅ ✓ Initial data loaded
✅ ✓ Application ready
```

### On Navigation
Look for:
```
✅ Navigating to: /shows
✅ Navigation complete: /shows
```

### Errors to Watch For
```
❌ Bootstrap failed: [error message]
❌ Failed to load initial data: [error]
❌ Navigation error: [error]
❌ Service not found: [name]
```

---

## 📊 Testing Checklist

### Basic Functionality
- [ ] Application loads without errors
- [ ] Bootstrap completes successfully
- [ ] Header displays correctly
- [ ] Navigation menu displays correctly
- [ ] Default route (/schedule) loads

### Navigation
- [ ] Click "Schedule" - loads schedule page
- [ ] Click "Shows" - loads shows page
- [ ] Click "Music" - loads music page
- [ ] Click "Import" - loads import page
- [ ] Browser back button works
- [ ] Browser forward button works
- [ ] Direct URL navigation works

### Schedule Page
- [ ] Shows list of anime
- [ ] Search filters results
- [ ] Status filter works
- [ ] Sort dropdown works
- [ ] Empty state shows if no data

### Shows Page
- [ ] Shows grid of shows
- [ ] Show cards display correctly
- [ ] Search filters results
- [ ] Status filter works
- [ ] Airing filter works
- [ ] "+1 Episode" button works
- [ ] Toast notification appears

### Music Page
- [ ] Shows list of tracks
- [ ] Search filters results
- [ ] Type filter works
- [ ] Play button triggers action
- [ ] Playing state updates

### Import Page
- [ ] MAL import form functional
- [ ] File upload works
- [ ] Import processes file
- [ ] Export downloads file
- [ ] Success/error messages display

### UI Components
- [ ] Theme toggle works
- [ ] Toast notifications appear
- [ ] Toast auto-dismiss works
- [ ] Toast close button works
- [ ] Active nav item highlights
- [ ] Buttons have hover states
- [ ] Forms are styled correctly

### Error Handling
- [ ] Invalid route shows 404 or redirects
- [ ] Failed data load shows error state
- [ ] Import errors show user-friendly message
- [ ] Bootstrap failure shows error page

### Performance
- [ ] Page loads in < 3 seconds
- [ ] Navigation is instant (< 100ms)
- [ ] No memory leaks (test with 10+ navigations)
- [ ] Console shows no warnings

---

## 🔧 Debugging Tips

### Enable Debug Logging
Open browser console and run:
```javascript
// Access container for debugging
window.__container

// Access app instance
window.__app

// Check if service is registered
window.__container.get('showRepository')

// Check current route
window.__app.router.getCurrentRoute()

// Check application state
window.__app.container.get('applicationState').getState()
```

### Check Service Registration
```javascript
// List all registered services
console.log(window.__container)
```

### Monitor Events
```javascript
// Listen to all events
const eventBus = window.__container.get('eventBus');
eventBus.on('*', (eventName, data) => {
  console.log('Event:', eventName, data);
});
```

### Check localStorage
```javascript
// Check saved state
console.log(localStorage.getItem('app-state'));

// Check saved shows
console.log(localStorage.getItem('anime-tracker-v2:shows'));
```

---

## 📝 Testing Notes Template

Use this template to document your testing:

```
### Test Session: [Date/Time]

**Browser:** [Chrome/Firefox/Edge]
**URL:** http://localhost:8000/app.html

#### Bootstrap
- [ ] Loading spinner appeared
- [ ] Application loaded successfully
- Console messages:
  [paste relevant console logs]

#### Navigation
- [ ] /schedule loaded
- [ ] /shows loaded
- [ ] /music loaded
- [ ] /import loaded
Issues: [describe any issues]

#### Functionality
[Test each feature and note results]

#### Errors
[List any errors encountered]

#### Performance
Load time: [X seconds]
Navigation speed: [fast/slow]

#### Overall Status
[ ] Ready for production
[ ] Needs fixes
[ ] Blocked by: [issue]
```

---

## ✅ Next Steps After Testing

### If Everything Works
1. ✅ Mark Phase 7 complete
2. Create production build
3. Update documentation
4. Plan Phase 8 (if any)

### If Issues Found
1. Document all issues
2. Prioritize by severity
3. Fix critical issues first
4. Retest after fixes
5. Iterate until stable

---

## 🎉 Success Criteria

Phase 7 is considered **complete** when:
- ✅ Application loads without errors
- ✅ All 4 pages are accessible
- ✅ Navigation works smoothly
- ✅ Data loads from JSON files
- ✅ Basic CRUD operations work
- ✅ Toast notifications work
- ✅ Theme toggle works
- ✅ No console errors
- ✅ Responsive design works
- ✅ Browser back/forward works

---

**Ready to test?** Start the server and open `http://localhost:8000/app.html`! 🚀
