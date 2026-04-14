const token = localStorage.getItem('tt_token');

const websites = [
    {
        key: 'backend',
        name: 'Unified Backend API',
        url: 'http://localhost:5000/',
        primaryAction: { label: 'Open API Root', href: 'http://localhost:5000/' },
        secondaryAction: { label: 'Open Ops', href: '/admin/ops-center.html' }
    },
    {
        key: 'tt_frontend',
        name: 'Tech Turf Website',
        url: 'http://localhost:3601/',
        primaryAction: { label: 'Open Website', href: 'http://localhost:3601/' },
        secondaryAction: { label: 'Open Admin', href: 'http://localhost:3601/admin/dashboard.html' }
    },
    {
        key: 'nexus',
        name: 'Nexus AI Website',
        url: 'http://localhost:3400/',
        primaryAction: { label: 'Open Website', href: 'http://localhost:3400/' },
        secondaryAction: null
    },
    {
        key: 'brand',
        name: 'Brand Pilot',
        url: 'http://localhost:3200/',
        primaryAction: { label: 'Open App', href: 'http://localhost:3200/' },
        secondaryAction: null
    },
    {
        key: 'calander',
        name: 'CALANDER',
        url: 'http://localhost:5190/',
        primaryAction: { label: 'Open App', href: 'http://localhost:5190/' },
        secondaryAction: null
    },
    {
        key: 'crm',
        name: 'CRM Frontend',
        url: 'http://localhost:3100/',
        primaryAction: { label: 'Open App', href: 'http://localhost:3100/' },
        secondaryAction: null
    }
];

const el = {
    projectGrid: document.getElementById('projectGrid'),
    refreshMasterHealth: document.getElementById('refreshMasterHealth'),
    quickActions: document.getElementById('masterQuickActions'),
    output: document.getElementById('masterOutput'),
    clearLog: document.getElementById('clearMasterLog'),
    adminPanelUrlForm: document.getElementById('adminPanelUrlForm')
};
// --- Admin Panel URL Management ---
let adminPanelUrls = {};

const fetchAdminPanelUrls = async () => {
    try {
        const res = await fetch(`${window.API_BASE_URL}/system/admin-panel-urls`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to fetch admin panel URLs');
        adminPanelUrls = await res.json();
    } catch (e) {
        adminPanelUrls = {};
    }
};

const saveAdminPanelUrl = async (key, url) => {
    try {
        const res = await fetch(`${window.API_BASE_URL}/system/admin-panel-urls`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ key, url })
        });
        if (!res.ok) throw new Error('Failed to save URL');
        appendLog(`Admin panel URL updated for ${key}`);
        await fetchAdminPanelUrls();
        renderAdminPanelUrlForm();
    } catch (e) {
        appendLog(`Failed to update admin panel URL for ${key}`);
    }
};

const renderAdminPanelUrlForm = () => {
    if (!el.adminPanelUrlForm) return;
    el.adminPanelUrlForm.innerHTML = websites.map(site => {
        const value = adminPanelUrls[site.key] || '';
        return `
        <div class="flex items-center gap-2">
            <label class="w-40 font-bold text-white/80" for="admin-url-${site.key}">${site.name}</label>
            <input id="admin-url-${site.key}" type="url" value="${value}" placeholder="https://..." class="flex-1 rounded px-2 py-1 text-black" />
            <button data-save-admin-url="${site.key}" class="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-xs font-bold">Save</button>
        </div>
        `;
    }).join('');

    el.adminPanelUrlForm.querySelectorAll('button[data-save-admin-url]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const key = btn.getAttribute('data-save-admin-url');
            const input = el.adminPanelUrlForm.querySelector(`#admin-url-${key}`);
            if (input && input.value) {
                saveAdminPanelUrl(key, input.value);
            }
        });
    });
};

