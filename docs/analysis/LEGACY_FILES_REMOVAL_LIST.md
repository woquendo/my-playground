# 🗑️ Legacy Files Removal List

**Document Purpose:** Comprehensive list of legacy files that can be safely removed after Phase 7 completion  
**Status:** Ready for Removal (Post-Verification)  
**Created:** November 10, 2025  
**Last Updated:** November 10, 2025

---

## ⚠️ CRITICAL: Pre-Removal Checklist

**DO NOT REMOVE ANY FILES UNTIL ALL ITEMS ARE CHECKED:**

- [ ] ✅ Phase 7 fully implemented and tested
- [ ] ✅ All unit tests passing (100%)
- [ ] ✅ All integration tests passing
- [ ] ✅ End-to-end testing complete on app.html
- [ ] ✅ User acceptance testing complete
- [ ] ✅ Performance benchmarks met
- [ ] ✅ Cross-browser testing complete (Chrome, Firefox, Safari, Edge)
- [ ] ✅ Mobile testing complete (iOS Safari, Chrome Android)
- [ ] ✅ All features working in modern app (schedule, music, import, site management)
- [ ] ✅ Data migration tested (localStorage schema upgrade)
- [ ] ✅ Backward compatibility verified (LegacyAdapter working)
- [ ] ✅ **BACKUP CREATED** (Git tag or branch: `pre-legacy-removal`)
- [ ] ✅ Rollback plan documented and tested
- [ ] ✅ Team/stakeholder approval obtained
- [ ] ✅ Production deployment successful
- [ ] ✅ 30-day monitoring period complete (no critical issues)

---

## 📦 Legacy Files for Removal

### Category 1: Legacy HTML Files (3 files)

**Purpose:** Old application entry points replaced by app.html

| File | Size | Purpose | Replaced By | Safe to Remove? |
|------|------|---------|-------------|-----------------|
| `index.html` | ~171 lines | Legacy app entry | `app.html` | ✅ YES (after 30-day grace) |
| `phase1-test.html` | Unknown | Phase 1 testing | N/A (testing only) | ✅ YES (immediately) |
| `data-viewer.html` | Unknown | Development tool | Modern DevTools | ✅ YES (immediately) |

**Removal Commands:**
```powershell
# After verification and backup
git rm index.html
git rm phase1-test.html
git rm data-viewer.html
```

**⚠️ Special Note for index.html:**
- Keep for 30 days as fallback link from app.html
- Update app.html to remove fallback link after 30 days
- Then remove index.html

---

### Category 2: Legacy JavaScript Files (11 files)

**Purpose:** Old monolithic JS modules replaced by modern architecture

| File | Lines | Purpose | Replaced By | Safe to Remove? |
|------|-------|---------|-------------|-----------------|
| `js/app.js` | ~500 | Legacy app init | `src/Application/Bootstrap/AppBootstrap.js` | ✅ YES |
| `js/navigation.js` | ~200 | Old navigation | `src/Presentation/Router/Router.js` + `NavigationComponent` | ✅ YES |
| `js/viewManager.js` | ~300 | View switching | `src/Presentation/ViewModels/` (all ViewModels) | ✅ YES |
| `js/showList.js` | ~400 | Show list UI | `src/Presentation/Pages/SchedulePage.js` + Components | ✅ YES |
| `js/songList.js` | ~350 | Song list UI | `src/Presentation/Pages/MusicPage.js` + Components | ✅ YES |
| `js/player.js` | ~450 | Music player | `src/Presentation/Components/MusicPlayer.js` + `GlobalMusicPlayer.js` | ✅ YES |
| `js/scheduleManager.js` | ~600 | Schedule logic | `src/Application/Services/ScheduleService.js` | ✅ YES |
| `js/importControls.js` | ~300 | Import UI | `src/Presentation/Pages/ImportPage.js` + `ImportForm.js` | ✅ YES |
| `js/dataManager.js` | ~800 | Data access | `src/Infrastructure/Repositories/` (all repositories) | ✅ YES |
| `js/config.js` | ~100 | Configuration | Environment config + `src/Core/Container.js` | ✅ YES |
| `js/sitesService.js` | ~200 | Sites management | Integrated into modern services | ✅ VERIFY FIRST |
| `js/youtubeImportService.js` | ~300 | YouTube import | Integrated into `ImportPage.js` | ✅ VERIFY FIRST |

