import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../database/database.sqlite');

export async function initDatabase() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.run('PRAGMA foreign_keys = ON');

    // Create Tables
    const schemaSql = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            username TEXT,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            google_id TEXT UNIQUE,
            role TEXT DEFAULT 'user',
            avatar TEXT,
            bio TEXT,
            phone TEXT,
            company_name TEXT,
            two_factor_enabled BOOLEAN DEFAULT 0,
            backup_codes TEXT, -- Comma separated backup codes
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            position TEXT,
            department TEXT,
            salary REAL,
            joining_date DATE,
            bio TEXT,
            skills TEXT, -- JSON string
            social_links TEXT, -- JSON string
            profile_image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            companyName TEXT,
            clientType TEXT DEFAULT 'company',
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            alternateContact TEXT,
            preferredCommunication TEXT DEFAULT 'email',
            city TEXT,
            state TEXT,
            country TEXT,
            address TEXT,
            industry TEXT,
            website TEXT,
            companySize TEXT,
            about TEXT,
            serviceRequested TEXT,
            projectIdea TEXT,
            detailedRequirement TEXT,
            projectPurpose TEXT,
            estimatedBudget TEXT,
            budgetRange TEXT,
            expectedDeadline DATE,
            urgencyLevel TEXT DEFAULT 'normal',
            leadSource TEXT,
            referredBy TEXT,
            status TEXT DEFAULT 'new',
            priorityLevel TEXT DEFAULT 'medium',
            assignedManagerId INTEGER,
            communicationLog TEXT, -- JSON string
            ndaRequired BOOLEAN DEFAULT 0,
            agreementSigned BOOLEAN DEFAULT 0,
            permissionToShowcase BOOLEAN DEFAULT 1,
            analyticalData TEXT, -- JSON string
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assignedManagerId) REFERENCES employees(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            user_id INTEGER, -- Manager
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            start_date DATE,
            end_date DATE,
            budget REAL DEFAULT 0,
            revenue REAL DEFAULT 0,
            priority TEXT DEFAULT 'medium',
            tags TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER, -- Assigned To
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'todo',
            priority TEXT DEFAULT 'medium',
            due_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            date DATE NOT NULL,
            status TEXT DEFAULT 'absent',
            checkIn TEXT,
            checkOut TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS system_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT,
            target TEXT,
            message TEXT,
            severity TEXT DEFAULT 'info',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS system_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            value REAL NOT NULL,
            unit TEXT,
            status TEXT,
            metadata TEXT, -- JSON string
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            amount REAL NOT NULL,
            type TEXT NOT NULL, -- income/expense
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS brands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            industry TEXT,
            description TEXT,
            tone TEXT,
            voiceArchetype TEXT,
            values_text TEXT,
            keywords TEXT,
            bannedWords TEXT,
            audience TEXT,
            logo_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            objective TEXT,
            status TEXT DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS campaign_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL,
            platform TEXT NOT NULL,
            content TEXT,
            headline TEXT,
            hashtags TEXT,
            imagePrompt TEXT,
            generatedImage TEXT,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS brand_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            n8nWebhookUrl TEXT,
            zapierWebhookUrl TEXT,
            enableN8n BOOLEAN DEFAULT 0,
            enableZapier BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS personas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            role TEXT,
            age TEXT,
            traits TEXT,
            painPoints TEXT,
            demographics TEXT,
            psychographics TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS planner_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            category TEXT,
            priority TEXT,
            deadline TEXT,
            status TEXT,
            isStarred BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS subtasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            FOREIGN KEY (task_id) REFERENCES planner_tasks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            parentGoalId INTEGER,
            progress REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS health_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            sleepHours REAL NOT NULL,
            workoutDone BOOLEAN DEFAULT 0,
            mood INTEGER NOT NULL,
            energy INTEGER NOT NULL,
            studyHours REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reflections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            text TEXT NOT NULL,
            wins TEXT, -- JSON string
            blockers TEXT, -- JSON string
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS planner_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            startTime TEXT NOT NULL,
            endTime TEXT NOT NULL,
            activity TEXT NOT NULL,
            day TEXT NOT NULL,
            color TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT, -- JSON string
            isPinned BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            start_date DATETIME NOT NULL,
            end_date DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ai_chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS otp_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            otp TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 0,
            category TEXT,
            image_url TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            items TEXT NOT NULL, -- JSON string
            totalPrice REAL NOT NULL,
            status TEXT DEFAULT 'Pending',
            paymentMethod TEXT,
            shippingAddress TEXT,
            itemsPrice REAL DEFAULT 0,
            taxPrice REAL DEFAULT 0,
            shippingPrice REAL DEFAULT 0,
            promoCode TEXT,
            discountAmount REAL DEFAULT 0,
            deliverySlot TEXT,
            orderNotes TEXT,
            giftMessage TEXT,
            isPaid BOOLEAN DEFAULT 0,
            isDelivered BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS user_addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            label TEXT DEFAULT 'Saved',
            address TEXT NOT NULL,
            addressLine2 TEXT,
            city TEXT NOT NULL,
            state TEXT,
            postalCode TEXT,
            country TEXT DEFAULT 'India',
            phone TEXT,
            company TEXT,
            gstin TEXT,
            isDefault BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_payment_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            paymentMethod TEXT,
            billingName TEXT,
            billingAddress1 TEXT,
            billingAddress2 TEXT,
            billingCity TEXT,
            billingState TEXT,
            billingPincode TEXT,
            billingCountry TEXT DEFAULT 'India',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_carts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            cart TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_wishlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            items TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_compares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            items TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS promos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            type TEXT DEFAULT 'percentage', -- percentage or fixed
            value REAL NOT NULL,
            minOrder REAL DEFAULT 0,
            expiryDate DATE,
            isActive BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT DEFAULT 'info', -- info, success, warning, error
            status TEXT DEFAULT 'active',
            priority TEXT DEFAULT 'medium',
            notifyUsers BOOLEAN DEFAULT 1,
            startDate DATETIME,
            endDate DATETIME,
            pages TEXT, -- Comma separated pages
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            mimetype TEXT,
            size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS blog_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            tags TEXT,
            imageUrl TEXT,
            status TEXT DEFAULT 'draft',
            author_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS launches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            missionName TEXT NOT NULL,
            rocketName TEXT,
            launchDate DATE,
            status TEXT DEFAULT 'scheduled',
            missionSummary TEXT,
            telemetryData TEXT,
            launchSite TEXT,
            payloadDescription TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            message TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'Open',
            userEmail TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            preferences TEXT DEFAULT '{}',
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS product_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            user_id INTEGER,
            rating INTEGER NOT NULL,
            comment TEXT,
            helpful INTEGER DEFAULT 0,
            verified BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );
    `;

    // Execute schema statements individually for better compatibility across SQLite builds.
    const schemaStatements = schemaSql
        .split(/;\s*\n/)
        .map(stmt => stmt.trim())
        .filter(Boolean);
    for (const stmt of schemaStatements) {
        await db.exec(`${stmt};`);
    }

    // Add safety columns for legacy support
    try { await db.run('ALTER TABLE users ADD COLUMN avatar TEXT'); } catch (e) { }
    try { await db.run('ALTER TABLE users ADD COLUMN bio TEXT'); } catch (e) { }
    try { await db.run('ALTER TABLE users ADD COLUMN username TEXT'); } catch (e) { }
    try { await db.run('ALTER TABLE users ADD COLUMN phone TEXT'); } catch (e) { }
    try { await db.run('ALTER TABLE users ADD COLUMN company_name TEXT'); } catch (e) { }
    try { await db.run('ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT 0'); } catch (e) { }
    try { await db.run('ALTER TABLE users ADD COLUMN backup_codes TEXT'); } catch (e) { }
    try { await db.run('ALTER TABLE user_addresses ADD COLUMN addressLine2 TEXT'); } catch (e) { }
    try { await db.run('ALTER TABLE orders ADD COLUMN itemsPrice REAL DEFAULT 0'); } catch (e) { }
    try { await db.run('ALTER TABLE orders ADD COLUMN taxPrice REAL DEFAULT 0'); } catch (e) { }
    try { await db.run('ALTER TABLE orders ADD COLUMN shippingPrice REAL DEFAULT 0'); } catch (e) { }
    try { await db.run('ALTER TABLE orders ADD COLUMN promoCode TEXT'); } catch (e) { }
    try { await db.run('ALTER TABLE orders ADD COLUMN discountAmount REAL DEFAULT 0'); } catch (e) { }
    try { await db.run('ALTER TABLE orders ADD COLUMN deliverySlot TEXT'); } catch (e) { }
    try { await db.run('ALTER TABLE orders ADD COLUMN orderNotes TEXT'); } catch (e) { }
    try { await db.run('ALTER TABLE orders ADD COLUMN giftMessage TEXT'); } catch (e) { }
    try { await db.run("CREATE TABLE IF NOT EXISTS user_carts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE NOT NULL, cart TEXT DEFAULT '[]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)"); } catch (e) { }
    try { await db.run("CREATE TABLE IF NOT EXISTS user_wishlists (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE NOT NULL, items TEXT DEFAULT '[]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)"); } catch (e) { }
    try { await db.run("CREATE TABLE IF NOT EXISTS user_compares (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE NOT NULL, items TEXT DEFAULT '[]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)"); } catch (e) { }
    try { await db.run("CREATE TABLE IF NOT EXISTS newsletter_subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, preferences TEXT DEFAULT '{}', status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"); } catch (e) { }
    try { await db.run('CREATE TABLE IF NOT EXISTS product_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, user_id INTEGER, rating INTEGER NOT NULL, comment TEXT, helpful INTEGER DEFAULT 0, verified BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL, FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE)'); } catch (e) { }
    try { await db.run("ALTER TABLE announcements ADD COLUMN priority TEXT DEFAULT 'medium'"); } catch (e) { }
    try { await db.run('ALTER TABLE announcements ADD COLUMN notifyUsers BOOLEAN DEFAULT 1'); } catch (e) { }
    try { await db.run("UPDATE products SET image_url = REPLACE(image_url, '\\\\', '/') WHERE image_url LIKE '%\\\\%'"); } catch (e) { }
    try { await db.run("CREATE TABLE IF NOT EXISTS translations (id INTEGER PRIMARY KEY AUTOINCREMENT, language_code TEXT UNIQUE NOT NULL, translations TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"); } catch (e) { }
    
    // Enhanced Products Management Tables
    try { await db.run("ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'active'"); } catch (e) { }
    try { await db.run("ALTER TABLE products ADD COLUMN branch TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE products ADD COLUMN sku TEXT UNIQUE"); } catch (e) { }
    try { await db.run("ALTER TABLE products ADD COLUMN weight REAL"); } catch (e) { }
    try { await db.run("ALTER TABLE products ADD COLUMN dimensions TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE products ADD COLUMN tags TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE products ADD COLUMN meta_title TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE products ADD COLUMN meta_description TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE products ADD COLUMN meta_keywords TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 5"); } catch (e) { }
    
    // Branch Management
    try { await db.run("CREATE TABLE IF NOT EXISTS branches (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, address TEXT, phone TEXT, email TEXT, manager_id INTEGER, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (manager_id) REFERENCES users(id))"); } catch (e) { }
    
    // Product Branch Inventory
    try { await db.run("CREATE TABLE IF NOT EXISTS product_branch_inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, branch_id INTEGER NOT NULL, stock INTEGER DEFAULT 0, low_stock_threshold INTEGER DEFAULT 5, last_restocked DATETIME, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE, FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE, UNIQUE(product_id, branch_id))"); } catch (e) { }
    
    // Enhanced Orders Management
    try { await db.run("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'"); } catch (e) { }
    try { await db.run("ALTER TABLE orders ADD COLUMN tracking_number TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE orders ADD COLUMN shipping_method TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE orders ADD COLUMN shipping_address TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE orders ADD COLUMN notes TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE orders ADD COLUMN estimated_delivery DATE"); } catch (e) { }
    try { await db.run("ALTER TABLE orders ADD COLUMN actual_delivery DATE"); } catch (e) { }
    
    // Order History
    try { await db.run("CREATE TABLE IF NOT EXISTS order_history (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, user_id INTEGER, action TEXT NOT NULL, old_status TEXT, new_status TEXT, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id))"); } catch (e) { }
    
    // Enhanced User Management
    try { await db.run("ALTER TABLE users ADD COLUMN department TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE users ADD COLUMN position TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active'"); } catch (e) { }
    try { await db.run("ALTER TABLE users ADD COLUMN last_login DATETIME"); } catch (e) { }
    try { await db.run("ALTER TABLE users ADD COLUMN phone TEXT"); } catch (e) { }
    try { await db.run("ALTER TABLE users ADD COLUMN bio TEXT"); } catch (e) { }
    
    // User Groups
    try { await db.run("CREATE TABLE IF NOT EXISTS user_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT, permissions TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"); } catch (e) { }
    
    // User Group Memberships
    try { await db.run("CREATE TABLE IF NOT EXISTS user_group_memberships (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, group_id INTEGER NOT NULL, assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP, assigned_by INTEGER, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE, FOREIGN KEY (assigned_by) REFERENCES users(id))"); } catch (e) { }
    
    // Access Logs
    try { await db.run("CREATE TABLE IF NOT EXISTS access_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL, resource TEXT, ip_address TEXT, user_agent TEXT, success BOOLEAN DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))"); } catch (e) { }
    
    // System Settings
    try { await db.run("CREATE TABLE IF NOT EXISTS system_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT, description TEXT, category TEXT DEFAULT 'general', updated_by INTEGER, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (updated_by) REFERENCES users(id))"); } catch (e) { }
    
    // Email Templates
    try { await db.run("CREATE TABLE IF NOT EXISTS email_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, subject TEXT, content TEXT, variables TEXT, category TEXT DEFAULT 'general', status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"); } catch (e) { }
    
    // Scheduled Tasks
    try { await db.run("CREATE TABLE IF NOT EXISTS scheduled_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, task_type TEXT NOT NULL, schedule TEXT NOT NULL, parameters TEXT, last_run DATETIME, next_run DATETIME, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"); } catch (e) { }
    
    // Analytics Data
    try { await db.run("CREATE TABLE IF NOT EXISTS analytics_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, user_id INTEGER, session_id TEXT, properties TEXT, ip_address TEXT, user_agent TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))"); } catch (e) { }
    
    // Promo Codes
    try { await db.run("CREATE TABLE IF NOT EXISTS promo_codes (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, discount_type TEXT NOT NULL, discount_value REAL NOT NULL, min_order_amount REAL, max_uses INTEGER, used_count INTEGER DEFAULT 0, valid_from DATETIME, valid_until DATETIME, status TEXT DEFAULT 'active', created_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (created_by) REFERENCES users(id))"); } catch (e) { }
    
    // Suppliers
    try { await db.run("CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, contact_person TEXT, email TEXT, phone TEXT, address TEXT, payment_terms TEXT, notes TEXT, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"); } catch (e) { }
    
    // Purchase Orders
    try { await db.run("CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL, order_number TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'pending', total_amount REAL, order_date DATE, expected_delivery DATE, notes TEXT, created_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (supplier_id) REFERENCES suppliers(id), FOREIGN KEY (created_by) REFERENCES users(id))"); } catch (e) { }
    
    // Purchase Order Items
    try { await db.run("CREATE TABLE IF NOT EXISTS purchase_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_order_id INTEGER NOT NULL, product_id INTEGER, quantity INTEGER NOT NULL, unit_price REAL NOT NULL, total_price REAL NOT NULL, received_quantity INTEGER DEFAULT 0, FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE, FOREIGN KEY (product_id) REFERENCES products(id))"); } catch (e) { }

    // Seed default admin if no users exist
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
        const adminPassword = await (import('bcryptjs')).then(m => m.default.hash('admin123', 10));
        await db.run(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            ['Admin User', 'admin@techturf.com', adminPassword, 'admin']
        );
        console.log('Default admin seeded: admin@techturf.com / admin123');
    }

    console.log('Database initialized successfully.');
    return db;
}
