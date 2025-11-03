// Configuration and constants
export const STORAGE_KEY = 'shows_songs_data_v1';
export const JIKAN_BASE = 'https://api.jikan.moe/v4';

export const fallbackData = {
    shows: [
        { title: "Summer Festival", date: "2025-07-15", location: "NYC", description: "Outdoor performance at Central Park." },
        { title: "Autumn Tour", date: "2025-10-01", location: "Chicago", description: "Acoustic set at the Lakeside Theater." }
    ],
    songs: [
        { title: "Morning Light", artist: "The Skylines", youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        { title: "Midnight Run", artist: "The Skylines", youtube: "https://www.youtube.com/watch?v=kXYiU_JCYtU" }
    ],
    titles: {}
};

export const statusMap = {
    '1': 'watching',
    '2': 'completed',
    '3': 'on_hold',
    '4': 'dropped',
    '6': 'plan_to_watch'
};