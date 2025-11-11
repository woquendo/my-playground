# 📺 Anime Schedule & Music Library

A modern, feature-rich web application for tracking anime schedules and managing music from your favorite shows. Built with clean architecture principles and modern JavaScript.

## 🚀 Quick Start

### Development Server

```powershell
# Start the Python proxy server
npm run dev

# Or manually:
python server.py
```

Then open:
- **Modern App**: http://localhost:8000/app.html (recommended)
- **Legacy App**: http://localhost:8000/index.html (for compatibility)

### Key Files

- `app.html` — Modern application entry point with new architecture
- `index.html` — Legacy version (backward compatible)
- `data/shows.json`, `data/songs.json`, `data/playlists.json` — Data storage

Quick test (PowerShell):

```powershell
# from the repository root
# start a simple server (Python must be installed)
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

## ✨ Features

### Schedule Management
- 📅 Weekly schedule view with day navigation
- 🔄 Automatic episode tracking with behind/up-to-date indicators
- 📊 Infinite scroll pagination (20 shows per batch)
- 🔍 Search and filter by status, day, season
- 📝 Mark episodes as watched, update show status
- 🎭 Quick links to streaming sites (Aniwave, Crunchyroll, HiAnime, etc.)
- ⏩ Skip week functionality for shows on break

### Music Player
- 🎵 Global persistent music player (survives page navigation)
- 🎬 YouTube video playback support
- 📚 Playlist organization and management
- 🎨 Filter by type (Opening, Ending, OST, Insert Song)
- 🔊 Volume control with mute and localStorage persistence
- ⏭️ Previous/Next navigation respecting active filters
- 🔍 Search across all tracks

### Import/Export
- 📥 MyAnimeList animelist import (via proxy server)
- 🎥 YouTube video/playlist import for music
- 📋 JSON file import/export for shows and songs
- 💾 Automatic localStorage sync
- 🔄 Real-time library updates

### Modern Architecture
- 🏗️ Clean Architecture with SOLID principles
- 💉 Dependency Injection container
- 🎯 Event-driven communication (EventBus)
- 📦 Domain-Driven Design with Value Objects
- 🧩 Component-based UI (BaseComponent pattern)
- 🔄 SPA routing (no page reloads)
- ♻️ Backward compatibility with legacy code

## 🏛️ Architecture

### Directory Structure

```
my-playground/
├── src/
│   ├── Core/               # Core framework (DI, Events, Logging)
│   ├── Domain/             # Business logic (Models, Services, Value Objects)
│   ├── Application/        # Use cases and orchestration
│   ├── Infrastructure/     # External services (HTTP, Storage, Cache)
│   ├── Presentation/       # UI layer (Components, Pages, ViewModels)
│   └── Bootstrap/          # App initialization and legacy adapter
├── css/
│   ├── tokens/             # Design tokens (colors, spacing, typography)
│   ├── base/               # Reset, variables, utilities
│   ├── components/         # Component-specific styles
│   └── layout/             # Grid system, containers
├── data/                   # JSON data files
└── js/                     # Legacy JavaScript (backward compatible)
```

### Layers

**Core** - Framework essentials
- `Container.js` - Dependency Injection container
- `EventBus.js` - Pub/sub event system
- `Logger.js` - Centralized logging

**Domain** - Business entities
- `Show.js`, `Music.js` - Domain models
- `ShowDate.js`, `ShowTitle.js` - Value Objects
- Episode calculation, schedule logic

**Application** - Use cases
- `ShowManagementService.js` - Show CRUD operations
- `MusicManagementService.js` - Music library management  
- `ScheduleService.js` - Weekly schedule generation
- `ImportService.js` - MAL and YouTube import

**Infrastructure** - External integrations
- `HttpShowRepository.js`, `HttpMusicRepository.js` - Data persistence
- `HttpClient.js` - Fetch wrapper with caching
- `StorageService.js` - localStorage abstraction
- `CacheManager.js` - In-memory caching

**Presentation** - UI components
- `SchedulePage.js`, `MusicPage.js`, `ImportPage.js` - Page controllers
- `ShowCard.js`, `ScheduleGrid.js` - Reusable components
- `GlobalMusicPlayer.js` - Persistent music player
- `Router.js` - SPA navigation

## 🔧 Configuration

### Sites Configuration (`data/sites.json`)

Notes:
- Opening `index.html` directly via file:// may cause fetch to fail; the page has fallback data so it will still show samples.
- To publish on GitHub Pages, push the repository to GitHub and enable Pages for the `main` branch.

## 📖 Usage Guide

### Importing Shows from MyAnimeList

1. Navigate to the **Import** page
2. Enter your MAL username
3. Click **"Import from MAL"**
4. The app will fetch your watching, plan to watch, completed, on hold, and dropped lists
5. Shows are automatically saved to localStorage and synced

**Note**: Import uses a local proxy server (`server.py`) to avoid CORS. Make sure the server is running.

### Importing Music from YouTube

**Single Video:**
1. Go to Import page
2. Paste YouTube video URL (e.g., `https://www.youtube.com/watch?v=Cb0JZhdmjtg`)
3. Click **"Import"**
4. Song is extracted with title, artist, and added to library

