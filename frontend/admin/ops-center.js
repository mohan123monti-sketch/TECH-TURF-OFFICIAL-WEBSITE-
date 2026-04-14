const token = localStorage.getItem('tt_token');
const AUTO_HEAL_COOLDOWN_MS = 5 * 60 * 1000;
const autoHealState = {
    backend: {
        hasAttempted: false,
        lastAttemptMs: 0
    }
};

const parseJwtPayload = (jwtToken) => {
    if (!jwtToken || jwtToken.split('.').length < 2) return null;
    try {
        const payload = jwtToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(payload);
        return JSON.parse(decoded);
    } catch {
        return null;
    }
};

const tokenPayload = parseJwtPayload(token);
const isAdminUser = ['admin', 'superadmin'].includes(tokenPayload?.role);

const el = {
    cpuUsage: document.getElementById('cpuUsage'),
    cpuTemp: document.getElementById('cpuTemp'),
    ramUsage: document.getElementById('ramUsage'),
    cacheMem: document.getElementById('cacheMem'),
    hostName: document.getElementById('hostName'),
    platform: document.getElementById('platform'),
    arch: document.getElementById('arch'),
    uptime: document.getElementById('uptime'),
    ramDetail: document.getElementById('ramDetail'),
    loadAvg: document.getElementById('loadAvg'),
    healthList: document.getElementById('healthList'),
    commandGrid: document.getElementById('commandGrid'),
    commandOutput: document.getElementById('commandOutput'),
    refreshSystemBtn: document.getElementById('refreshSystemBtn'),
    refreshHealthBtn: document.getElementById('refreshHealthBtn'),
    clearLogsBtn: document.getElementById('clearLogsBtn')
};

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`
});

const secondsToUptime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
};

const appendOutput = (text) => {
    const now = new Date().toLocaleTimeString();
    el.commandOutput.textContent = `[${now}] ${text}\n\n${el.commandOutput.textContent}`;
};

const shouldAutoHealBackend = (backendCheck) => {
    if (!isAdminUser || !backendCheck || backendCheck.online) return false;

    const now = Date.now();
    if (autoHealState.backend.hasAttempted && (now - autoHealState.backend.lastAttemptMs) < AUTO_HEAL_COOLDOWN_MS) {
        return false;
    }

    autoHealState.backend.hasAttempted = true;
    autoHealState.backend.lastAttemptMs = now;
    return true;
};

const fetchSystemStats = async () => {
    try {
        const res = await fetch(`${window.API_BASE_URL}/system/realtime-stats`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            throw new Error(`Stats request failed (${res.status})`);
        }

        const stats = await res.json();
        el.cpuUsage.textContent = Number(stats.cpuUsage || 0).toFixed(2);
        el.cpuTemp.textContent = stats.cpuTempC !== null ? `${stats.cpuTempC} C` : 'N/A';
        el.ramUsage.textContent = Number(stats.ram?.usagePercent || 0).toFixed(2);
        el.cacheMem.textContent = stats.ram?.cacheMB !== null ? `${stats.ram.cacheMB} MB` : 'N/A';

        el.hostName.textContent = stats.hostname || '-';
        el.platform.textContent = stats.platform || '-';
        el.arch.textContent = stats.arch || '-';
        el.uptime.textContent = secondsToUptime(Number(stats.uptimeSec || 0));
        el.ramDetail.textContent = `${stats.ram?.usedGB || 0} GB / ${stats.ram?.totalGB || 0} GB`;
        el.loadAvg.textContent = Array.isArray(stats.loadAvg)
            ? stats.loadAvg.map((v) => Number(v).toFixed(2)).join(', ')
            : '-';
    } catch (error) {
        appendOutput(`System stats error: ${error.message}`);
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to load system stats', 'error');
        }
    }
};

const fetchHealth = async () => {
    try {
        const res = await fetch(`${window.API_BASE_URL}/system/service-health`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            throw new Error(`Health request failed (${res.status})`);
        }

        const data = await res.json();
        const checks = Array.isArray(data.checks) ? data.checks : [];

        if (checks.length === 0) {
            el.healthList.innerHTML = '<p class="text-white/50">No service checks available.</p>';
            return;
        }

        el.healthList.innerHTML = checks.map((item) => {
            const statusClass = item.online
                ? 'bg-green-500/15 text-green-400 border-green-500/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30';
            const statusText = item.online
                ? `Online (${item.statusCode || 200})`
                : 'Offline';

            const restartBtn = item.restartCommandId && isAdminUser
                ? `<button data-restart-command="${item.restartCommandId}" data-service-name="${item.name}" class="mt-2 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20">Restart</button>`
                : '';

            return `
                <div class="rounded-xl border border-white/10 px-3 py-2 flex items-center justify-between">
                    <div>
                        <p class="font-semibold text-white">${item.name}</p>
                        <p class="text-xs text-white/50">${item.url}</p>
                        ${restartBtn}
                    </div>
                    <span class="px-2.5 py-1 text-xs rounded-full border ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');

        el.healthList.querySelectorAll('button[data-restart-command]').forEach((btn) => {
            btn.addEventListener('click', () => {
                runCommand(btn.dataset.restartCommand, `Restart ${btn.dataset.serviceName}`);
            });
        });

        const backendCheck = checks.find((item) => item.key === 'backend');
        if (backendCheck?.online) {
            autoHealState.backend.hasAttempted = false;
        } else if (shouldAutoHealBackend(backendCheck)) {
            appendOutput('Auto-heal: Backend reported offline, running one restart attempt.');
            await runCommand('restart_unified_backend', 'Auto-heal Backend Restart', { skipRefresh: true });
        }
    } catch (error) {
        appendOutput(`Service health error: ${error.message}`);
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to load service health', 'error');
        }
    }
};

