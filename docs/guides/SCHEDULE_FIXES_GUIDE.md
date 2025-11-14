# Schedule Page Fixes Guide

## Overview
This guide addresses three critical issues discovered on November 14, 2025:

1. **Day filters not working** - Shows appear in "All Days" but not in individual day filters (Sunday, Monday, etc.)
2. **Show thumbnails not rendering** - Image URLs are not displaying in show cards
3. **English titles missing** - `getTitle()` method error and English titles not appearing

## Root Cause Analysis

### Issue 1: Day Filters Not Working ✅ DATA LOADS, ❌ DAY GROUPING BROKEN

**Symptom**: Shows appear in "All Days" view but individual day filters (Sunday, Monday, etc.) show 0 shows.

**Root Cause**: The `_groupShowsByDay()` method in `ScheduleService.js` is receiving shows, but the `effectiveStartDate` is likely `null` or not a `ShowDate` object, causing all shows to be placed in "Airing Date Not Yet Scheduled" instead of their actual day of the week.

**Evidence**:
- Line 307-309 in ScheduleService.js logs first 5 shows
- Line 325 in ScheduleService.js: `if (!effectiveStartDate)` sends shows to "Airing Date Not Yet Scheduled"
- Shows display in "All Days" (which returns the entire schedule object including all categories)
- Individual day filters return empty arrays

**Debug Steps**:
1. Check terminal output for `[Schedule Debug]` logs showing effectiveStartDate values
2. Verify if effectiveStartDate is `null`, `undefined`, or has a value
3. Check if ShowDate parsing is failing in Show constructor

**Expected Behavior**:
```
[Schedule Debug] Show: "Anime Title", effectiveStartDate: 01-12-25, type: ShowDate, airingStatus: currently_airing
```

**Actual Behavior** (hypothesis):
```
[Schedule Debug] Show: "Anime Title", effectiveStartDate: NULL, type: null, airingStatus: currently_airing
```

---

### Issue 2: Show Thumbnails Not Rendering

**Symptom**: Show cards display without thumbnail images.

**Root Cause**: **CONFIRMED** - Image URLs ARE populated in the database. The issue is likely in how the Show model receives or processes the `image_url` field.

**Database Confirmation**:
- ✅ `image_url` column contains valid URLs
- Example: `https://cdn.myanimelist.net/r/192x272/images/anime/1905/142840.jpg?s=d0c89d220ad610ec58c81837c1fa3901`

**Code Location**:
- ShowCard.js line 106: `const imageUrl = show.getImageUrl?.() || '';`
- Show.js line 59: `this.imageUrl = data.image_url || data.imageUrl || null;`
- Show.js line 788: `getImageUrl() { return this.imageUrl; }`

**Likely Causes** (in order of probability):
1. MySQLShowRepository is not selecting `image_url` in the SQL query
2. Show objects are being serialized/deserialized, losing imageUrl property
3. ShowCard is receiving plain objects instead of Show instances
4. Frontend caching issue causing old data without images to display

**Verification Steps**:
1. Check MySQLShowRepository SQL SELECT statement includes `s.image_url`
2. Check _mapRowToShow includes `image_url: row.image_url`
3. Verify Show constructor receives image_url and sets this.imageUrl
4. Check browser Network tab to see if image URLs are in API response
5. Check browser Console for any image loading errors

---

### Issue 3: English Titles Missing

**Symptom**: Error `show.getTitle is not a function` when clicking show card.

**Root Cause**: The show object passed to event handlers may be a plain JavaScript object (from JSON serialization) rather than a Show domain model instance, causing method calls to fail.

**Secondary Issue**: The `title_english` column in database exists but likely has no data, as the legacy `titles.json` file was never migrated to MySQL.

**Code Locations**:
- SchedulePage.js line 571: `show.getTitle()` - ERROR HERE
- Show.js line 774: `getTitle() { return this.title; }`
- Show.js line 22: `this.titleEnglish = data.title_english || data.titleEnglish || null;`
- Database schema.sql line 43: `title_english VARCHAR(255)`

**Two Sub-Problems**:

#### 3a. Method Call Error
The show object being passed through event handlers is losing its prototype chain.

**Verification**:
```javascript
console.log('Show object:', show);
console.log('Is Show instance?', show instanceof Show);
console.log('Has getTitle?', typeof show.getTitle);
console.log('Show constructor:', show.constructor.name);
```

#### 3b. Missing English Title Data
The `titles.json` file that previously stored English title mappings was never migrated to the `title_english` column in MySQL.

**Legacy Data Location**: The `titles.json` file no longer exists (confirmed file search returned no results).

---

## Fix Implementation Plan

### Fix 1: Diagnose Day Filter Issue (HIGH PRIORITY)