**Playlist:**
1. Paste YouTube playlist URL
2. Click **"Import"**
3. All videos in playlist are imported (may take time for large playlists)
4. Playlist metadata is saved to `data/playlists.json`

**Supported URL Formats:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID`

### Managing Streaming Sites

Each show card has a "Watch on" section with quick links to streaming sites:

1. Click the ⚙️ **settings icon** on a show card
2. Check/uncheck which sites have this show
3. Only checked sites will appear as quick links
4. Settings are saved per-show in localStorage

**Adding New Sites:**
- Edit `data/sites.json`
- Add site with `name`, `url`, and optional `searchPattern`
- See Sites Configuration section below

### Using the Global Music Player

The music player persists across all pages:

**Basic Controls:**
- ▶️/⏸️ Play/Pause
- ⏭️ Next track (respects filters)
- ⏮️ Previous track (respects filters)
- 🔊 Volume slider (saved to localStorage)
- 🔇 Mute toggle

**Filtering:**
- **By Type**: Opens, Endings, OST, Insert Songs
- **By Playlist**: View songs from specific YouTube playlists
- **All Songs**: Unfiltered library view

**Features:**
- Click header to expand/collapse player
- Search across all tracks
- Click track to play immediately
- Player state persists across page navigation
- Volume and position are saved and restored

### Tracking Show Progress

**Mark Episode as Watched:**
- Click ✓ **"Mark Watched"** button on show card
- Automatically increments episode count
- Updates behind/up-to-date status

**Change Show Status:**
- Use status dropdown on show card
- Options: Watching, Completed, On Hold, Dropped, Plan to Watch

**Update Air Date:**
- Click ⋮ menu → **"Update Air Date"**
- Useful for shows with irregular schedules
- Enter date in MM-DD-YY format

**Skip Week:**
- Click ⋮ menu → **"Skip This Week"**
- Useful when show is on break
- Adjusts episode calculations

## 💾 Data Storage

### localStorage Keys
- `anime_shows` - Show data
- `anime_music` - Music tracks
- `anime_site_availability` - Per-show site selections
- `globalPlayer` - Music player state (track, position, volume)
- `globalPlayer:volume`, `globalPlayer:muted` - Volume settings
- `data_migration_version` - Schema version for migrations

### JSON Files
- `data/shows.json` - Show collection
- `data/songs.json` - Music library
- `data/playlists.json` - YouTube playlist metadata
- `data/sites.json` - Streaming site configuration

**Export/Backup:**
- Import page has **"Download Songs JSON"** and **"Download Playlists JSON"** buttons
- Export shows via **"Export Shows"** button
- Files can be re-imported later

Streaming site configuration (data/sites.json)
-----------------------------------------------
The application supports dynamic configuration of anime streaming sites through `data/sites.json`. Sites can be easily added, modified, or removed without changing code.

**Adding a new site:**
1. Edit `data/sites.json` and add a new entry with:
   - `name`: Display name for the site
   - `url`: Base URL (with trailing slash)
   - `searchPattern`: (optional) URL pattern for search with placeholders

**Available placeholders in searchPattern:**
- `{encoded}` — URL-encoded anime title (e.g., "My%20Anime%20Title")
- `{normalized}` — Lowercase hyphenated title (e.g., "my-anime-title")
- `{query}` — Alias for {encoded}
- `{title}` — Alias for {encoded}

**Example with search URL:**
```json
{
  "name": "hianime",
  "url": "https://hianime.to/",
  "searchPattern": "/search?keyword={encoded}"
}
```

**Example for sites with complex search (POST requests, GraphQL):**
```json
{
  "name": "animex",
  "url": "http://animex.one/",
  "searchPattern": null,
  "_note": "Links to homepage - uses GraphQL for search"
}
```

**Fallback behavior:**
- If `searchPattern` is `null` or empty string, links directly to the site homepage (useful for sites that use POST requests or GraphQL APIs)
- If `searchPattern` is omitted entirely, the system defaults to common patterns like `/search?q={encoded}`
- Legacy hardcoded patterns exist for backwards compatibility

**Adding site icons:**
- Edit `ShowCard.js` → `_getSiteIcon()` method to add custom emoji/icon for new sites
- Default fallback icon is 🎬

## 👨‍💻 Developer Guide

### Creating a New Component

All UI components should extend `BaseComponent`:

```javascript
import { BaseComponent } from './BaseComponent.js';

