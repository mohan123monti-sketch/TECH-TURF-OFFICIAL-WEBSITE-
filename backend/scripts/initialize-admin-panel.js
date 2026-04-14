// Admin Panel Initialization Script
// Run this script to initialize all enhanced admin features

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'backend/database/database.sqlite');

async function initializeAdminPanel() {
    console.log('=== Initializing Enhanced Admin Panel ===');
    
    try {
        // Open database connection
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });
        
        console.log('Database connected successfully');
        
        // Read and execute enhanced schema
        const schemaPath = path.resolve(process.cwd(), 'backend/database/enhanced-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Executing enhanced database schema...');
        
        // Split schema into individual statements and execute
        const statements = schema.split(';').filter(stmt => stmt.trim());
        let executedStatements = 0;
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await db.exec(statement);
                    executedStatements++;
                } catch (error) {
                    // Ignore errors for statements that might already exist
                    if (!error.message.includes('already exists')) {
                        console.warn('Warning:', error.message);
                    }
                }
            }
        }
        
        console.log(`Executed ${executedStatements} database statements`);
        
        // Verify tables were created
        const tables = [
            'branches', 'product_branch_inventory', 'order_history', 'user_groups',
            'user_group_memberships', 'access_logs', 'system_settings',
            'email_templates', 'scheduled_tasks', 'analytics_events',
            'promo_codes', 'suppliers', 'purchase_orders', 'purchase_order_items',
            'support_tickets', 'support_ticket_responses', 'knowledge_base',
            'media_library'
        ];
        
        console.log('Verifying database tables...');
        let verifiedTables = 0;
        
        for (const table of tables) {
            try {
                const result = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`  ${table}: OK (${result.count} records)`);
                verifiedTables++;
            } catch (error) {
                console.log(`  ${table}: ERROR - ${error.message}`);
            }
        }
        
        console.log(`Verified ${verifiedTables}/${tables.length} tables`);
        
        // Create sample data if needed
        const sampleDataCheck = await db.get('SELECT COUNT(*) as count FROM branches');
        
        if (sampleDataCheck.count === 0) {
            console.log('Creating sample data...');
            
            // Sample branches
            await db.exec(`
                INSERT INTO branches (name, address, phone, email, manager_name, status) VALUES
                ('Main Branch', '123 Tech Street, Mumbai', '+91-9876543210', 'main@techturf.com', 'John Doe', 'active'),
                ('Branch 2', '456 Innovation Road, Bangalore', '+91-9876543211', 'branch2@techturf.com', 'Jane Smith', 'active'),
                ('Branch 3', '789 Digital Avenue, Delhi', '+91-9876543212', 'branch3@techturf.com', 'Mike Johnson', 'inactive')
            `);
            
            // Sample analytics events
            const events = [];
            for (let i = 0; i < 50; i++) {
                const eventType = ['page_view', 'user_action', 'system_event'][Math.floor(Math.random() * 3)];
                const userId = Math.floor(Math.random() * 5) + 1 || null;
                const sessionId = `session_${Math.floor(Math.random() * 20)}`;
                const metadata = JSON.stringify({ 
                    timestamp: new Date().toISOString(),
                    source: 'admin_panel'
                });
                
                events.push(`( '${eventType}', ${userId}, '${sessionId}', 'admin', 1, '${metadata}' )`);
            }
            
            await db.exec(`
                INSERT INTO analytics_events (event_type, user_id, session_id, resource_type, resource_id, metadata)
                VALUES ${events.join(', ')}
            `);
            
            console.log('Sample data created successfully');
        }
        
        // Close database connection
        await db.close();
        
        console.log('\n=== Admin Panel Initialization Complete ===');
        console.log('Enhanced admin features are now ready!');
        console.log('Access the admin panel at: http://localhost:3601/admin/index.html');
        console.log('Run the complete test at: http://localhost:3601/admin/admin-panel-complete-test.html');
        
        return true;
        
    } catch (error) {
        console.error('Initialization failed:', error);
        return false;
    }
}

// Run initialization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    initializeAdminPanel().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export default initializeAdminPanel;
