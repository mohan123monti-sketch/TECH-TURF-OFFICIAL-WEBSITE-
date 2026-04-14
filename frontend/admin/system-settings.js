// System Settings Management JavaScript
let settings = {};

const apiBase = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    checkCRMStatus();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Auto-save on change
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            saveSettings();
        });
    });
}

// Load Settings
async function loadSettings() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        // Load system settings from backend
        const response = await fetch(`${apiBase}/admin/system-settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            settings = await response.json();
            populateSettingsForm();
        } else {
            // Load from localStorage as fallback
            const savedSettings = localStorage.getItem('system-settings');
            if (savedSettings) {
                settings = JSON.parse(savedSettings);
                populateSettingsForm();
            }
        }
        
        // Load CRM settings
        const crmSettings = localStorage.getItem('crm-settings');
        if (crmSettings) {
            const crmConfig = JSON.parse(crmSettings);
            document.getElementById('crm-url').value = crmConfig.url || 'http://localhost:3100';
            document.getElementById('crm-api-key').value = crmConfig.apiKey || '';
        }
        
    } catch (error) {
        console.error('Error loading settings:', error);
        window.showToast('Failed to load settings', 'error');
    }
}

// Populate Settings Form
function populateSettingsForm() {
    // Email settings
    if (settings.email) {
        document.getElementById('smtp-server').value = settings.email.smtpServer || '';
        document.getElementById('smtp-port').value = settings.email.smtpPort || '';
        document.getElementById('email-username').value = settings.email.username || '';
        document.getElementById('from-email').value = settings.email.fromEmail || '';
    }
    
    // Backup settings
    if (settings.backup) {
        document.getElementById('auto-backup').checked = settings.backup.autoBackup || false;
        document.getElementById('backup-frequency').value = settings.backup.frequency || 'daily';
        document.getElementById('backup-retention').value = settings.backup.retention || 30;
        document.getElementById('backup-location').value = settings.backup.location || '/backups';
    }
    
    // API settings
    if (settings.api) {
        document.getElementById('api-rate-limit').value = settings.api.rateLimit || 1000;
        document.getElementById('jwt-secret').value = settings.api.jwtSecret || '';
        document.getElementById('api-key-auth').checked = settings.api.keyAuth || false;
        document.getElementById('cors-origins').value = settings.api.corsOrigins || '';
    }
    
    // Security settings
    if (settings.security) {
        document.getElementById('require-2fa').checked = settings.security.require2FA || false;
        document.getElementById('password-policy').value = settings.security.passwordPolicy || 'basic';
        document.getElementById('session-timeout').value = settings.security.sessionTimeout || 30;
        document.getElementById('allowed-ips').value = settings.security.allowedIPs || '';
    }
}

// Save Settings
async function saveSettings() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    // Collect form data
    const formData = {
        email: {
            smtpServer: document.getElementById('smtp-server').value,
            smtpPort: document.getElementById('smtp-port').value,
            username: document.getElementById('email-username').value,
            password: document.getElementById('email-password').value,
            fromEmail: document.getElementById('from-email').value
        },
        backup: {
            autoBackup: document.getElementById('auto-backup').checked,
            frequency: document.getElementById('backup-frequency').value,
            retention: document.getElementById('backup-retention').value,
            location: document.getElementById('backup-location').value
        },
        api: {
            rateLimit: document.getElementById('api-rate-limit').value,
            jwtSecret: document.getElementById('jwt-secret').value,
            keyAuth: document.getElementById('api-key-auth').checked,
            corsOrigins: document.getElementById('cors-origins').value
        },
        security: {
            require2FA: document.getElementById('require-2fa').checked,
            passwordPolicy: document.getElementById('password-policy').value,
            sessionTimeout: document.getElementById('session-timeout').value,
            allowedIPs: document.getElementById('allowed-ips').value
        }
    };
    
    try {
        const response = await fetch(`${apiBase}/admin/system-settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            settings = formData;
            localStorage.setItem('system-settings', JSON.stringify(settings));
            window.showToast('Settings saved successfully', 'success');
        } else {
            // Save to localStorage as fallback
            localStorage.setItem('system-settings', JSON.stringify(formData));
            window.showToast('Settings saved locally', 'success');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        // Save to localStorage as fallback
        localStorage.setItem('system-settings', JSON.stringify(formData));
        window.showToast('Settings saved locally', 'success');
    }
}