export class MyComponent extends BaseComponent {
    constructor(options) {
        super({
            ...options,
            name: 'MyComponent',
            props: {
                data: options.data || []
            }
        });
    }

    // Override template method
    _template() {
        return `
            <div class="my-component">
                <h3>My Component</h3>
                ${this._props.data.map(item => `
                    <div class="item">${item.name}</div>
                `).join('')}
            </div>
        `;
    }

    // Override initialize for event listeners
    _initialize() {
        // Add event listeners
        this._addEventListener(this._element, 'click', (e) => {
            console.log('Clicked!');
        });

        // Emit custom events
        this._emit('ready', { count: this._props.data.length });
    }
}
```

**Usage:**
```javascript
const component = new MyComponent({
    container: document.getElementById('container'),
    data: [{ name: 'Item 1' }, { name: 'Item 2' }],
    eventBus: container.get('eventBus'),
    logger: container.get('logger')
});

component.mount();  // Render to DOM
component.update({ data: newData });  // Re-render with new data
component.unmount();  // Cleanup and remove
```

### Using the EventBus

```javascript
// Get EventBus from DI container
const eventBus = container.get('eventBus');

// Subscribe to events
const unsubscribe = eventBus.subscribe('show:updated', (show) => {
    console.log('Show updated:', show);
});

// Emit events
eventBus.emit('show:updated', updatedShow);

// Unsubscribe
unsubscribe();
```

**Common Events:**
- `music:play` - Play a track
- `music:libraryUpdated` - Music library changed
- `show:updated` - Show data changed
- `globalPlayer:toggle` - Toggle music player visibility
- `app:ready` - Application fully loaded

### Accessing Services

Services are registered in the DI container:

```javascript
// Get from container
const showService = container.get('showManagementService');
const musicService = container.get('musicManagementService');

// Use services
const shows = await showService.getAllShows();
const show = await showService.getShowById(id);
await showService.updateShow(show);
```

**Available Services:**
- `showManagementService` - Show CRUD
- `musicManagementService` - Music library
- `scheduleService` - Schedule generation
- `importService` - Import/export
- `toastService` - Notifications
- `router` - SPA navigation

### Adding a New Page

1. **Create Page Controller** (`src/Presentation/Pages/MyPage.js`):

```javascript
export class MyPage {
    constructor({ container, eventBus, logger }) {
        this.container = container;
        this.eventBus = eventBus;
        this.logger = logger;
    }

    async render() {
        const page = document.createElement('div');
        page.className = 'page page--my-page';
        page.innerHTML = `
            <div class="page__header">
                <h2>My Page</h2>
            </div>
            <div class="page__content">
                <!-- Content here -->
            </div>
        `;
        return page;
    }

    async destroy() {
        // Cleanup
    }
}
```

2. **Register Route** (`src/Application/Bootstrap/RouteConfiguration.js`):

```javascript
import { MyPage } from '../../Presentation/Pages/MyPage.js';

export function registerRoutes(container, router) {
    // ... existing routes

    router.addRoute('/my-page', async () => {
        const myPage = new MyPage({
            container,
            eventBus: container.get('eventBus'),
            logger: container.get('logger')
        });
        return myPage;
    });
}
```

3. **Add Navigation Link** (`NavigationComponent.js`):

```javascript
{ path: '/my-page', label: 'My Page', icon: '📄' }
```

### Testing

```javascript
// Component tests (example)
import { describe, it, expect, beforeEach } from 'your-test-framework';
import { MyComponent } from './MyComponent.js';

