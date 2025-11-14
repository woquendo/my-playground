import mysql from 'mysql2/promise';

const passwords = ['N@twork99!', '', 'root', 'admin', 'password'];
let connection = null;

// Try to connect with different passwords
for (const pwd of passwords) {
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: pwd,
            database: 'myplayground_dev'
        });
        console.log(`✓ Connected to database (password: '${pwd || '(empty)'}')\n`);
        break;
    } catch (error) {
        if (!error.message.includes('Access denied')) {
            console.error(`✗ Error with password '${pwd}':`, error.message);
            process.exit(1);
        }
    }
}

if (!connection) {
    console.error('✗ Could not connect to database with any password');
    process.exit(1);
}

try {
    // Check for woquendo_admin user
    console.log('='.repeat(60));
    console.log('CHECKING USER: woquendo_admin');
    console.log('='.repeat(60));

    const [users] = await connection.query(
        'SELECT id, username, email, role, created_at FROM users WHERE username = ?',
        ['woquendo_admin']
    );

    if (users.length > 0) {
        console.log('✓ User found:');
        console.log(JSON.stringify(users[0], null, 2));
    } else {
        console.log('✗ User NOT found');

        // Show all users
        console.log('\nAll users in database:');
        const [allUsers] = await connection.query(
            'SELECT id, username, email, role FROM users'
        );
        console.table(allUsers);
    }

    // Check songs with URLs
    console.log('\n' + '='.repeat(60));
    console.log('CHECKING SONGS WITH URLs');
    console.log('='.repeat(60));

    const [songStats] = await connection.query(`
        SELECT 
            COUNT(*) as total_songs,
            SUM(CASE WHEN youtube_url IS NOT NULL THEN 1 ELSE 0 END) as has_youtube,
            SUM(CASE WHEN spotify_url IS NOT NULL THEN 1 ELSE 0 END) as has_spotify,
            SUM(CASE WHEN apple_music_url IS NOT NULL THEN 1 ELSE 0 END) as has_apple,
            SUM(CASE WHEN youtube_url IS NULL AND spotify_url IS NULL AND apple_music_url IS NULL THEN 1 ELSE 0 END) as has_no_url
        FROM songs
    `);

    console.log('Song URL Statistics:');
    console.table(songStats);

    // Check specific song mentioned in error
    console.log('\n' + '='.repeat(60));
    console.log('CHECKING: Call of The Night Opening');
    console.log('='.repeat(60));

    const [specificSong] = await connection.query(
        `SELECT id, title, artist, youtube_url, spotify_url, apple_music_url, type
         FROM songs 
         WHERE title LIKE '%Call of The Night%' 
         AND title LIKE '%Opening%'`
    );

    if (specificSong.length > 0) {
        console.log('Song found:');
        specificSong.forEach(song => {
            console.log(`\nTitle: ${song.title}`);
            console.log(`Artist: ${song.artist}`);
            console.log(`Type: ${song.type}`);
            console.log(`YouTube URL: ${song.youtube_url || '(null)'}`);
            console.log(`Spotify URL: ${song.spotify_url || '(null)'}`);
            console.log(`Apple Music URL: ${song.apple_music_url || '(null)'}`);
        });
    } else {
        console.log('Song NOT found');
    }

    // Sample songs with URLs
    console.log('\n' + '='.repeat(60));
    console.log('SAMPLE SONGS (first 5 with YouTube URLs)');
    console.log('='.repeat(60));

    const [sampleSongs] = await connection.query(
        'SELECT id, title, artist, youtube_url FROM songs WHERE youtube_url IS NOT NULL LIMIT 5'
    );

    sampleSongs.forEach((song, index) => {
        console.log(`\n${index + 1}. ${song.title} by ${song.artist}`);
        console.log(`   URL: ${song.youtube_url.substring(0, 60)}...`);
    });

} catch (error) {
    console.error('Error querying database:', error.message);
} finally {
    await connection.end();
    console.log('\n✓ Database connection closed');
}