// Save All Settings
async function saveAllSettings() {
    await saveSettings();
    
    // Save CRM settings
    const crmSettings = {
        url: document.getElementById('crm-url').value,
        apiKey: document.getElementById('crm-api-key').value
    };
    localStorage.setItem('crm-settings', JSON.stringify(crmSettings));
    
    window.showToast('All settings saved successfully', 'success');
}

// Test Email Configuration
async function testEmailConfig() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    const emailConfig = {
        smtpServer: document.getElementById('smtp-server').value,
        smtpPort: document.getElementById('smtp-port').value,
        username: document.getElementById('email-username').value,
        password: document.getElementById('email-password').value,
        fromEmail: document.getElementById('from-email').value
    };
    
    try {
        const response = await fetch(`${apiBase}/admin/test-email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailConfig)
        });
        
        if (response.ok) {
            window.showToast('Email configuration test successful', 'success');
        } else {
            const error = await response.json();
            window.showToast(error.message || 'Email test failed', 'error');
        }
    } catch (error) {
        console.error('Error testing email:', error);
        window.showToast('Email test failed. Check configuration.', 'error');
    }
}

// Create Backup
async function createBackup() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${apiBase}/admin/create-backup`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            window.showToast('Backup created successfully', 'success');
        } else {
            window.showToast('Failed to create backup', 'error');
        }
    } catch (error) {
        console.error('Error creating backup:', error);
        window.showToast('Backup creation failed', 'error');
    }
}

// Clear Cache
async function clearCache() {
    try {
        // Clear browser cache
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        // Clear application cache
        localStorage.removeItem('system-settings');
        localStorage.removeItem('crm-settings');
        
        window.showToast('Cache cleared successfully', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error clearing cache:', error);
        window.showToast('Failed to clear cache', 'error');
    }
}

// Restart System
async function restartSystem() {
    if (!confirm('Are you sure you want to restart the system? This will temporarily interrupt service.')) return;
    
    try {
        const response = await fetch(`${apiBase}/admin/restart-system`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            window.showToast('System restart initiated', 'success');
            setTimeout(() => {
                window.location.href = '/admin/index.html';
            }, 5000);
        } else {
            window.showToast('Failed to restart system', 'error');
        }
    } catch (error) {
        console.error('Error restarting system:', error);
        window.showToast('System restart failed', 'error');
    }
}

// Export Logs
async function exportLogs() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${apiBase}/admin/export-logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `system-logs-${new Date().toISOString().split('T')[0]}.log`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            window.showToast('Logs exported successfully', 'success');
        } else {
            window.showToast('Failed to export logs', 'error');
        }
    } catch (error) {
        console.error('Error exporting logs:', error);
        window.showToast('Log export failed', 'error');
    }
}

// CRM Functions
async function checkCRMStatus() {
    const crmUrl = document.getElementById('crm-url')?.value || 'http://localhost:3100';
    const statusElement = document.getElementById('crm-status');
    
    if (!statusElement) return;
    
    try {
        // Try to connect to CRM
        const response = await fetch(`${crmUrl}/health`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            statusElement.textContent = 'Connected';
            statusElement.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-green-500/10 text-green-500';
        } else {
            statusElement.textContent = 'Error';
            statusElement.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-500';
        }
    } catch (error) {
        statusElement.textContent = 'Offline';
        statusElement.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-gray-500/10 text-gray-500';
    }
}

async function testCRMConnection() {
    const crmUrl = document.getElementById('crm-url').value;
    const apiKey = document.getElementById('crm-api-key').value;
    
    if (!crmUrl) {
        window.showToast('Please enter CRM URL', 'warning');
        return;
    }
    
    try {
        // Test connection to CRM
        const response = await fetch(`${crmUrl}/api/health`, {
            method: 'GET',
            headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
            timeout: 5000
        });
        
        if (response.ok) {
            window.showToast('CRM connection successful', 'success');
            checkCRMStatus();
        } else {
            window.showToast('CRM connection failed. Check URL and API key.', 'error');
        }
    } catch (error) {
        console.error('CRM connection error:', error);
        window.showToast('CRM is not accessible. Check if it\'s running.', 'error');
    }
}

function openCRM() {
    const crmUrl = document.getElementById('crm-url').value || 'http://localhost:3100';
    
    // Open CRM in new tab
    window.open(crmUrl, '_blank');
    
    // Also update the sidebar CRM link
    const crmLink = document.querySelector('a[href="http://localhost:3100"]');
    if (crmLink) {
        crmLink.href = crmUrl;
    }
    
    window.showToast('Opening CRM...', 'info');
}
