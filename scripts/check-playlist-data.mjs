import mysql from 'mysql2/promise';
import 'dotenv/config';

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'myplayground_dev'
};

async function main() {
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);

        const [playlists] = await connection.execute('SELECT * FROM playlists LIMIT 3');

        console.log('Playlists data:');
        playlists.forEach((p, i) => {
            console.log(`\nPlaylist ${i + 1}:`, p.name);
            console.log('  song_ids type:', typeof p.song_ids);
            console.log('  song_ids value:', p.song_ids);
            console.log('  song_ids length:', p.song_ids?.length);
            console.log('  First 100 chars:', p.song_ids?.substring(0, 100));
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

main();
