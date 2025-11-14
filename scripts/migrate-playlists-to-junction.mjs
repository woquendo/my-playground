/**
 * Migrate Playlists to Junction Table
 * 
 * Converts playlists.song_ids JSON array to playlist_songs junction table
 * This provides better scalability, performance, and relational integrity
 */

import mysql from 'mysql2/promise';
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'myplayground_dev',
    multipleStatements: true
};

async function main() {
    console.log('🔧 Migrating Playlists to Junction Table...\n');

    let connection;
    try {
        // Connect to database
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✓ Connected to database\n');

        // Step 1: Create playlist_songs junction table
        console.log('Step 1: Creating playlist_songs junction table...');
        const migrationSQL = await fs.readFile(
            path.join(__dirname, '..', 'database', 'migrations', '20251114000001_add_playlist_songs_junction_table.sql'),
            'utf8'
        );
        await connection.query(migrationSQL);
        console.log('✓ Junction table created\n');

        // Step 2: Get all playlists with their song_ids
        console.log('Step 2: Fetching existing playlists...');
        const [playlists] = await connection.execute(
            'SELECT id, name, song_ids, user_id FROM playlists'
        );
        console.log(`✓ Found ${playlists.length} playlists\n`);

        // Step 3: Migrate each playlist's songs to junction table
        console.log('Step 3: Migrating playlist songs...');
        let totalSongs = 0;
        let totalPlaylists = 0;

        for (const playlist of playlists) {
            const songIds = Array.isArray(playlist.song_ids) ? playlist.song_ids : [];

            if (songIds.length === 0) {
                console.log(`  ⚠ Playlist "${playlist.name}" has no songs, skipping...`);
                continue;
            }

            console.log(`\nProcessing playlist: "${playlist.name}" (${songIds.length} songs)`);

            // Insert songs into junction table with position
            for (let i = 0; i < songIds.length; i++) {
                const songId = songIds[i];
                const position = i + 1;

                try {
                    await connection.execute(
                        `INSERT INTO playlist_songs (playlist_id, song_id, position) 
                         VALUES (?, ?, ?)
                         ON DUPLICATE KEY UPDATE position = VALUES(position)`,
                        [playlist.id, songId, position]
                    );
                    totalSongs++;
                } catch (error) {
                    // Handle foreign key constraint violations (song doesn't exist)
                    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                        console.log(`    ⚠ Song ID "${songId}" not found in database, skipping...`);
                    } else {
                        throw error;
                    }
                }
            }

            totalPlaylists++;
            console.log(`  ✓ Migrated ${songIds.length} songs to junction table`);
        }

        // Step 4: Verify migration
        console.log('\nStep 4: Verifying migration...');
        const [junctionCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM playlist_songs'
        );
        console.log(`✓ Junction table contains ${junctionCount[0].count} playlist-song associations\n`);

        // Step 5: Display summary
        console.log('='.repeat(60));
        console.log('Migration Summary:');
        console.log('='.repeat(60));
        console.log(`Playlists migrated: ${totalPlaylists}`);
        console.log(`Total songs migrated: ${totalSongs}`);
        console.log(`Junction table records: ${junctionCount[0].count}`);
        console.log('='.repeat(60));

        // Step 6: Show sample data
        console.log('\nSample junction table data:');
        const [sample] = await connection.execute(`
            SELECT ps.id, p.name as playlist_name, s.title as song_title, ps.position
            FROM playlist_songs ps
            JOIN playlists p ON ps.playlist_id = p.id
            JOIN songs s ON ps.song_id = s.id
            ORDER BY ps.playlist_id, ps.position
            LIMIT 5
        `);
        console.table(sample);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Update MySQLMusicRepository to query playlist_songs junction table');
        console.log('   2. Test playlist functionality in the application');
        console.log('   3. Once verified, the song_ids column can be removed from playlists table\n');

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