describe('MyComponent', () => {
    let container, component;

    beforeEach(() => {
        container = document.createElement('div');
        component = new MyComponent({
            container,
            data: [{ name: 'Test' }]
        });
    });

    it('should render data', () => {
        component.mount();
        expect(container.querySelector('.item')).toBeTruthy();
    });

    it('should update on new props', () => {
        component.mount();
        component.update({ data: [{ name: 'New' }] });
        expect(container.textContent).toContain('New');
    });
});
```

## 🔄 Migration from Legacy Code

### Backward Compatibility

The app includes a `LegacyAdapter` that bridges old and new code:

**Exposed Legacy API:**
```javascript
// Global API for legacy code
window.app.showService.getAllShows();
window.app.musicService.playTrack(trackId);
window.app.scheduleService.getSchedule();
```

**Event Bridges:**
- Legacy DOM events are translated to EventBus events
- Modern EventBus events are exposed as DOM events
- Seamless communication between old and new code

### Migration Strategy

1. **Keep both versions running** - `app.html` (new) and `index.html` (legacy)
2. **Test thoroughly** - Verify all features work in new version
3. **User acceptance** - Let users test `app.html` before switching
4. **Gradual rollout** - Redirect `index.html` → `app.html` after testing
5. **Remove legacy** - Delete old files after 30-day grace period

## 🐛 Troubleshooting

### Common Issues

**App won't load:**
- Check browser console for errors
- Ensure `server.py` is running for data files
- Try clearing localStorage: `localStorage.clear()`
- Check network tab for failed requests

**Music won't play:**
- YouTube iframe API needs internet connection
- Check browser console for YouTube errors
- Try refreshing the page
- Clear browser cache

**Shows not appearing:**
- Verify `data/shows.json` is accessible
- Check localStorage for data: `localStorage.getItem('anime_shows')`
- Try re-importing from MAL
- Check network tab for 404 errors

**Import not working:**
- Ensure proxy server is running (`server.py`)
- Check MAL username is correct
- Look for CORS errors in console
- MAL page structure may have changed (update scraper)

### Debug Mode

Enable debug logging:
```javascript
localStorage.setItem('debug', 'true');
```

Access DI container in console:
```javascript
window.__container.get('showManagementService');
```

View all registered services:
```javascript
window.__container.keys();
```

## 📋 Roadmap

### Completed ✅
- Modern architecture with Clean Architecture principles
- Component-based UI system
- Global persistent music player
- YouTube video/playlist import
- Infinite scroll pagination
- Streaming site management
- Volume control with persistence
- Filter-aware music navigation
- Backward compatibility layer

### In Progress 🔄
- E2E testing suite
- Performance optimizations
- Mobile responsiveness improvements

### Planned 🎯
- PWA support (offline functionality)
- Dark/Light theme switcher
- Keyboard shortcuts
- Export to CSV/Excel
- Anilist integration
- Push notifications for new episodes
- Watch history tracking
- Recommendation engine

## � Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- **[Documentation Index](docs/README.md)** - Complete documentation overview
- **[Roadmaps](docs/roadmaps/)** - Project strategy and phase plans
- **[Phase Summaries](docs/phase-summaries/)** - Completion reports for each phase
- **[Guides](docs/guides/)** - User and developer guides
- **[Analysis](docs/analysis/)** - Technical analysis and fixes

### Quick Links
- [Modernization Roadmap](docs/roadmaps/MODERNIZATION_ROADMAP.md) - Overall architecture plan
- [Phase 7 Completion](docs/phase-summaries/PHASE7_COMPLETION_SUMMARY.md) - Latest phase details
- [YouTube Import Guide](docs/guides/YOUTUBE_IMPORT_GUIDE.md) - Import music from YouTube
- [Final Report](docs/FINAL_COMPLETION_REPORT.md) - Project completion overview

## �📄 License

MIT License - feel free to use this project as you wish.

## 🤝 Contributing

Contributions welcome! Please follow the established architecture patterns:
1. Domain logic in `src/Domain/`
2. Use cases in `src/Application/`
3. UI components in `src/Presentation/`
4. Follow SOLID principles
5. Add tests for new features
6. Update documentation in `docs/`

## 📞 Support

For issues and questions:
- Check the [Troubleshooting](#-troubleshooting) section above
- Review [documentation](docs/README.md)
- Review browser console errors
- Check existing issues on GitHub
- Create a new issue with details

---

Built with ❤️ for anime fans and music lovers
