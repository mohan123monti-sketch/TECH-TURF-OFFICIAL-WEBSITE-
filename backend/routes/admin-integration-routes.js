// Admin Integration Routes
import express from 'express';
import { protect, adminOnly } from '../middleware/auth-middleware.js';
import {
    initializeDatabase,
    testTable,
    getAdminDashboardData,
    getSystemStatus,
    createSampleData,
    getSystemLogs
} from '../controllers/admin-integration-controller.js';

const router = express.Router();

// Initialize enhanced database schema
router.post('/init-database', protect, adminOnly, initializeDatabase);

// Test table existence
router.get('/test-table/:tableName', protect, adminOnly, testTable);

// Get comprehensive admin dashboard data
router.get('/dashboard-data', protect, adminOnly, getAdminDashboardData);

// Get system status
router.get('/system-status', protect, adminOnly, getSystemStatus);

// Create sample data for testing
router.post('/create-sample-data', protect, adminOnly, createSampleData);

// Get system logs
router.get('/system-logs', protect, adminOnly, getSystemLogs);

export default router;