const parseJwtPayload = (jwtToken) => {
    if (!jwtToken || jwtToken.split('.').length < 2) return null;
    try {
        const payload = jwtToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
};

const userPayload = parseJwtPayload(token);
const isAdminUser = ['admin', 'superadmin'].includes(userPayload?.role);

const appendLog = (text) => {
    const now = new Date().toLocaleTimeString();
    el.output.textContent = `[${now}] ${text}\n\n${el.output.textContent}`;
};

const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`
});

const renderGrid = (healthMap = {}) => {
    el.projectGrid.innerHTML = websites.map((site) => {
        const health = healthMap[site.key];
        const online = Boolean(health?.online);
        const badgeClass = online
            ? 'bg-green-500/15 text-green-400 border-green-500/30'
            : 'bg-red-500/15 text-red-400 border-red-500/30';
        const badgeText = online ? `Online${health?.statusCode ? ` (${health.statusCode})` : ''}` : 'Offline';
        const adminPanelUrl = adminPanelUrls[site.key] || '';

        return `
            <article class="iphone-glass rounded-2xl border border-white/10 p-5">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <h3 class="text-lg font-black tracking-tight">${site.name}</h3>
                        <p class="text-xs text-white/50 mt-1">${site.url}</p>
                        ${adminPanelUrl ? `<a href="${adminPanelUrl}" target="_blank" class="text-blue-400 underline text-xs">Open Admin Panel</a>` : '<span class="text-xs text-yellow-400">No admin panel URL set</span>'}
                    </div>
                    <span class="px-2.5 py-1 text-xs rounded-full border ${badgeClass}">${badgeText}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                    <a href="${site.primaryAction.href}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-[0.12em]">${site.primaryAction.label}</a>
                    ${site.secondaryAction ? `<a href="${site.secondaryAction.href}" class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-[0.12em]">${site.secondaryAction.label}</a>` : ''}
                    ${isAdminUser && health?.restartCommandId ? `<button data-restart="${health.restartCommandId}" data-site="${site.name}" class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-[0.12em]">Restart</button>` : ''}
                </div>
            </article>
        `;
    }).join('');

    el.projectGrid.querySelectorAll('button[data-restart]').forEach((btn) => {
        btn.addEventListener('click', () => runCommand(btn.dataset.restart, `Restart ${btn.dataset.site}`));
    });
};

const loadHealth = async () => {
    try {
        const res = await fetch(`${window.API_BASE_URL}/system/service-health`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`Health fetch failed (${res.status})`);
        const data = await res.json();
        const checks = Array.isArray(data.checks) ? data.checks : [];
        const healthMap = checks.reduce((acc, cur) => {
            acc[cur.key] = cur;
            return acc;
        }, {});
        renderGrid(healthMap);
        appendLog('Service health refreshed.');
    } catch (error) {
        renderGrid({});
        appendLog(`Health refresh error: ${error.message}`);
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to load website health', 'error');
        }
    }
};

const runCommand = async (commandId, label) => {
    if (!isAdminUser) {
        appendLog(`Blocked: ${label} requires admin role.`);
        if (typeof window.showToast === 'function') {
            window.showToast('Admin access required', 'error');
        }
        return;
    }

    try {
        appendLog(`Executing: ${label}`);
        const res = await fetch(`${window.API_BASE_URL}/system/run-command`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ commandId })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || `Command failed (${res.status})`);
        }

        appendLog(data.message || `${label} executed.`);
        if (data.stdout) appendLog(`STDOUT:\n${data.stdout}`);
        if (data.stderr) appendLog(`STDERR:\n${data.stderr}`);

        if (typeof window.showToast === 'function') {
            window.showToast(`${label} executed`, 'success');
        }

        setTimeout(loadHealth, 1500);
    } catch (error) {
        appendLog(`Command error (${label}): ${error.message}`);
        if (typeof window.showToast === 'function') {
            window.showToast(`Failed: ${label}`, 'error');
        }
    }
};

const wireQuickActions = () => {
    const buttons = el.quickActions.querySelectorAll('button[data-command-id]');
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const title = btn.querySelector('p')?.textContent || btn.dataset.commandId;
            runCommand(btn.dataset.commandId, title);
        });

        if (!isAdminUser) {
            btn.disabled = true;
            btn.classList.add('opacity-40', 'cursor-not-allowed');
        }
    });
};

const initMasterAdmin = async () => {
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    if (!isAdminUser) {
        appendLog('Signed in as non-admin: access links are available, command controls are locked.');
    }

    await fetchAdminPanelUrls();
    renderAdminPanelUrlForm();
    renderGrid({});
    wireQuickActions();
    el.refreshMasterHealth.addEventListener('click', loadHealth);
    el.clearLog.addEventListener('click', () => {
        el.output.textContent = 'Master panel ready.';
    });

    await loadHealth();
};

document.addEventListener('DOMContentLoaded', initMasterAdmin);