**⚠️ IMPORTANT:** Verify that sitesService and youtubeImportService functionality is fully replicated in modern code before removal!

**Removal Commands:**
```powershell
# Remove entire js/ directory (after verification)
git rm -r js/

# Or remove files individually
git rm js/app.js
git rm js/navigation.js
git rm js/viewManager.js
git rm js/showList.js
git rm js/songList.js
git rm js/player.js
git rm js/scheduleManager.js
git rm js/importControls.js
git rm js/dataManager.js
git rm js/config.js
git rm js/sitesService.js
git rm js/youtubeImportService.js
```

**Total Size:** ~4,500 lines of legacy JavaScript

---

### Category 3: Legacy CSS Files (5 files)

**Purpose:** Monolithic CSS files replaced by modular component-based architecture

| File | Lines | Purpose | Replaced By | Safe to Remove? |
|------|-------|---------|-------------|-----------------|
| `css/layout.css` | ~400 | Old layout | `css/layout/grid-system.css` + `css/layout/container.css` | ✅ YES |
| `css/grid.css` | ~200 | Old grid system | `css/layout/grid-system.css` | ✅ YES |
| `css/buttons.css` | ~150 | Button styles | `css/components/button.css` | ✅ YES |
| `css/player.css` | ~300 | Player styles | `css/components/music-player.css` + `global-music-player.css` | ✅ YES |
| `css/responsive.css` | ~500 | Responsive styles | Integrated into components + `css/base/utilities.css` | ✅ YES |

**Removal Commands:**
```powershell
# Remove individual legacy CSS files
git rm css/layout.css
git rm css/grid.css
git rm css/buttons.css
git rm css/player.css
git rm css/responsive.css
```

**Total Size:** ~1,550 lines of legacy CSS

**✅ Keep Modern CSS:**
- `css/tokens/` (4 files) - Design tokens
- `css/base/` (3 files) - Base styles
- `css/layout/` (2 files) - Layout system
- `css/components/` (15 files) - Component styles

---

### Category 4: Development/Testing Files (5 files)

**Purpose:** Phase-specific testing and validation scripts no longer needed

| File | Purpose | Safe to Remove? | Notes |
|------|---------|-----------------|-------|
| `validate-phase1.js` | Phase 1 validation | ✅ YES | Historical testing only |
| `run_server.bat` | Windows dev server | ⚠️ MAYBE | Replace with `npm run dev` |
| `server.py` | Python proxy server | ❌ NO | **KEEP** - Still needed for backend proxy |

**Removal Commands:**
```powershell
# Remove validation scripts
git rm validate-phase1.js

# Optional: Remove run_server.bat if using npm scripts
git rm run_server.bat
```

**⚠️ DO NOT REMOVE:**
- `server.py` - Still needed for backend proxy and API calls
- `package.json` - Modern project configuration
- `package-lock.json` - Dependency lock file

---

### Category 5: Legacy Documentation (Already Moved)

**Status:** ✅ ALREADY ORGANIZED - These files were moved to `docs/` in documentation reorganization

