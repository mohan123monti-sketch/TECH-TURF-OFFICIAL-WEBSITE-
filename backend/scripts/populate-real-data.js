// Populate Real Data for Admin Panel
// This script creates realistic sample data for all enhanced features

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'backend/database/database.sqlite');

async function populateRealData() {
    console.log('=== Populating Real Data for Admin Panel ===');
    
    try {
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });
        
        // Clear existing sample data
        console.log('Clearing existing sample data...');
        await db.exec('DELETE FROM analytics_events');
        await db.exec('DELETE FROM branches');
        await db.exec('DELETE FROM user_groups');
        await db.exec('DELETE FROM user_group_memberships');
        await db.exec('DELETE FROM product_branch_inventory');
        await db.exec('DELETE FROM order_history');
        
        // Get existing users and products
        const users = await db.all('SELECT id, name, email, role FROM users LIMIT 10');
        const products = await db.all('SELECT id, name, price, stock FROM products LIMIT 20');
        
        console.log(`Found ${users.length} users and ${products.length} products`);
        
        // Create realistic branches
        console.log('Creating branches...');
        const branches = [
            {
                name: 'Mumbai Headquarters',
                address: '123 Tech Street, Andheri West, Mumbai - 400053',
                phone: '+91-22-1234-5678',
                email: 'mumbai@techturf.com',
                manager_name: 'Rajesh Kumar',
                status: 'active'
            },
            {
                name: 'Bangalore Tech Hub',
                address: '456 Innovation Road, Whitefield, Bangalore - 560066',
                phone: '+91-80-9876-5432',
                email: 'bangalore@techturf.com',
                manager_name: 'Priya Sharma',
                status: 'active'
            },
            {
                name: 'Delhi Operations',
                address: '789 Digital Avenue, Nehru Place, Delhi - 110019',
                phone: '+91-11-2468-1357',
                email: 'delhi@techturf.com',
                manager_name: 'Amit Singh',
                status: 'active'
            },
            {
                name: 'Hyderabad Branch',
                address: '321 Cyber City, Hitech City, Hyderabad - 500081',
                phone: '+91-40-1357-2468',
                email: 'hyderabad@techturf.com',
                manager_name: 'Sneha Reddy',
                status: 'inactive'
            }
        ];
        
        for (const branch of branches) {
            await db.run(`
                INSERT INTO branches (name, address, phone, email, manager_name, status)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [branch.name, branch.address, branch.phone, branch.email, branch.manager_name, branch.status]);
        }
        
        const insertedBranches = await db.all('SELECT id, name FROM branches');
        console.log(`Created ${insertedBranches.length} branches`);
        
        // Create user groups
        console.log('Creating user groups...');
        const userGroups = [
            {
                name: 'Super Administrators',
                description: 'Full system access with all permissions',
                permissions: JSON.stringify(['users.view', 'users.edit', 'users.delete', 'products.view', 'products.edit', 'products.delete', 'orders.view', 'orders.edit', 'orders.delete', 'analytics.view', 'settings.edit', 'branches.view', 'branches.edit'])
            },
            {
                name: 'Branch Managers',
                description: 'Manage branch operations and inventory',
                permissions: JSON.stringify(['products.view', 'products.edit', 'orders.view', 'orders.edit', 'analytics.view', 'branches.view'])
            },
            {
                name: 'Sales Team',
                description: 'Manage orders and customer interactions',
                permissions: JSON.stringify(['products.view', 'orders.view', 'orders.edit', 'analytics.view'])
            },
            {
                name: 'Inventory Staff',
                description: 'Manage product inventory and stock',
                permissions: JSON.stringify(['products.view', 'products.edit', 'analytics.view'])
            },
            {
                name: 'Support Staff',
                description: 'Handle customer support and inquiries',
                permissions: JSON.stringify(['orders.view', 'analytics.view'])
            }
        ];
        
        for (const group of userGroups) {
            await db.run(`
                INSERT INTO user_groups (name, description, permissions, status)
                VALUES (?, ?, ?, 'active')
            `, [group.name, group.description, group.permissions]);
        }
        
        const insertedGroups = await db.all('SELECT id, name FROM user_groups');
        console.log(`Created ${insertedGroups.length} user groups`);
        
        // Assign users to groups
        console.log('Assigning users to groups...');
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            let groupId;
            
            if (user.role === 'admin' || user.role === 'superadmin') {
                groupId = insertedGroups.find(g => g.name === 'Super Administrators')?.id;
            } else if (i % 3 === 0) {
                groupId = insertedGroups.find(g => g.name === 'Branch Managers')?.id;
            } else if (i % 3 === 1) {
                groupId = insertedGroups.find(g => g.name === 'Sales Team')?.id;
            } else {
                groupId = insertedGroups.find(g => g.name === 'Inventory Staff')?.id;
            }
            
            if (groupId) {
                await db.run(`
                    INSERT INTO user_group_memberships (user_id, group_id, assigned_by)
                    VALUES (?, ?, ?)
                `, [user.id, groupId, users[0].id]); // First user assigns others
            }
        }
        
        // Create realistic product-branch inventory
        console.log('Creating product-branch inventory...');
        for (const product of products) {
            for (const branch of insertedBranches) {
                const stock = Math.floor(Math.random() * 100) + 10; // 10-110 units
                const reorderLevel = Math.floor(stock * 0.2); // 20% of stock
                
                await db.run(`
                    INSERT OR REPLACE INTO product_branch_inventory 
                    (product_id, branch_id, stock_quantity, reorder_level, last_updated)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                `, [product.id, branch.id, stock, reorderLevel]);
            }
        }
        
        // Create realistic analytics events
        console.log('Creating analytics events...');
        const eventTypes = ['page_view', 'user_action', 'system_event', 'product_view', 'order_placed', 'login', 'logout'];
        const resourceTypes = ['product', 'order', 'user', 'branch', 'system', 'dashboard'];
        
        for (let i = 0; i < 500; i++) {
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
            const userId = users[Math.floor(Math.random() * users.length)]?.id || null;
            const sessionId = `session_${Math.floor(Math.random() * 100)}`;
            const resourceId = Math.floor(Math.random() * products.length) + 1 || null;
            
            // Create realistic timestamp within last 30 days
            const daysAgo = Math.floor(Math.random() * 30);
            const hoursAgo = Math.floor(Math.random() * 24);
            const minutesAgo = Math.floor(Math.random() * 60);
            const eventTime = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000) - (minutesAgo * 60 * 1000));
            
            const metadata = JSON.stringify({
                ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                duration: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
                source: 'admin_panel'
            });
            
            await db.run(`
                INSERT INTO analytics_events 
                (event_type, user_id, session_id, resource_type, resource_id, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [eventType, userId, sessionId, resourceType, resourceId, metadata, eventTime.toISOString()]);
        }
        
        // Create order history for existing orders
        console.log('Creating order history...');
        const orders = await db.all('SELECT id, status FROM orders LIMIT 50');
        
        for (const order of orders) {
            const historyEvents = [];
            let currentStatus = 'Pending';
            
            // Simulate order lifecycle
            historyEvents.push({
                order_id: order.id,
                action: 'order_created',
                previous_status: null,
                new_status: 'Pending',
                user_id: users[0]?.id,
                notes: 'Order placed by customer',
                created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
            });
            
            if (Math.random() > 0.3) { // 70% chance order progressed
                historyEvents.push({
                    order_id: order.id,
                    action: 'status_changed',
                    previous_status: 'Pending',
                    new_status: 'Processing',
                    user_id: users[Math.floor(Math.random() * users.length)]?.id,
                    notes: 'Order confirmed and processing started',
                    created_at: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000).toISOString()
                });
            }
            
            if (Math.random() > 0.5) { // 50% chance order delivered
                historyEvents.push({
                    order_id: order.id,
                    action: 'status_changed',
                    previous_status: 'Processing',
                    new_status: 'Delivered',
                    user_id: users[Math.floor(Math.random() * users.length)]?.id,
                    notes: 'Order successfully delivered',
                    created_at: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString()
                });
            }
            
            for (const event of historyEvents) {
                await db.run(`
                    INSERT INTO order_history 
                    (order_id, action, previous_status, new_status, user_id, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [event.order_id, event.action, event.previous_status, event.new_status, event.user_id, event.notes, event.created_at]);
            }
        }
        
        // Create access logs
        console.log('Creating access logs...');
        const actions = ['login', 'logout', 'page_access', 'api_call', 'data_export'];
        
        for (let i = 0; i < 200; i++) {
            const userId = users[Math.floor(Math.random() * users.length)]?.id;
            const action = actions[Math.floor(Math.random() * actions.length)];
            const resource = ['dashboard', 'products', 'orders', 'users', 'analytics', 'settings'][Math.floor(Math.random() * 6)];
            const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`;
            const success = Math.random() > 0.1; // 90% success rate
            const logTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
            
            await db.run(`
                INSERT INTO access_logs 
                (user_id, action, resource, ip_address, user_agent, success, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, action, resource, ipAddress, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', success, logTime.toISOString()]);
        }
        
        await db.close();
        
        console.log('\n=== Real Data Population Complete ===');
        console.log('✅ Branches:', insertedBranches.length);
        console.log('✅ User Groups:', insertedGroups.length);
        console.log('✅ Product-Branch Inventory:', products.length * insertedBranches.length);
        console.log('✅ Analytics Events:', 500);
        console.log('✅ Order History:', orders.length * 2);
        console.log('✅ Access Logs:', 200);
        console.log('\nAdmin panel now has realistic data for testing!');
        
        return true;
        
    } catch (error) {
        console.error('Data population failed:', error);
        return false;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    populateRealData().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export default populateRealData;
