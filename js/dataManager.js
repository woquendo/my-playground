// Data loading and storage management
import { STORAGE_KEY, fallbackData } from './config.js';

export function saveLocalData(obj) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
        console.warn('Could not save to localStorage', e);
    }
}

export function loadLocalData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('Could not read localStorage', e);
        return null;
    }
}

export function downloadJSON(obj, filename = 'shows_songs.json') {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export async function fetchLocalOrRemote(onDataUpdate) {
    // Try to load from localStorage first
    const local = loadLocalData();

    try {
        // Fetch fresh data from server
        const [showsRes, songsRes, updatesRes, titlesRes] = await Promise.all([
            fetch('./data/shows.json?t=' + Date.now()),
            fetch('./data/songs.json?t=' + Date.now()),
            fetch('./data/schedule_updates.json?t=' + Date.now()).catch(() => ({ ok: false })),
            fetch('./data/titles.json?t=' + Date.now()).catch(() => ({ ok: false }))
        ]);

        if (!showsRes.ok || !songsRes.ok) {
            console.warn('Data load failed:',
                !showsRes.ok ? await showsRes.text() : '',
                !songsRes.ok ? await songsRes.text() : '');
            throw new Error('Failed to load required data');
        }

        // Parse JSON responses
        const [showsData, songsData] = await Promise.all([
            showsRes.json(),
            songsRes.json()
        ]);
        const updatesData = updatesRes.ok ? await updatesRes.json() : { updates: {} };
        const titlesData = titlesRes.ok ? await titlesRes.json() : {};
        console.log('Loaded data:', { shows: showsData, songs: songsData, updates: updatesData, titles: titlesData });

        // Ensure we have the correct data structure
        const packaged = {
            shows: showsData && showsData.shows ? showsData.shows : (Array.isArray(showsData) ? showsData : []),
            songs: songsData && songsData.songs ? songsData.songs : (Array.isArray(songsData) ? songsData : []),
            titles: titlesData
        };

        // Apply schedule updates from file
        packaged.shows.forEach(show => {
            if (updatesData.updates && updatesData.updates[show.id] !== undefined) {
                const update = updatesData.updates[show.id];
                if (typeof update === 'number') {
                    // Legacy format: just custom air day
                    if (update >= 0 && update <= 6) {
                        show.custom_air_day = update;
                    }
                } else if (typeof update === 'object') {
                    // New format: object with multiple properties
                    if (typeof update.custom_air_day === 'number' && update.custom_air_day >= 0 && update.custom_air_day <= 6) {
                        show.custom_air_day = update.custom_air_day;
                    }
                    if (typeof update.custom_start_date === 'string' && /^(\d{2})-(\d{2})-(\d{2})$/.test(update.custom_start_date)) {
                        show.custom_start_date = update.custom_start_date;
                    }
                    if (typeof update.custom_episodes === 'number' && update.custom_episodes > 0) {
                        show.custom_episodes = update.custom_episodes;
                    }
                    if (typeof update.skipped_weeks === 'number' && update.skipped_weeks >= 0) {
                        show.skipped_weeks = update.skipped_weeks;
                    }
                }
            }
        });

        // Local schedule updates are handled by applyScheduleUpdates in scheduleManager.js

        const localStr = local ? JSON.stringify(local) : null;
        const pkgStr = JSON.stringify(packaged);

        // Save and return new data if it's different from local
        if (!local || localStr !== pkgStr) {
            saveLocalData(packaged);
            if (onDataUpdate) onDataUpdate(packaged);
            return packaged;
        }

        // Return existing local data if it matches
        return local;
    } catch (err) {
        console.warn('Could not fetch JSON files — using local or fallback data.', err);
        // Use local data if available, otherwise fallback
        const fallbackContent = local || fallbackData;
        if (onDataUpdate) onDataUpdate(fallbackContent);
        return fallbackContent;
    }
}

export async function saveTitlesToServer(titles) {
    const res = await fetch('/save-titles', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(titles)
    });

    if (!res.ok) {
        throw new Error('Failed to save titles to file');
    }

    return res.json();
}