**Previously Moved Files:**
- `MODERNIZATION_ROADMAP.md` → `docs/roadmaps/MODERNIZATION_ROADMAP.md`
- `PHASE7_PRESENTATION_MODERNIZATION_ROADMAP.md` → `docs/roadmaps/PHASE7_PRESENTATION_MODERNIZATION_ROADMAP.md`
- `PHASE1_COMPLETION_SUMMARY.md` → `docs/phase-summaries/PHASE1_COMPLETION_SUMMARY.md`
- `PHASE2_COMPLETION_SUMMARY.md` → `docs/phase-summaries/PHASE2_COMPLETION_SUMMARY.md`
- `PHASE4_COMPLETION_SUMMARY.md` → `docs/phase-summaries/PHASE4_COMPLETION_SUMMARY.md`
- `PHASE6_COMPLETION_SUMMARY.md` → `docs/phase-summaries/PHASE6_COMPLETION_SUMMARY.md`
- `PHASE7_COMPLETION_SUMMARY.md` → `docs/phase-summaries/PHASE7_COMPLETION_SUMMARY.md`
- `PHASE7_PROGRESS_SUMMARY.md` → `docs/phase-summaries/PHASE7_PROGRESS_SUMMARY.md`
- `PHASE7_LAUNCH_GUIDE.md` → `docs/guides/PHASE7_LAUNCH_GUIDE.md`
- `YOUTUBE_IMPORT_GUIDE.md` → `docs/guides/YOUTUBE_IMPORT_GUIDE.md`
- `IMPORT_FORM_UPDATE.md` → `docs/guides/IMPORT_FORM_UPDATE.md`
- `RESOURCE_USAGE_ANALYSIS.md` → `docs/analysis/RESOURCE_USAGE_ANALYSIS.md`
- `YOUTUBE_POLLING_FIX.md` → `docs/analysis/YOUTUBE_POLLING_FIX.md`
- `CLEANUP_SUMMARY.md` → `docs/analysis/CLEANUP_SUMMARY.md`
- `PLAYLIST_IMPORT_FEATURE.md` → `docs/analysis/PLAYLIST_IMPORT_FEATURE.md`
- `FINAL_COMPLETION_REPORT.md` → `docs/FINAL_COMPLETION_REPORT.md`

**No Action Needed** - Documentation is already properly organized.

---

## 📊 Removal Impact Summary

### Files to Remove
- **HTML Files:** 3 files (~200 lines)
- **JavaScript Files:** 11 files (~4,500 lines)
- **CSS Files:** 5 files (~1,550 lines)
- **Development Tools:** 2 files (~100 lines)
- **TOTAL:** 21 files, ~6,350 lines of legacy code

### Files to Keep
- **Modern Architecture:** `src/` directory (all modern code)
- **Modern HTML:** `app.html` (new entry point)
- **Modern CSS:** `css/tokens/`, `css/base/`, `css/layout/`, `css/components/`
- **Data Files:** `data/` directory (JSON data files)
- **Server:** `server.py` (backend proxy)
- **Configuration:** `package.json`, `package-lock.json`
- **Documentation:** `docs/` directory, `README.md`
- **Git:** `.git/`, `.gitignore`

### Disk Space Recovered
- **Estimated:** ~200KB of legacy code
- **Benefit:** Cleaner codebase, reduced confusion, easier maintenance

---

## 🔄 Migration Verification Checklist

Before removing any files, verify that all functionality has been replicated:

### Schedule Features
- [ ] ✅ View weekly schedule grouped by day
- [ ] ✅ Filter shows by status (watching, completed, etc.)
- [ ] ✅ Filter shows behind schedule
- [ ] ✅ Show cards display correct information
- [ ] ✅ Episode progression with +1 button
- [ ] ✅ Status transitions (watching → completed)
- [ ] ✅ Pagination working correctly
- [ ] ✅ Day navigation (arrows + day buttons)
- [ ] ✅ Season tabs working

### Music Features
- [ ] ✅ Music library display
- [ ] ✅ Play/pause functionality
- [ ] ✅ Volume control
- [ ] ✅ Playlist management
- [ ] ✅ YouTube video/playlist import
- [ ] ✅ Audio filters (bass boost, reverb, etc.)
- [ ] ✅ Queue management
- [ ] ✅ Play count tracking
- [ ] ✅ Global music player (persistent)

### Import Features
- [ ] ✅ MyAnimeList import (JSON upload)
- [ ] ✅ YouTube video import (single URL)
- [ ] ✅ YouTube playlist import (playlist URL)
- [ ] ✅ Manual show entry
- [ ] ✅ Import validation and error handling
- [ ] ✅ Progress indicators during import

### Site Management Features
- [ ] ✅ Add new site
- [ ] ✅ Edit existing site
- [ ] ✅ Delete site
- [ ] ✅ Filter shows by site
- [ ] ✅ Site badges on show cards

