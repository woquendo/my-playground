import mysql from 'mysql2/promise';

const passwords = ['', 'root', 'admin', 'password'];

for (const pwd of passwords) {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: pwd,
            database: 'myplayground_dev'
        });
        
        console.log('SUCCESS! Password is:', pwd);
        
        // Get playlists
        const [playlists] = await connection.query(
            'SELECT id, name, user_id, song_ids FROM playlists WHERE user_id = 3'
        );
        console.log(`\nPlaylists for user 3 (${playlists.length} found):`);
        playlists.forEach(p => {
            const songIds = p.song_ids ? JSON.parse(p.song_ids) : [];
            console.log(`  - ${p.name} (${songIds.length} songs)`);
        });
        
        // Get sample songs
        const [songs] = await connection.query(
            'SELECT id, title, artist, youtube_url, spotify_url, type FROM songs WHERE user_id = 3 LIMIT 3'
        );
        console.log(`\nSample songs (${songs.length} found):`);
        songs.forEach(s => {
            console.log(`  - ${s.title} by ${s.artist}`);
            console.log(`    Type: ${s.type || 'Unknown'}`);
            console.log(`    YouTube: ${s.youtube_url || 'None'}`);
            console.log(`    Spotify: ${s.spotify_url || 'None'}`);
        });
        
        await connection.end();
        break;
    } catch (error) {
        if (!error.message.includes('Access denied')) {
            console.error('Error with password:', pwd, error.message);
        }
    }
}