**Step 1**: Check the actual debug output
```powershell
# In terminal with running dev:all
# Look for [Schedule Debug] logs
```

**Step 2**: Add more granular logging to Show constructor
```javascript
// In src/Domain/Models/Show.js line 48
const parseDate = (dateValue) => {
    if (!dateValue) {
        console.log('⚠️ [Show] parseDate: No date value provided');
        return null;
    }
    if (dateValue instanceof ShowDate) return dateValue;
    
    console.log('🔍 [Show] parseDate: Attempting to parse:', dateValue);
    
    try {
        const result = new ShowDate(dateValue);
        console.log('✅ [Show] parseDate: Success:', result.format());
        return result;
    } catch (error) {
        console.error('❌ [Show] parseDate: Failed for', dateValue, error.message);
        return null;
    }
};
```

**Step 3**: Check if database dates are being read correctly
```javascript
// In src/Infrastructure/Repositories/MySQLShowRepository.js
// Around line 445 in _mapRowToShow method
console.log('🔍 [MySQLShowRepository] Mapping show:', {
    id: row.id,
    title: row.title,
    start_date: row.start_date,
    custom_start_date: row.custom_start_date,
    start_date_type: typeof row.start_date
});
```

**Step 4**: Verify ShowDate parsing
```javascript
// Test in browser console after page loads
const ShowDate = (await import('./src/Domain/ValueObjects/ShowDate.js')).ShowDate;
const testDate = new ShowDate('01-12-25');
console.log('Test parse:', testDate.format(), testDate.getDayOfWeek());
```

**Expected Fix**: Once we identify where dates are becoming null, we need to ensure:
1. Database `start_date` values are being read as strings
2. Show constructor receives dates as strings (e.g., "01-12-25")
3. ShowDate successfully parses MM-DD-YY format
4. `effectiveStartDate` getter returns a valid ShowDate object

---

### Fix 2: Restore Show Thumbnails (MEDIUM PRIORITY)

**UPDATE**: ✅ **Database has image URLs confirmed** - Issue is in code, not data!

**Step 1**: Verify MySQLShowRepository query includes image_url

Check `src/Infrastructure/Repositories/MySQLShowRepository.js` - the main `findAll()` query should select `s.image_url`:

```javascript
const sql = `
    SELECT 
        s.*,  // This includes all columns including image_url
        us.watching_status,
        us.custom_start_date,
        us.custom_episodes,
        us.skipped_weeks,
        us.tags,
        us.notes
    FROM shows s
    JOIN user_shows us ON s.id = us.show_id
    WHERE us.user_id = ?
`;
```

**Step 2**: Verify _mapRowToShow includes image_url mapping

In the same file, check the `_mapRowToShow` method includes:
```javascript
image_url: row.image_url,  // or imageUrl: row.image_url
```

**Step 3**: Test in browser console

After loading schedule page:
```javascript
// Get a show from the schedule
const schedule = await fetch('http://localhost:3000/api/shows?userId=3').then(r => r.json());
console.log('First show image_url:', schedule[0]?.image_url);
console.log('First show imageUrl:', schedule[0]?.imageUrl);

// Check if Show instance has getImageUrl method
const firstShow = schedule[0];
console.log('Has getImageUrl?', typeof firstShow?.getImageUrl);
console.log('Image URL:', firstShow?.getImageUrl?.());
```

**Step 4**: Check API response

Open DevTools Network tab:
1. Filter for `/api/shows` or `/api/schedule`
2. Check response JSON
3. Verify `image_url` field is present: `https://cdn.myanimelist.net/r/192x272/images/anime/...`

**Step 5**: If images still don't show

The issue is likely object serialization losing the Show instance. Apply the same fix as Issue 3a (preserve Show instances through event handlers).

**Expected image URL format**:
```
https://cdn.myanimelist.net/r/192x272/images/anime/1905/142840.jpg?s=d0c89d220ad610ec58c81837c1fa3901
```

---

### Fix 3: Restore English Titles (MEDIUM PRIORITY)

This requires TWO fixes:

#### Fix 3a: Method Call Error

**Problem**: Show objects are being serialized/deserialized and losing their prototype chain.

**Solution**: Ensure Show instances are preserved through event handlers OR use property access instead of methods.

**Quick Fix** (Property Access):
```javascript
// In src/Presentation/Pages/SchedulePage.js line 571
// Change from:
this.logger.info('Show selected:', show.getTitle());

// To:
this.logger.info('Show selected:', show.title || show.getTitle?.());
```

**Better Fix** (Preserve Instances):
Find where show objects are being passed through events and ensure they remain Show instances:

