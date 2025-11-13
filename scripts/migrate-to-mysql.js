/**
 * Migration Script: JSON to MySQL
 * Migrates data from JSON files to MySQL database
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectionManager } from '../src/Infrastructure/Database/ConnectionManager.js';
import { MySQLShowRepository } from '../src/Infrastructure/Repositories/MySQLShowRepository.js';
import { MySQLMusicRepository } from '../src/Infrastructure/Repositories/MySQLMusicRepository.js';
import { Show } from '../src/Domain/Models/Show.js';
import { Music } from '../src/Domain/Models/Music.js';
import { logger } from '../src/Core/Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data file paths
const DATA_DIR = path.join(__dirname, '../data');
const SHOWS_FILE = path.join(DATA_DIR, 'shows.json');
const SONGS_FILE = path.join(DATA_DIR, 'songs.json');
const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json');

// Default user ID (dev user from schema)
const DEFAULT_USER_ID = 1;

class MigrationScript {
    constructor() {
        this.showRepository = new MySQLShowRepository(DEFAULT_USER_ID);
        this.musicRepository = new MySQLMusicRepository(DEFAULT_USER_ID);
        this.stats = {
            shows: { total: 0, migrated: 0, failed: 0 },
            songs: { total: 0, migrated: 0, failed: 0 },
            playlists: { total: 0, migrated: 0, failed: 0 }
        };
        this.failedShows = [];
        this.failedSongs = [];
    }

    /**
     * Run full migration
     */
    async run() {
        console.log('='.repeat(60));
        console.log('Starting Data Migration: JSON to MySQL');
        console.log('='.repeat(60));
        console.log();

        try {
            // Initialize connection
            await connectionManager.initialize();
            console.log('✓ Database connection established');
            console.log();

            // Migrate shows
            await this.migrateShows();
            console.log();

            // Migrate songs
            await this.migrateSongs();
            console.log();

            // Migrate playlists
            await this.migratePlaylists();
            console.log();

            // Print summary
            this.printSummary();

            // Save failed items report
            await this.saveFailedItemsReport();

            // Close connection
            await connectionManager.close();
            console.log('✓ Database connection closed');

            process.exit(0);
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            logger.error('Migration failed', { error: error.message, stack: error.stack });
            process.exit(1);
        }
    }

    /**
     * Migrate shows from JSON to MySQL
     */
    async migrateShows() {
        console.log('Migrating Shows...');
        console.log('-'.repeat(60));

        try {
            // Read shows JSON
            const showsData = await this.readJsonFile(SHOWS_FILE);
            this.stats.shows.total = showsData.length;

            console.log(`Found ${showsData.length} shows to migrate`);

            // Migrate each show
            for (const showData of showsData) {
                try {
                    // Convert numeric ID to string (Show model requires string ID)
                    // Also convert numeric titles to strings (e.g., 86 -> "86")
                    const showDataWithStringId = {
                        ...showData,
                        id: String(showData.id),
                        title: String(showData.title),
                        title_english: showData.title_english ? String(showData.title_english) : null,
                        title_japanese: showData.title_japanese ? String(showData.title_japanese) : null
                    };

                    // Create Show model
                    const show = new Show(showDataWithStringId);

                    // Save to database
                    await this.showRepository.save(show);

                    this.stats.shows.migrated++;
                    process.stdout.write(`\rMigrated: ${this.stats.shows.migrated}/${this.stats.shows.total}`);
                } catch (error) {
                    this.stats.shows.failed++;
                    this.failedShows.push({
                        id: showData.id,
                        title: showData.title,
                        error: error.message,
                        data: showData
                    });
                    logger.error('Failed to migrate show', {
                        showId: showData.id,
                        title: showData.title,
                        error: error.message,
                        stack: error.stack
                    });
                }
            }

            console.log('\n✓ Shows migration complete');
        } catch (error) {
            console.error('❌ Failed to migrate shows:', error.message);
            throw error;
        }
    }

    /**
     * Migrate songs from JSON to MySQL
     */
    async migrateSongs() {
        console.log('Migrating Songs...');
        console.log('-'.repeat(60));

        try {
            // Read songs JSON
            const songsData = await this.readJsonFile(SONGS_FILE);
            this.stats.songs.total = songsData.length;

            console.log(`Found ${songsData.length} songs to migrate`);

            // Migrate each song
            for (const songData of songsData) {
                try {
                    // Create Music model
                    const music = new Music(songData);

                    // Save to database
                    await this.musicRepository.save(music);

                    this.stats.songs.migrated++;
                    process.stdout.write(`\rMigrated: ${this.stats.songs.migrated}/${this.stats.songs.total}`);
                } catch (error) {
                    this.stats.songs.failed++;
                    logger.error('Failed to migrate song', {
                        songId: songData.id,
                        title: songData.title,
                        error: error.message
                    });
                }
            }

            console.log('\n✓ Songs migration complete');
        } catch (error) {
            console.error('❌ Failed to migrate songs:', error.message);
            throw error;
        }
    }

    /**
     * Migrate playlists from JSON to MySQL
     */
    async migratePlaylists() {
        console.log('Migrating Playlists...');
        console.log('-'.repeat(60));

        try {
            // Read playlists JSON
            const playlistsData = await this.readJsonFile(PLAYLISTS_FILE);
            this.stats.playlists.total = playlistsData.length;

            console.log(`Found ${playlistsData.length} playlists to migrate`);

            // Migrate each playlist
            for (const playlist of playlistsData) {
                try {
                    const sql = `
                        INSERT INTO playlists (id, user_id, name, description, song_ids, cover_image)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            name = VALUES(name),
                            description = VALUES(description),
                            song_ids = VALUES(song_ids),
                            cover_image = VALUES(cover_image)
                    `;

                    await connectionManager.query(sql, [
                        playlist.playlistId || playlist.id,
                        DEFAULT_USER_ID,
                        playlist.playlistName || playlist.name,
                        playlist.description || '',
                        JSON.stringify(playlist.videoIds || playlist.songs || []),
                        playlist.coverImage || null
                    ]);

                    this.stats.playlists.migrated++;
                    process.stdout.write(`\rMigrated: ${this.stats.playlists.migrated}/${this.stats.playlists.total}`);
                } catch (error) {
                    this.stats.playlists.failed++;
                    logger.error('Failed to migrate playlist', {
                        playlistId: playlist.playlistId || playlist.id,
                        name: playlist.playlistName || playlist.name,
                        error: error.message
                    });
                }
            }

            console.log('\n✓ Playlists migration complete');
        } catch (error) {
            console.error('❌ Failed to migrate playlists:', error.message);
            throw error;
        }
    }

    /**
     * Read and parse JSON file
     * @param {string} filePath - Path to JSON file
     * @returns {Promise<Array>}
     */
    async readJsonFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            // Handle both array and object formats
            if (Array.isArray(data)) {
                return data;
            }

            // If it's an object, check for common array properties
            if (data.shows) return data.shows;
            if (data.songs) return data.songs;
            if (data.playlists) return data.playlists;
            if (data.items) return data.items;
            if (data.data) return data.data;

            // Otherwise return empty array
            return [];
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`⚠ File not found: ${filePath}`);
                return [];
            }
            throw error;
        }
    }

    /**
     * Print migration summary
     */
    printSummary() {
        console.log('='.repeat(60));
        console.log('Migration Summary');
        console.log('='.repeat(60));
        console.log();

        console.log('Shows:');
        console.log(`  Total:    ${this.stats.shows.total}`);
        console.log(`  Migrated: ${this.stats.shows.migrated}`);
        console.log(`  Failed:   ${this.stats.shows.failed}`);
        console.log();

        console.log('Songs:');
        console.log(`  Total:    ${this.stats.songs.total}`);
        console.log(`  Migrated: ${this.stats.songs.migrated}`);
        console.log(`  Failed:   ${this.stats.songs.failed}`);
        console.log();

        console.log('Playlists:');
        console.log(`  Total:    ${this.stats.playlists.total}`);
        console.log(`  Migrated: ${this.stats.playlists.migrated}`);
        console.log(`  Failed:   ${this.stats.playlists.failed}`);
        console.log();

        const totalItems = this.stats.shows.total + this.stats.songs.total + this.stats.playlists.total;
        const totalMigrated = this.stats.shows.migrated + this.stats.songs.migrated + this.stats.playlists.migrated;
        const totalFailed = this.stats.shows.failed + this.stats.songs.failed + this.stats.playlists.failed;

        console.log('Overall:');
        console.log(`  Total:    ${totalItems}`);
        console.log(`  Migrated: ${totalMigrated}`);
        console.log(`  Failed:   ${totalFailed}`);
        console.log(`  Success:  ${((totalMigrated / totalItems) * 100).toFixed(1)}%`);
        console.log();

        if (totalFailed > 0) {
            console.log('⚠ Some items failed to migrate. Check logs for details.');
        } else {
            console.log('✓ All items migrated successfully!');
        }
    }

    /**
     * Save failed items report to file
     */
    async saveFailedItemsReport() {
        if (this.failedShows.length === 0 && this.failedSongs.length === 0) {
            return;
        }

        const reportPath = path.join(__dirname, '../migration-failures.json');
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFailed: this.failedShows.length + this.failedSongs.length,
                failedShows: this.failedShows.length,
                failedSongs: this.failedSongs.length
            },
            shows: this.failedShows,
            songs: this.failedSongs
        };

        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📝 Failed items report saved to: ${reportPath}`);
    }
}

// Run migration
const migration = new MigrationScript();
migration.run();