const runCommand = async (commandId, label, options = {}) => {
    if (!isAdminUser) {
        appendOutput(`Blocked: ${label} requires admin role.`);
        if (typeof window.showToast === 'function') {
            window.showToast('Admin access required for commands', 'error');
        }
        return;
    }

    try {
        appendOutput(`Executing: ${label}`);

        const res = await fetch(`${window.API_BASE_URL}/system/run-command`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ commandId })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || `Command failed (${res.status})`);
        }

        const output = [
            data.message || 'Command executed',
            data.stdout ? `STDOUT:\n${data.stdout}` : '',
            data.stderr ? `STDERR:\n${data.stderr}` : ''
        ].filter(Boolean).join('\n\n');

        appendOutput(output);
        if (typeof window.showToast === 'function') {
            window.showToast(`${label} executed`, 'success');
        }

        // Refresh status after command execution.
        if (!options.skipRefresh) {
            await Promise.all([fetchSystemStats(), fetchHealth()]);
        }
    } catch (error) {
        appendOutput(`Command error (${label}): ${error.message}`);
        if (typeof window.showToast === 'function') {
            window.showToast(`Command failed: ${label}`, 'error');
        }
    }
};

const loadCommandButtons = async () => {
    if (!isAdminUser) {
        el.commandGrid.innerHTML = '<p class="text-yellow-300 text-sm">You are logged in as a non-admin user. Commands are disabled.</p>';
        return;
    }

    try {
        const res = await fetch(`${window.API_BASE_URL}/system/preset-commands`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            throw new Error(`Commands request failed (${res.status})`);
        }

        const data = await res.json();
        const commands = Array.isArray(data.commands) ? data.commands : [];

        if (commands.length === 0) {
            el.commandGrid.innerHTML = '<p class="text-white/50 text-sm">No preset commands available.</p>';
            return;
        }

        el.commandGrid.innerHTML = commands.map((cmd) => `
            <button
                data-command-id="${cmd.id}"
                data-command-label="${cmd.label}"
                class="text-left rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 p-4 transition-all"
            >
                <p class="text-sm font-bold text-white">${cmd.label}</p>
                <p class="text-xs text-white/60 mt-1">${cmd.description}</p>
            </button>
        `).join('');

        el.commandGrid.querySelectorAll('button[data-command-id]').forEach((btn) => {
            btn.addEventListener('click', () => {
                runCommand(btn.dataset.commandId, btn.dataset.commandLabel);
            });
        });
    } catch (error) {
        appendOutput(`Preset command load error: ${error.message}`);
        el.commandGrid.innerHTML = '<p class="text-red-300 text-sm">Failed to load command list.</p>';
    }
};

const initOpsCenter = async () => {
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    el.refreshSystemBtn.addEventListener('click', fetchSystemStats);
    el.refreshHealthBtn.addEventListener('click', fetchHealth);
    el.clearLogsBtn.addEventListener('click', () => {
        el.commandOutput.textContent = 'No command executed yet.';
    });

    if (!isAdminUser) {
        appendOutput('Notice: You are not an admin. Monitoring works, command execution is disabled.');
    }

    await Promise.all([fetchSystemStats(), fetchHealth(), loadCommandButtons()]);

    setInterval(fetchSystemStats, 5000);
    setInterval(fetchHealth, 10000);
};

document.addEventListener('DOMContentLoaded', initOpsCenter);
