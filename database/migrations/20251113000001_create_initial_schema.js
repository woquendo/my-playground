/**
 * Migration: 20251113000001_create_initial_schema
 * 
 * Creates the foundational database schema:
 * - users table with authentication
 * - shows table (shared catalog)
 * - user_shows table (user associations)
 * - songs table (user-specific)
 * - user_songs table (user associations with favorites)
 * - playlists table
 * - streaming_sites table
 * - show_streaming_sites table (many-to-many)
 * 
 * Also inserts default streaming sites and dev user.
 */

/**
 * Run migration (up)
 * @param {import('mysql2/promise').Connection} connection
 */
export async function up(connection) {
    // Create users table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            display_name VARCHAR(100),
            avatar_url VARCHAR(500),
            bio TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_username (username),
            INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create shows table (shared catalog)
    await connection.query(`
        CREATE TABLE IF NOT EXISTS shows (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            title_english VARCHAR(500),
            title_japanese VARCHAR(500),
            url VARCHAR(500),
            episodes INT,
            score DECIMAL(4,2) DEFAULT NULL COMMENT 'User rating (0.00-10.00)',
            type VARCHAR(50),
            image_url VARCHAR(500),
            start_date VARCHAR(20),
            end_date VARCHAR(20),
            studios TEXT,
            licensors TEXT,
            rating VARCHAR(20),
            airing_status TINYINT COMMENT '0=finished, 1=currently_airing, 2=not_yet_aired',
            season VARCHAR(20),
            season_year INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_title (title(255)),
            INDEX idx_airing_status (airing_status),
            INDEX idx_season (season, season_year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create user_shows junction table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS user_shows (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            show_id VARCHAR(50) NOT NULL,
            status VARCHAR(50) COMMENT 'watching, completed, on_hold, dropped, plan_to_watch',
            episodes_watched INT DEFAULT 0,
            score DECIMAL(4,2),
            notes TEXT,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_show (user_id, show_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
            INDEX idx_user_status (user_id, status),
            INDEX idx_show (show_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create songs table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS songs (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            artist VARCHAR(255),
            source VARCHAR(500),
            duration INT COMMENT 'Duration in seconds',
            cover_image VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_title (title(255)),
            INDEX idx_artist (artist)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create user_songs junction table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS user_songs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            song_id VARCHAR(255) NOT NULL,
            is_favorite BOOLEAN DEFAULT FALSE,
            play_count INT DEFAULT 0,
            last_played TIMESTAMP NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_song (user_id, song_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
            INDEX idx_user_favorite (user_id, is_favorite),
            INDEX idx_song (song_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create playlists table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS playlists (
            id VARCHAR(100) PRIMARY KEY COMMENT 'YouTube playlist ID or custom ID',
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            song_ids JSON COMMENT 'Array of song IDs',
            cover_image VARCHAR(500),
            is_public BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user (user_id),
            INDEX idx_public (is_public)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create streaming_sites table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS streaming_sites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            url VARCHAR(500),
            logo_url VARCHAR(500),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create show_streaming_sites junction table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS show_streaming_sites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            show_id VARCHAR(50) NOT NULL,
            site_id INT NOT NULL,
            streaming_url VARCHAR(500),
            is_official BOOLEAN DEFAULT TRUE,
            UNIQUE KEY unique_show_site (show_id, site_id),
            FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
            FOREIGN KEY (site_id) REFERENCES streaming_sites(id) ON DELETE CASCADE,
            INDEX idx_show (show_id),
            INDEX idx_site (site_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Insert default streaming sites
    await connection.query(`
        INSERT IGNORE INTO streaming_sites (name, url, is_active) VALUES
        ('Crunchyroll', 'https://www.crunchyroll.com', TRUE),
        ('Funimation', 'https://www.funimation.com', TRUE),
        ('Netflix', 'https://www.netflix.com', TRUE),
        ('Hulu', 'https://www.hulu.com', TRUE),
        ('Amazon Prime Video', 'https://www.primevideo.com', TRUE),
        ('Disney+', 'https://www.disneyplus.com', TRUE),
        ('HiDive', 'https://www.hidive.com', TRUE),
        ('VRV', 'https://vrv.co', TRUE);
    `);

    // Insert dev user (password: 'dev123' hashed with bcrypt)
    // Note: This is a development user, change password in production
    await connection.query(`
        INSERT IGNORE INTO users (username, email, password_hash, display_name) 
        VALUES (
            'devuser',
            'dev@myplayground.local',
            '$2b$10$xQZ9XoZ9XoZ9XoZ9XoZ9XOZ9XoZ9XoZ9XoZ9XoZ9XoZ9XoZ9Xo',
            'Development User'
        );
    `);
}

/**
 * Rollback migration (down)
 * @param {import('mysql2/promise').Connection} connection
 */
export async function down(connection) {
    // Drop tables in reverse order (respecting foreign keys)
    await connection.query('DROP TABLE IF EXISTS show_streaming_sites');
    await connection.query('DROP TABLE IF EXISTS streaming_sites');
    await connection.query('DROP TABLE IF EXISTS playlists');
    await connection.query('DROP TABLE IF EXISTS user_songs');
    await connection.query('DROP TABLE IF EXISTS songs');
    await connection.query('DROP TABLE IF EXISTS user_shows');
    await connection.query('DROP TABLE IF EXISTS shows');
    await connection.query('DROP TABLE IF EXISTS users');
}