### Data Persistence
- [ ] ✅ LocalStorage save/load working
- [ ] ✅ Data migration from old schema
- [ ] ✅ Export functionality
- [ ] ✅ Import functionality

### UI/UX Features
- [ ] ✅ Responsive design (mobile, tablet, desktop)
- [ ] ✅ Toast notifications
- [ ] ✅ Modal dialogs
- [ ] ✅ Loading states
- [ ] ✅ Error handling and messages
- [ ] ✅ Accessibility (keyboard navigation, screen readers)

---

## 🚀 Recommended Removal Process

### Step 1: Backup (CRITICAL)
```powershell
# Create backup branch
git checkout -b pre-legacy-removal
git push origin pre-legacy-removal

# Create Git tag
git tag -a v2.0-pre-cleanup -m "Backup before legacy file removal"
git push origin v2.0-pre-cleanup

# Return to main branch
git checkout Feature/Modernization
```

### Step 2: Remove Development/Testing Files (Low Risk)
```powershell
# Remove phase 1 validation
git rm validate-phase1.js
git rm phase1-test.html
git rm data-viewer.html

# Commit
git commit -m "chore: Remove Phase 1 testing and development tools

- Remove validate-phase1.js (Phase 1 validation script)
- Remove phase1-test.html (Phase 1 browser test)
- Remove data-viewer.html (development tool)

These files are no longer needed after Phase 7 completion."
```

### Step 3: Remove Legacy CSS (Medium Risk)
```powershell
# Remove legacy CSS files
git rm css/layout.css css/grid.css css/buttons.css css/player.css css/responsive.css

# Commit
git commit -m "chore: Remove legacy CSS files

- Remove css/layout.css (replaced by css/layout/grid-system.css + container.css)
- Remove css/grid.css (replaced by css/layout/grid-system.css)
- Remove css/buttons.css (replaced by css/components/button.css)
- Remove css/player.css (replaced by css/components/music-player.css)
- Remove css/responsive.css (integrated into components)

Modern CSS architecture in place with tokens, base, layout, and components."

# Test app.html thoroughly
```

### Step 4: Remove Legacy JavaScript (High Risk)
```powershell
# Remove legacy JavaScript files
git rm js/app.js js/navigation.js js/viewManager.js js/showList.js js/songList.js
git rm js/player.js js/scheduleManager.js js/importControls.js js/dataManager.js js/config.js
git rm js/sitesService.js js/youtubeImportService.js

# Commit
git commit -m "chore: Remove legacy JavaScript files

- Remove js/app.js (replaced by src/Application/Bootstrap/AppBootstrap.js)
- Remove js/navigation.js (replaced by src/Presentation/Router/Router.js)
- Remove js/viewManager.js (replaced by ViewModels)
- Remove js/showList.js (replaced by SchedulePage)
- Remove js/songList.js (replaced by MusicPage)
- Remove js/player.js (replaced by MusicPlayer components)
- Remove js/scheduleManager.js (replaced by ScheduleService)
- Remove js/importControls.js (replaced by ImportPage)
- Remove js/dataManager.js (replaced by Repositories)
- Remove js/config.js (replaced by environment config)
- Remove js/sitesService.js (integrated into modern services)
- Remove js/youtubeImportService.js (integrated into ImportPage)

All functionality migrated to modern architecture."

# Test ALL features thoroughly
```

### Step 5: Update index.html to Redirect (Transition Period)
```powershell
# Edit index.html to redirect to app.html
# Keep file for 30 days as transition period
```

