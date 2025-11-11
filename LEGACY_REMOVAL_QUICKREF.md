# 🗑️ Legacy Files Removal - Quick Reference

**Full Documentation:** `docs/analysis/LEGACY_FILES_REMOVAL_LIST.md`  
**Status:** Ready for removal after verification  
**Created:** November 10, 2025

---

## ⚠️ CRITICAL: Before Removal

- [ ] ✅ All tests passing (100%)
- [ ] ✅ All features verified working in app.html
- [ ] ✅ **BACKUP CREATED** (Git tag: `v2.0-pre-cleanup`)
- [ ] ✅ 30-day monitoring period complete

---

## 📋 Quick Summary

| Category | Files | Lines | Safe? |
|----------|-------|-------|-------|
| HTML | 3 | ~200 | ✅ YES (after verification) |
| JavaScript | 11 | ~4,500 | ✅ YES (after verification) |
| CSS | 5 | ~1,550 | ✅ YES |
| Dev Tools | 2 | ~100 | ✅ YES |
| **TOTAL** | **21** | **~6,350** | **After verification** |

---

## 🚀 Removal Commands (Copy-Paste Ready)

### Step 1: Create Backup
```powershell
git checkout -b pre-legacy-removal
git push origin pre-legacy-removal
git tag -a v2.0-pre-cleanup -m "Backup before legacy removal"
git push origin v2.0-pre-cleanup
git checkout Feature/Modernization
```

### Step 2: Remove Development Files (Low Risk)
```powershell
git rm validate-phase1.js phase1-test.html data-viewer.html
git commit -m "chore: Remove Phase 1 testing tools"
```

### Step 3: Remove Legacy CSS (Medium Risk)
```powershell
git rm css/layout.css css/grid.css css/buttons.css css/player.css css/responsive.css
git commit -m "chore: Remove legacy CSS files"
```

### Step 4: Remove Legacy JavaScript (High Risk - TEST THOROUGHLY)
```powershell
git rm js/app.js js/navigation.js js/viewManager.js js/showList.js js/songList.js js/player.js js/scheduleManager.js js/importControls.js js/dataManager.js js/config.js js/sitesService.js js/youtubeImportService.js
git commit -m "chore: Remove legacy JavaScript files"
```

### Step 5: Remove index.html (After 30 days)
```powershell
# WAIT 30 DAYS after Step 4
git rm index.html
git commit -m "chore: Remove legacy index.html entry point"
```

---

## 📊 Files to Remove

### HTML (3 files)
- ❌ `index.html` - Legacy entry (keep 30 days as redirect)
- ❌ `phase1-test.html` - Phase 1 testing
- ❌ `data-viewer.html` - Dev tool

### JavaScript (11 files - js/ directory)
- ❌ `js/app.js` → `src/Application/Bootstrap/AppBootstrap.js`
- ❌ `js/navigation.js` → `src/Presentation/Router/Router.js`
- ❌ `js/viewManager.js` → `src/Presentation/ViewModels/`
- ❌ `js/showList.js` → `src/Presentation/Pages/SchedulePage.js`
- ❌ `js/songList.js` → `src/Presentation/Pages/MusicPage.js`
- ❌ `js/player.js` → `src/Presentation/Components/MusicPlayer.js`
- ❌ `js/scheduleManager.js` → `src/Application/Services/ScheduleService.js`
- ❌ `js/importControls.js` → `src/Presentation/Pages/ImportPage.js`
- ❌ `js/dataManager.js` → `src/Infrastructure/Repositories/`
- ❌ `js/config.js` → Environment config
- ❌ `js/sitesService.js` → Integrated into services
- ❌ `js/youtubeImportService.js` → Integrated into ImportPage

### CSS (5 files)
- ❌ `css/layout.css` → `css/layout/grid-system.css + container.css`
- ❌ `css/grid.css` → `css/layout/grid-system.css`
- ❌ `css/buttons.css` → `css/components/button.css`
- ❌ `css/player.css` → `css/components/music-player.css`
- ❌ `css/responsive.css` → Integrated into components

### Dev Tools (2 files)
- ❌ `validate-phase1.js` - Phase 1 validation
- ❌ `phase1-test.html` - Phase 1 browser test

---

## ✅ Files to KEEP

### Core Application
- ✅ `app.html` - Modern entry point
- ✅ `server.py` - Backend proxy (STILL NEEDED)
- ✅ `package.json` - Dependencies
- ✅ `README.md` - Documentation

### Modern Architecture
- ✅ `src/` - All modern code (keep everything)
- ✅ `css/tokens/` - Design tokens (4 files)
- ✅ `css/base/` - Base styles (3 files)
- ✅ `css/layout/` - Layout system (2 files)
- ✅ `css/components/` - Component styles (15 files)

### Data & Documentation
- ✅ `data/` - JSON data files
- ✅ `docs/` - All documentation
- ✅ `.git/` - Git repository
- ✅ `.gitignore` - Git ignore rules

---

## 🔄 Rollback Plan

### Quick Rollback
```powershell
# Restore from backup tag
git checkout v2.0-pre-cleanup
```

### Restore Specific File
```powershell
# Example: Restore player.js
git checkout v2.0-pre-cleanup -- js/player.js
git commit -m "hotfix: Restore legacy player.js"
```

---

## ✅ Verification Checklist

Before proceeding, verify ALL features work:

### Schedule Features
- [ ] View weekly schedule
- [ ] Filter by status
- [ ] Show cards display correctly
- [ ] Episode progression (+1 button)
- [ ] Pagination working
- [ ] Day navigation

### Music Features
- [ ] Music library display
- [ ] Play/pause
- [ ] Volume control
- [ ] YouTube import
- [ ] Playlists
- [ ] Global player

### Import Features
- [ ] MAL JSON import
- [ ] YouTube video import
- [ ] YouTube playlist import
- [ ] Manual entry

### Site Management
- [ ] Add/edit/delete sites
- [ ] Filter by site
- [ ] Site badges

### Data Persistence
- [ ] LocalStorage save/load
- [ ] Data migration
- [ ] Export/import

### UI/UX
- [ ] Responsive design
- [ ] Toast notifications
- [ ] Modals
- [ ] Loading states
- [ ] Error handling

---

## 📈 Expected Benefits

- ✅ **6,350 lines** of legacy code removed
- ✅ **21 files** eliminated (cleaner codebase)
- ✅ **~200KB** disk space recovered
- ✅ **Single source of truth** (no duplicate code)
- ✅ **Easier maintenance** (one codebase to maintain)
- ✅ **Faster development** (clear where to add features)

---

## 📞 Need Help?

- **Full Guide:** `docs/analysis/LEGACY_FILES_REMOVAL_LIST.md`
- **Phase 7 Roadmap:** `docs/roadmaps/PHASE7_PRESENTATION_MODERNIZATION_ROADMAP.md`
- **Documentation Index:** `docs/README.md`

---

**⚠️ IMPORTANT:** Do NOT remove any files until ALL items in the verification checklist are complete and you have created a backup!

---

*This is a quick reference. See the full removal list for detailed instructions, rollback procedures, and monitoring guidelines.*
