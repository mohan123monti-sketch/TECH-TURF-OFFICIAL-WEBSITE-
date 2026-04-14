import express from 'express';
import { 
    getMetrics, addMetric, getEvents, addEvent, getStats,
    getRealtimeStats, executeCommand, getPm2List, getLogData,
    getServiceHealth, getPresetCommands, runPresetCommand
} from '../controllers/system-controller.js';
import { adminOnly, protect } from '../middleware/auth-middleware.js';

const router = express.Router();

// Existing routes
router.get('/metrics', protect, getMetrics);
router.post('/metrics', protect, addMetric);
router.get('/events', protect, getEvents);
router.post('/events', protect, addEvent);
router.get('/stats', protect, getStats);

// New Dashboard routes
router.get('/realtime-stats', protect, getRealtimeStats);
router.get('/service-health', protect, getServiceHealth);
router.get('/preset-commands', protect, getPresetCommands);
router.post('/run-command', protect, adminOnly, runPresetCommand);

router.get('/pm2-list', protect, getPm2List);
router.get('/logs', protect, getLogData);
router.post('/command', protect, adminOnly, executeCommand);

export default router;
