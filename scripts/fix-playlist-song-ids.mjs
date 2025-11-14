/**
 * Fix Playlist Song IDs Migration Script
 * 
 * Problem: Playlists table song_ids column contains YouTube video IDs,
 * but songs table uses slugified IDs. This causes playlists to not match songs.
 * 
 * Solution: Extract YouTube video ID from each song's youtube_url,
 * then update playlist song_ids to use database song IDs instead of YouTube IDs.
 */

import mysql from 'mysql2/promise';
import 'dotenv/config';

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'myplayground_dev'
};

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url) {
    if (!url) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}

async function main() {
    console.log('🔧 Starting Playlist Song IDs Migration...\n');

    let connection;
    try {
        // Connect to database
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✓ Connected to database\n');

        // Step 1: Get all songs with their YouTube URLs
        console.log('Step 1: Fetching all songs...');
        const [songs] = await connection.execute(
            'SELECT id, title, youtube_url FROM songs WHERE youtube_url IS NOT NULL'
        );
        console.log(`✓ Found ${songs.length} songs with YouTube URLs\n`);

        // Step 2: Build mapping of YouTube ID -> Database Song ID
        console.log('Step 2: Building YouTube ID to Database ID mapping...');
        const youtubeIdToDbId = new Map();
        let mappedCount = 0;

        for (const song of songs) {
            const youtubeId = extractYouTubeId(song.youtube_url);
            if (youtubeId) {
                youtubeIdToDbId.set(youtubeId, song.id);
                mappedCount++;
            }
        }

        console.log(`✓ Mapped ${mappedCount} YouTube IDs to database IDs\n`);

        if (mappedCount < 5) {
            console.log('Sample mappings:');
            for (const [ytId, dbId] of Array.from(youtubeIdToDbId.entries()).slice(0, 5)) {
                console.log(`  ${ytId} → ${dbId}`);
            }
            console.log();
        }

        // Step 3: Get all playlists
        console.log('Step 3: Fetching playlists...');
        const [playlists] = await connection.execute(
            'SELECT id, name, song_ids, user_id FROM playlists'
        );
        console.log(`✓ Found ${playlists.length} playlists\n`);

        // Step 4: Update each playlist's song_ids
        console.log('Step 4: Updating playlist song_ids...');
        let updatedPlaylists = 0;
        let totalSongsMapped = 0;
        let totalSongsUnmapped = 0;

        for (const playlist of playlists) {
            // mysql2 automatically parses JSON columns, so song_ids is already an array
            const oldSongIds = Array.isArray(playlist.song_ids) ? playlist.song_ids : [];
            const newSongIds = [];
            const unmappedIds = [];

            console.log(`\nProcessing playlist: "${playlist.name}" (${oldSongIds.length} songs)`);

            for (const youtubeId of oldSongIds) {
                const dbId = youtubeIdToDbId.get(youtubeId);
                if (dbId) {
                    newSongIds.push(dbId);
                    totalSongsMapped++;
                } else {
                    unmappedIds.push(youtubeId);
                    totalSongsUnmapped++;
                }
            }

            console.log(`  ✓ Mapped: ${newSongIds.length} songs`);
            if (unmappedIds.length > 0) {
                console.log(`  ⚠ Unmapped: ${unmappedIds.length} songs (YouTube IDs not found in database)`);
                console.log(`    Unmapped IDs: ${unmappedIds.slice(0, 3).join(', ')}${unmappedIds.length > 3 ? '...' : ''}`);
            }

            // Update the playlist with new song_ids (JSON.stringify for MySQL JSON column)
            if (newSongIds.length > 0) {
                await connection.execute(
                    'UPDATE playlists SET song_ids = ?, song_count = ? WHERE id = ?',
                    [JSON.stringify(newSongIds), newSongIds.length, playlist.id]
                );
                updatedPlaylists++;
                console.log(`  ✓ Updated playlist in database`);
            }
        } console.log('\n' + '='.repeat(60));
        console.log('Migration Summary:');
        console.log('='.repeat(60));
        console.log(`Total playlists processed: ${playlists.length}`);
        console.log(`Playlists updated: ${updatedPlaylists}`);
        console.log(`Total songs mapped: ${totalSongsMapped}`);
        console.log(`Total songs unmapped: ${totalSongsUnmapped}`);
        console.log('='.repeat(60));

        if (totalSongsUnmapped > 0) {
            console.log('\n⚠️  Warning: Some songs could not be mapped.');
            console.log('This typically means those songs are not in the database yet.');
            console.log('You may need to import those songs first.\n');
        } else {
            console.log('\n✅ All songs successfully mapped!\n');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('✓ Database connection closed');
        }
    }
}

main();
