// Enhanced Admin Routes
import express from 'express';
import { protect, adminOnly } from '../middleware/auth-middleware.js';
import { 
    getAllBranches, getBranchById, createBranch, updateBranch, deleteBranch,
    getBranchInventory, updateBranchInventory, getLowStockAlerts 
} from '../controllers/branch-controller.js';
import {
    getEnhancedProducts, createEnhancedProduct, updateEnhancedProduct,
    bulkUpdateProducts, bulkDeleteProducts, getProductAnalytics
} from '../controllers/enhanced-product-controller.js';
import {
    getEnhancedOrders, updateEnhancedOrderStatus, modifyOrderItems,
    getOrderHistory, bulkUpdateOrderStatus, exportOrders, getOrderAnalytics
} from '../controllers/enhanced-order-controller.js';
import {
    getAllUsers, createEnhancedUser, updateEnhancedUser, updateUserRole, updateUserStatus,
    getAllUserGroups, createUserGroup, updateUserGroup, deleteUserGroup,
    bulkUpdateUsers, getAccessLogs, getUserAnalytics
} from '../controllers/enhanced-user-controller.js';
import {
    getDashboardAnalytics, getSalesReport, getInventoryReport,
    getUserActivityReport, getFinancialReport, trackEvent, getEventAnalytics
} from '../controllers/analytics-controller.js';

const router = express.Router();

// ============= BRANCH MANAGEMENT =============
router.get('/branches', protect, adminOnly, getAllBranches);
router.get('/branches/:id', protect, adminOnly, getBranchById);
router.post('/branches', protect, adminOnly, createBranch);
router.put('/branches/:id', protect, adminOnly, updateBranch);
router.delete('/branches/:id', protect, adminOnly, deleteBranch);

router.get('/branches/inventory', protect, adminOnly, getBranchInventory);
router.put('/branches/inventory', protect, adminOnly, updateBranchInventory);
router.get('/branches/low-stock-alerts', protect, adminOnly, getLowStockAlerts);

// ============= ENHANCED PRODUCTS =============
router.get('/products/enhanced', protect, adminOnly, getEnhancedProducts);
router.post('/products/enhanced', protect, adminOnly, createEnhancedProduct);
router.put('/products/enhanced/:id', protect, adminOnly, updateEnhancedProduct);

router.post('/products/bulk-update', protect, adminOnly, bulkUpdateProducts);
router.delete('/products/bulk-delete', protect, adminOnly, bulkDeleteProducts);
router.get('/products/analytics', protect, adminOnly, getProductAnalytics);

// ============= ENHANCED ORDERS =============
router.get('/orders/enhanced', protect, adminOnly, getEnhancedOrders);
router.put('/orders/enhanced/:id/status', protect, adminOnly, updateEnhancedOrderStatus);
router.put('/orders/enhanced/:id/items', protect, adminOnly, modifyOrderItems);
router.get('/orders/:id/history', protect, adminOnly, getOrderHistory);

router.post('/orders/bulk-update-status', protect, adminOnly, bulkUpdateOrderStatus);
router.get('/orders/export', protect, adminOnly, exportOrders);
router.get('/orders/analytics', protect, adminOnly, getOrderAnalytics);

// ============= ENHANCED USERS =============
router.get('/users/enhanced', protect, adminOnly, getAllUsers);
router.post('/users/enhanced', protect, adminOnly, createEnhancedUser);
router.put('/users/enhanced/:id', protect, adminOnly, updateEnhancedUser);
router.put('/users/:id/role', protect, adminOnly, updateUserRole);
router.put('/users/:id/status', protect, adminOnly, updateUserStatus);

// User Groups
router.get('/user-groups', protect, adminOnly, getAllUserGroups);
router.post('/user-groups', protect, adminOnly, createUserGroup);
router.put('/user-groups/:id', protect, adminOnly, updateUserGroup);
router.delete('/user-groups/:id', protect, adminOnly, deleteUserGroup);

// Bulk Operations
router.post('/users/bulk-update', protect, adminOnly, bulkUpdateUsers);

// Access Logs
router.get('/access-logs', protect, adminOnly, getAccessLogs);
router.get('/users/analytics', protect, adminOnly, getUserAnalytics);

// ============= ANALYTICS & REPORTING =============
router.get('/analytics/dashboard', protect, adminOnly, getDashboardAnalytics);
router.get('/analytics/sales', protect, adminOnly, getSalesReport);
router.get('/analytics/inventory', protect, adminOnly, getInventoryReport);
router.get('/analytics/user-activity', protect, adminOnly, getUserActivityReport);
router.get('/analytics/financial', protect, adminOnly, getFinancialReport);

// Event Tracking
router.post('/analytics/events', trackEvent); // Public endpoint for tracking
router.get('/analytics/events', protect, adminOnly, getEventAnalytics);

export default router;
