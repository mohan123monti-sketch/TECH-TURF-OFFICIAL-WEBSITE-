// System Settings Routes
import express from 'express';
import { protect, adminOnly } from '../middleware/auth-middleware.js';
import {
    getSystemSettings,
    updateSystemSettings,
    testEmailConfiguration,
    createBackup,
    clearSystemCache,
    restartSystem,
    exportSystemLogs,
    getSystemHealth
} from '../controllers/system-settings-controller.js';

const router = express.Router();

// Get system settings
router.get('/', protect, adminOnly, getSystemSettings);

// Update system settings
router.put('/', protect, adminOnly, updateSystemSettings);

// Test email configuration
router.post('/test-email', protect, adminOnly, testEmailConfiguration);

// Create backup
router.post('/create-backup', protect, adminOnly, createBackup);

// Clear system cache
router.post('/clear-cache', protect, adminOnly, clearSystemCache);

// Restart system
router.post('/restart-system', protect, adminOnly, restartSystem);

// Export system logs
router.get('/export-logs', protect, adminOnly, exportSystemLogs);

// Get system health
router.get('/health', protect, adminOnly, getSystemHealth);

export default router;