```javascript
// In SchedulePage.js, when creating ShowCard components
// Ensure the show passed is a Show instance, not a plain object
const showInstance = show instanceof Show ? show : new Show(show);
```

**Root Cause Investigation**:
1. Check if `schedule` returned from API is plain objects
2. Check if ShowCard.js is receiving Show instances or plain objects
3. Verify that clicking show card passes the correct show object

#### Fix 3b: Populate English Titles

**Problem**: The `title_english` column is empty because titles.json was never migrated.

**Solution**: Since titles.json no longer exists, English titles need to be:

**Option A**: Manually added via admin interface (best for small datasets)
```javascript
// Add an admin feature to edit show titles
// Update via MySQLShowRepository.save()
```

**Option B**: Re-import from MyAnimeList API (if enabled)
```javascript
// Use ImportService to fetch show details
// MAL API returns both title and title_english
```

**Option C**: Use existing title as English title (fallback)
```sql
-- Temporary fix: Copy title to title_english where null
UPDATE shows 
SET title_english = title 
WHERE title_english IS NULL OR title_english = '';
```

**Option D**: ✅ **RECOMMENDED** - Use provided English titles data (READY TO USE)

**English titles data has been recovered!** A migration script has been created at:
`database/migrations/migrate-english-titles.js`

This migration includes **134 English title mappings** from the legacy titles.json file.

**To run the migration**:
```powershell
# Navigate to project root
cd "c:\Users\willi\Desktop\My Playground\my-playground"

# Run the migration
node database/migrations/migrate-english-titles.js
```

**What it does**:
- Updates the `title_english` column for 134 shows
- Provides detailed progress logging
- Shows summary: updated count, not found count, errors
- Verifies migration success with database count

**Example titles in migration**:
- Show ID 14719: "JoJo's Bizarre Adventure (2012)"
- Show ID 37999: "Kaguya-sama: Love is War"
- Show ID 59978: "Frieren: Beyond Journey's End Season 2"
- Show ID 60058: "[Oshi No Ko] Season 3"
- And 130 more...

**After running migration**:
- English titles will display in the UI
- Shows without English titles will fallback to primary title
- No manual data entry required!

---

## Implementation Sequence

### Day 1 Morning: Diagnostics & English Titles Migration
1. ✅ Check terminal output for `[Schedule Debug]` logs
2. ✅ **Run English titles migration** (HIGH VALUE, QUICK WIN)
   ```powershell
   node database/migrations/migrate-english-titles.js
   ```
3. ✅ Add granular logging to Show constructor parseDate
4. ✅ Add logging to MySQLShowRepository _mapRowToShow
5. ✅ Verify image_url is in MySQLShowRepository SELECT query

### Day 1 Afternoon: Quick Fixes
6. ⚠️ Apply Quick Fix 3a (property access) to prevent getTitle() errors
7. 🔧 Restart servers and test English titles (should work after migration)
8. 🔍 Check browser console and Network tab for image URLs

### Day 2 Morning: Root Cause Fixes
9. 🔍 Review diagnostic logs from Day 1
10. 🐛 Fix ShowDate parsing issue based on findings (CRITICAL)
11. 🖼️ Fix image rendering (likely Show instance preservation issue)
12. 🔧 Test day filters with real data

### Day 2 Afternoon: Final Fixes & Testing
13. 🏗️ Implement Fix 3a properly (preserve Show instances)
14. ✅ Full regression testing of schedule page
15. 📊 Verify all features working
16. 🧹 Clean up debug logging

---

## Testing Checklist

After applying fixes, verify:

### Day Filters
- [ ] "All Days" shows all 444 shows
- [ ] "Sunday" filter shows shows with start_date "01-12-25" (and other Sundays)
- [ ] "Monday" filter shows shows with start_date "07-07-14" (and other Mondays)
- [ ] Each day of week filter shows correct shows
- [ ] "Airing Date Not Yet Scheduled" only shows truly unscheduled shows
- [ ] Future season filters work correctly

### Show Cards
- [ ] Thumbnail images appear on show cards
- [ ] Clicking show card doesn't throw error
- [ ] Show details modal opens correctly
- [ ] English titles appear (if available)

### Schedule Grid
- [ ] No console errors on page load
- [ ] Show count matches database query
- [ ] Switching between days is smooth
- [ ] Search and sort work correctly

---

## SQL Diagnostic Queries

Run these to gather information:

