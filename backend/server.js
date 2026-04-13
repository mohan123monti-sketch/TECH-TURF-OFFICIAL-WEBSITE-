import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initDatabase } from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Routes Imports
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import personaRoutes from './routes/personaRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import websiteRoutes from './routes/websiteRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3601';

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [];

// Allow Chrome's Private Network Access (public HTTPS page → private/loopback backend)
app.use((req, res, next) => {
    if (req.headers['access-control-request-private-network']) {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server requests (no origin), all localhost, and configured origins
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0) return callback(null, true); // dev: allow all
        const isAllowed =
            allowedOrigins.includes(origin) ||
            /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
            /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
            /\.pages\.dev$/.test(origin) ||
            /^https?:\/\/([a-z0-9-]+\.)?techturfofficial\.com(:\d+)?$/.test(origin);
        callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    },
    credentials: true
}));
app.use(express.json());

// Initialize Database and Attach to Request
let db;
try {
    db = await initDatabase();
    console.log('Database connected and verified.');
} catch (error) {
    console.error('CRITICAL ERROR: Failed to initialize database!', error);
    process.exit(1);
}

app.use((req, res, next) => {
    req.db = db;
    next();
});

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes); // Alias for compatibility with official site
app.use('/api/employees', employeeRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/brandpilot', brandRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin/stats', statsRoutes); // Map for frontend dashboard compatibility
app.use('/api/admin', statsRoutes); // General admin mapping
app.use('/api', websiteRoutes); // Products, Orders, Promos, Announcements, Media
app.use('/uploads', express.static('uploads'));

// Health Check
app.get('/', (req, res) => {
    res.json({ message: 'Tech Turf Unified Backend is running...' });
});

// Convenience redirects for local development when frontend routes are opened on backend port.
app.get(['/admin', '/admin/*', '/pages', '/pages/*'], (req, res) => {
    try {
        const targetUrl = new URL(`${FRONTEND_BASE_URL}${req.originalUrl}`);
        const requestOrigin = `${req.protocol}://${req.get('host')}`;
        const targetOrigin = targetUrl.origin;

        // Guard against self-redirect loops when FRONTEND_BASE_URL is set to backend origin.
        if (requestOrigin === targetOrigin) {
            return res.status(409).json({
                message: 'Frontend redirect target points to backend origin, causing redirect loop.',
                hint: 'Set FRONTEND_BASE_URL to your frontend host, e.g. http://localhost:3601',
                frontendUrl: `http://localhost:3601${req.originalUrl}`
            });
        }

        return res.redirect(302, `${FRONTEND_BASE_URL}${req.originalUrl}`);
    } catch {
        return res.redirect(302, `http://localhost:3601${req.originalUrl}`);
    }
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || '*' }
});

// Socket.io for Real-time Updates
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected'));
});

// Attach io to app for use in controllers
app.set('io', io);

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
