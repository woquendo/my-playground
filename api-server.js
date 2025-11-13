/**
 * Backend API Server
 * Express server providing REST API for MySQL database operations
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectionManager } from './src/Infrastructure/Database/ConnectionManager.js';
import { AuthService } from './src/Application/Services/AuthService.js';
import { MySQLShowRepository } from './src/Infrastructure/Repositories/MySQLShowRepository.js';
import { MySQLMusicRepository } from './src/Infrastructure/Repositories/MySQLMusicRepository.js';
import { logger } from './src/Core/Logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8000',
    credentials: true
}));
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const authService = new AuthService({ connectionManager, logger });
        const user = authService.verifyToken(token);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Initialize database connection
await connectionManager.initialize();
logger.info('Database connection established');

// ===========================
// Auth Routes
// ===========================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const authService = new AuthService({ connectionManager, logger });
        const result = await authService.register({ username, email, password });
        res.json(result);
    } catch (error) {
        logger.error('Registration failed', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const authService = new AuthService({ connectionManager, logger });
        const result = await authService.login(username, password);
        res.json(result);
    } catch (error) {
        logger.error('Login failed', { error: error.message });
        res.status(401).json({ error: error.message });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const authService = new AuthService({ connectionManager, logger });
        const profile = await authService.getUserProfile(req.user.userId);
        res.json(profile);
    } catch (error) {
        logger.error('Get profile failed', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

// ===========================
// Shows Routes
// ===========================

app.get('/api/shows', authenticateToken, async (req, res) => {
    try {
        const repository = new MySQLShowRepository({ connectionManager, logger });
        repository.userId = req.user.userId;

        const { status, day, search } = req.query;

        let shows;
        if (status) {
            shows = await repository.findByStatus(status);
        } else if (day) {
            shows = await repository.findByDay(day);
        } else if (search) {
            shows = await repository.search(search);
        } else {
            shows = await repository.findAll();
        }

        res.json(shows);
    } catch (error) {
        logger.error('Get shows failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/shows/:id', authenticateToken, async (req, res) => {
    try {
        const repository = new MySQLShowRepository({ connectionManager, logger });
        repository.userId = req.user.userId;

        const show = await repository.findById(parseInt(req.params.id));

        if (!show) {
            return res.status(404).json({ error: 'Show not found' });
        }

        res.json(show);
    } catch (error) {
        logger.error('Get show failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/shows', authenticateToken, async (req, res) => {
    try {
        const repository = new MySQLShowRepository({ connectionManager, logger });
        repository.userId = req.user.userId;

        const show = await repository.create(req.body);
        res.status(201).json(show);
    } catch (error) {
        logger.error('Create show failed', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/shows/:id', authenticateToken, async (req, res) => {
    try {
        const repository = new MySQLShowRepository({ connectionManager, logger });
        repository.userId = req.user.userId;

        const show = await repository.update(parseInt(req.params.id), req.body);

        if (!show) {
            return res.status(404).json({ error: 'Show not found' });
        }

        res.json(show);
    } catch (error) {
        logger.error('Update show failed', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/shows/:id', authenticateToken, async (req, res) => {
    try {
        const repository = new MySQLShowRepository({ connectionManager, logger });
        repository.userId = req.user.userId;

        const success = await repository.delete(parseInt(req.params.id));

        if (!success) {
            return res.status(404).json({ error: 'Show not found' });
        }

        res.status(204).send();
    } catch (error) {
        logger.error('Delete show failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ===========================
// Music Routes
// ===========================

app.get('/api/music', authenticateToken, async (req, res) => {
    try {
        const repository = new MySQLMusicRepository({ connectionManager, logger });
        repository.userId = req.user.userId;

        const { type, playlist, search, favorites } = req.query;

        let songs;
        if (favorites === 'true') {
            songs = await repository.findFavorites();
        } else if (type) {
            songs = await repository.findByType(type);
        } else if (playlist) {
            songs = await repository.findByPlaylist(parseInt(playlist));
        } else if (search) {
            songs = await repository.search(search);
        } else {
            songs = await repository.findAll();
        }

        res.json(songs);
    } catch (error) {
        logger.error('Get music failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/music', authenticateToken, async (req, res) => {
    try {
        const repository = new MySQLMusicRepository({ connectionManager, logger });
        repository.userId = req.user.userId;

        const song = await repository.create(req.body);
        res.status(201).json(song);
    } catch (error) {
        logger.error('Create song failed', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/music/:id', authenticateToken, async (req, res) => {
    try {
        const repository = new MySQLMusicRepository({ connectionManager, logger });
        repository.userId = req.user.userId;

        const song = await repository.update(parseInt(req.params.id), req.body);

        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        res.json(song);
    } catch (error) {
        logger.error('Update song failed', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/music/:id', authenticateToken, async (req, res) => {
    try {
        const repository = new MySQLMusicRepository({ connectionManager, logger });
        repository.userId = req.user.userId;

        const success = await repository.delete(parseInt(req.params.id));

        if (!success) {
            return res.status(404).json({ error: 'Song not found' });
        }

        res.status(204).send();
    } catch (error) {
        logger.error('Delete song failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ===========================
// Admin Routes
// ===========================

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [users] = await connectionManager.query(
            'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(users);
    } catch (error) {
        logger.error('Get users failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        await connectionManager.query(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, parseInt(req.params.id)]
        );
        res.json({ success: true });
    } catch (error) {
        logger.error('Update user role failed', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [usersCount] = await connectionManager.query('SELECT COUNT(*) as count FROM users');
        const [showsCount] = await connectionManager.query('SELECT COUNT(*) as count FROM shows');
        const [songsCount] = await connectionManager.query('SELECT COUNT(*) as count FROM songs');
        const [migrations] = await connectionManager.query(
            'SELECT * FROM schema_migrations ORDER BY executed_at DESC'
        );

        res.json({
            users: usersCount[0].count,
            shows: showsCount[0].count,
            songs: songsCount[0].count,
            migrations
        });
    } catch (error) {
        logger.error('Get stats failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const healthy = await connectionManager.isHealthy();
        res.json({ status: healthy ? 'ok' : 'error', database: healthy });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    logger.info(`API server running on port ${PORT}`);
    console.log(`API server running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing server...');
    await connectionManager.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing server...');
    await connectionManager.close();
    process.exit(0);
});