```sql
-- 1. Check show count by user
SELECT COUNT(*) as total_shows
FROM user_shows 
WHERE user_id = 3;

-- 2. Check start_date distribution
SELECT 
    start_date,
    COUNT(*) as count,
    GROUP_CONCAT(title SEPARATOR ', ') as sample_titles
FROM shows s
JOIN user_shows us ON s.id = us.show_id
WHERE us.user_id = 3 AND s.start_date IS NOT NULL
GROUP BY start_date
ORDER BY count DESC
LIMIT 10;

-- 3. Check which shows have start dates
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN start_date IS NOT NULL THEN 1 ELSE 0 END) as with_start_date,
    SUM(CASE WHEN start_date IS NULL THEN 1 ELSE 0 END) as without_start_date
FROM shows s
JOIN user_shows us ON s.id = us.show_id
WHERE us.user_id = 3;

-- 4. Check day of week distribution (if dates are valid)
SELECT 
    DAYNAME(STR_TO_DATE(start_date, '%m-%d-%y')) as day_of_week,
    COUNT(*) as show_count
FROM shows s
JOIN user_shows us ON s.id = us.show_id
WHERE us.user_id = 3 
    AND start_date IS NOT NULL 
    AND start_date != '00-00-00'
    AND start_date REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{2}$'
GROUP BY day_of_week
ORDER BY FIELD(day_of_week, 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');

-- 5. Check image URLs
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 ELSE 0 END) as with_image,
    SUM(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 ELSE 0 END) as without_image
FROM shows s
JOIN user_shows us ON s.id = us.show_id
WHERE us.user_id = 3;

-- 6. Check English titles
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN title_english IS NOT NULL AND title_english != '' THEN 1 ELSE 0 END) as with_english,
    SUM(CASE WHEN title_english IS NULL OR title_english = '' THEN 1 ELSE 0 END) as without_english
FROM shows s
JOIN user_shows us ON s.id = us.show_id
WHERE us.user_id = 3;

-- 7. Sample of shows without English titles
SELECT id, title, title_english, image_url, start_date
FROM shows s
JOIN user_shows us ON s.id = us.show_id
WHERE us.user_id = 3
LIMIT 10;
```

---

## Quick Reference: File Locations

### Core Files to Modify:
- `src/Application/Services/ScheduleService.js` - Day grouping logic (lines 270-365)
- `src/Domain/Models/Show.js` - Date parsing (lines 45-56), getters (lines 774-788)
- `src/Presentation/Pages/SchedulePage.js` - Event handlers (line 571)
- `src/Infrastructure/Repositories/MySQLShowRepository.js` - Database queries

### Database:
- `database/schema.sql` - Schema definition
- MySQL connection: `localhost:3306`, database: `myplayground_dev`, user: `root`

### Data Files:
- `data/shows.json` - Original show data (may have image URLs)
- `data/titles.json` - English titles (NO LONGER EXISTS - needs restoration)

---

## Expected Outcomes

### After All Fixes:
1. ✅ Day filters correctly show shows by day of week
2. ✅ Show thumbnails appear in all show cards  
3. ✅ English titles display (or gracefully fallback to primary title)
4. ✅ No console errors when interacting with shows
5. ✅ All 444 shows accessible and properly organized

### Performance:
- Page load: < 2 seconds
- Filter switching: < 100ms
- No console errors or warnings

---

## Rollback Plan

If fixes cause issues:

1. **Revert code changes**: Use git to revert commits
```powershell
git log --oneline -10
git revert <commit-hash>
```

2. **Restore database**: If you ran UPDATE queries
```sql
-- Only if you have a backup
SOURCE backup.sql;
```

3. **Clear cache**: 
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

---

## Notes

- The root cause of day filters is **CRITICAL** - shows load but aren't grouped correctly
- ✅ **English titles migration ready** - 134 titles can be populated immediately
- ✅ **Image URLs confirmed in database** - issue is code/rendering, not missing data
- The `getTitle()` error suggests object serialization issue - needs investigation

**Priority Order**: 
1. 🔴 **CRITICAL**: Fix day filters (user's primary complaint, blocks core functionality)
2. 🟡 **HIGH**: Fix getTitle() error (blocks interaction, causes console errors)
3. 🟢 **QUICK WIN**: Run English titles migration (5 minutes, immediate value)
4. 🟡 **MEDIUM**: Fix image rendering (visual issue, likely tied to #2)

---

## Contact & Questions

When resuming work:
1. Start with SQL diagnostic queries
2. Check terminal logs for `[Schedule Debug]` output
3. Review findings and adjust fix priority
4. Test incrementally after each fix

**Last Updated**: November 14, 2025, 3:15 AM
**Status**: Ready for implementation ✅ Migration script created
**Estimated Time**: 3-5 hours across 2 days (reduced after confirming image URLs exist)

**Quick Wins Available**:
- ✅ English titles migration: 5 minutes
- ✅ getTitle() error quick fix: 2 minutes
- Total quick wins: ~10 minutes for immediate improvements