**New index.html content:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=app.html">
    <title>Redirecting...</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #0b0b0b;
            color: white;
            margin: 0;
        }
        .message {
            text-align: center;
        }
        a {
            color: #2563eb;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>🚀 Redirecting to Modern Version</h1>
        <p>If you are not redirected automatically, <a href="app.html">click here</a>.</p>
    </div>
</body>
</html>
```

### Step 6: Remove index.html (After 30 Days)
```powershell
# After 30-day grace period with no issues
git rm index.html

# Commit
git commit -m "chore: Remove legacy index.html entry point

Legacy entry point removed after 30-day transition period.
All users now use app.html with modern architecture."
```

### Step 7: Clean Up Empty Directories
```powershell
# Remove js/ directory if empty
rmdir js

# Commit
git commit -m "chore: Remove empty js/ directory

Legacy JavaScript directory removed after file cleanup."
```

### Step 8: Update Documentation
- Update README.md to remove references to legacy files
- Update any documentation pointing to old files
- Add migration notes to CHANGELOG

---

## 🔙 Rollback Plan

If issues are discovered after removal:

### Immediate Rollback (Git)
```powershell
# Revert to backup tag
git checkout v2.0-pre-cleanup

# Or restore from backup branch
git checkout pre-legacy-removal
git checkout -b hotfix/restore-legacy
git push origin hotfix/restore-legacy
```

### Partial Rollback (Restore Specific Files)
```powershell
# Restore specific file from backup
git checkout v2.0-pre-cleanup -- js/player.js

# Commit
git commit -m "hotfix: Restore legacy player.js temporarily

Restoring legacy file to fix critical issue.
Will re-migrate after investigation."
```

### Full Rollback (Nuclear Option)
```powershell
# Revert all cleanup commits
git revert HEAD~7..HEAD

# Or reset to pre-cleanup state (dangerous)
git reset --hard v2.0-pre-cleanup
git push origin Feature/Modernization --force
```

---

## 📈 Post-Removal Monitoring

After removal, monitor for 30 days:

### Metrics to Track
- **Error Rate:** Should remain < 0.1%
- **Page Load Time:** Should improve or stay same
- **User Complaints:** Should be zero
- **Console Errors:** Should be zero
- **Broken Features:** Should be zero

### Monitoring Tools
- Browser DevTools (Console, Network, Performance)
- User feedback/bug reports
- Analytics (if implemented)
- Lighthouse audits (before/after comparison)

### Success Criteria
- ✅ No increase in error rate
- ✅ No user-reported issues
- ✅ All automated tests passing
- ✅ Performance maintained or improved
- ✅ Clean console (no errors or warnings)

---

## 🎯 Expected Benefits

### Code Quality
- ✅ **Reduced Complexity:** 21 fewer files to maintain
- ✅ **Clearer Structure:** No confusion about which code to use
- ✅ **Easier Onboarding:** New developers see only modern code
- ✅ **Better IDE Performance:** Fewer files to index

### Maintenance
- ✅ **Single Source of Truth:** No duplicate functionality
- ✅ **Easier Refactoring:** No need to maintain two codebases
- ✅ **Faster Development:** Clear where to add new features
- ✅ **Better Testing:** Only modern code needs testing

### Performance
- ✅ **Smaller Repository:** ~200KB smaller
- ✅ **Faster Cloning:** Less data to download
- ✅ **Cleaner Builds:** No legacy code in build process
- ✅ **Improved Caching:** Fewer files = better browser caching

---

## ⚠️ Final Warning

**DO NOT PROCEED WITH REMOVAL UNTIL:**

1. ✅ All features verified working in app.html
2. ✅ All tests passing (unit, integration, E2E)
3. ✅ User acceptance testing complete
4. ✅ Backup created (Git tag + branch)
5. ✅ Rollback plan documented and tested
6. ✅ Team approval obtained
7. ✅ At least 2 people have reviewed this document
8. ✅ Production monitoring in place

**Remember:** These files represent the original working application. Removing them is irreversible (without Git). Take every precaution to ensure the modern application is 100% feature-complete before proceeding.

---

## 📞 Support

If you encounter issues during or after removal:

1. **Check Rollback Plan** (above)
2. **Review Git History:** `git log --all --graph --oneline`
3. **Check Backup Tag:** `git show v2.0-pre-cleanup`
4. **Consult Documentation:** `docs/README.md`
5. **Review Completion Reports:** `docs/phase-summaries/`

---

**Document Status:** ✅ READY FOR USE  
**Last Reviewed:** November 10, 2025  
**Next Review:** After 30-day monitoring period  
**Approved By:** Pending stakeholder approval

---

*This document is part of the Phase 7 Presentation Layer Modernization project. See `docs/roadmaps/PHASE7_PRESENTATION_MODERNIZATION_ROADMAP.md` for full context.*
