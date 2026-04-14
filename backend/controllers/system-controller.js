// SYSTEM CONTROLLER
import os from 'os';
import osUtils from 'os-utils';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const ROOT_PATH = 'C:\\HOSTING\\Final Version';

const killPortCommand = (port) => `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a`;
const startInNewWindowCommand = (title, cwd, startCommand) => `cd /d "${cwd}" & start "${title}" cmd /k "${startCommand}"`;

const PRESET_COMMANDS = {
    restart_unified_backend: {
        label: 'Restart Unified Backend',
        description: 'Stops process on port 5000 and restarts backend dev server.',
        command: `${killPortCommand(5000)} & ${startInNewWindowCommand('Unified Backend :5000', 'C:\\HOSTING\\Final Version\\TECH TURF-O.1\\backend', 'set PORT=5000 && set FRONTEND_BASE_URL=http://localhost:3601 && npm run dev')}`
    },
    restart_brand_pilot: {
        label: 'Restart Brand Pilot',
        description: 'Stops process on port 3200 and restarts Brand Pilot.',
        command: `${killPortCommand(3200)} & ${startInNewWindowCommand('Brand Pilot', 'C:\\HOSTING\\Final Version\\brand pilot', 'npm run dev')}`
    },
    restart_calander: {
        label: 'Restart CALANDER',
        description: 'Stops process on port 5190 and restarts CALANDER.',
        command: `${killPortCommand(5190)} & ${startInNewWindowCommand('CALANDER', 'C:\\HOSTING\\Final Version\\CALANDER', 'npm run dev')}`
    },
    restart_crm_frontend: {
        label: 'Restart CRM Frontend',
        description: 'Stops process on port 3100 and restarts CRM frontend.',
        command: `${killPortCommand(3100)} & ${startInNewWindowCommand('CRM Frontend', 'C:\\HOSTING\\Final Version\\crm\\frontend', 'npm run dev')}`
    },
    restart_nexus_site: {
        label: 'Restart Nexus Site',
        description: 'Stops process on port 3400 and restarts Nexus static server.',
        command: `${killPortCommand(3400)} & ${startInNewWindowCommand('Nexus AI :3400', 'C:\\HOSTING\\Final Version\\nexus-ai-website', 'npx http-server -p 3400')}`
    },
    restart_tt_frontend: {
        label: 'Restart Tech Turf Frontend',
        description: 'Stops process on port 3601 and restarts Tech Turf static server.',
        command: `${killPortCommand(3601)} & ${startInNewWindowCommand('Tech Turf Frontend :3601', 'C:\\HOSTING\\Final Version\\TECH TURF-O.1\\frontend', 'npx http-server . -p 3601')}`
    },
    start_all_sites: {
        label: 'Start All Websites',
        description: 'Runs the master startup script for all sites.',
        command: 'cd /d "C:\\HOSTING\\Final Version" & start "Full Stack Starter" cmd /c "START_ALL_WEBSITES.bat"'
    },
    stop_all_sites: {
        label: 'Stop All Websites',
        description: 'Runs the master stop script for all sites.',
        command: 'cd /d "C:\\HOSTING\\Final Version" & start "Full Stack Stopper" cmd /c "STOP_ALL_WEBSITES.bat"'
    },
    free_port_5000: {
        label: 'Free Port 5000',
        description: 'Kills any process currently listening on port 5000.',
        command: killPortCommand(5000)
    },
    free_port_3200: {
        label: 'Free Port 3200',
        description: 'Kills any process currently listening on port 3200.',
        command: killPortCommand(3200)
    },
    free_port_5190: {
        label: 'Free Port 5190',
        description: 'Kills any process currently listening on port 5190.',
        command: killPortCommand(5190)
    },
    free_port_3100: {
        label: 'Free Port 3100',
        description: 'Kills any process currently listening on port 3100.',
        command: killPortCommand(3100)
    },
    clear_npm_cache: {
        label: 'Clear NPM Cache',
        description: 'Runs npm cache clean for resolving package cache issues.',
        command: 'npm cache clean --force'
    }
};

const HEALTH_TARGETS = [
    { key: 'backend', name: 'Unified Backend', url: 'http://localhost:5000/', restartCommandId: 'restart_unified_backend' },
    { key: 'brand', name: 'Brand Pilot', url: 'http://localhost:3200/', restartCommandId: 'restart_brand_pilot' },
    { key: 'calander', name: 'CALANDER', url: 'http://localhost:5190/', restartCommandId: 'restart_calander' },
    { key: 'crm', name: 'CRM Frontend', url: 'http://localhost:3100/', restartCommandId: 'restart_crm_frontend' },
    { key: 'nexus', name: 'Nexus AI Website', url: 'http://localhost:3400/', restartCommandId: 'restart_nexus_site' },
    { key: 'tt_frontend', name: 'Tech Turf Frontend', url: 'http://localhost:3601/', restartCommandId: 'restart_tt_frontend' }
];

const readLinuxCachedMemoryMB = async () => {
    try {
        const memInfo = await fs.readFile('/proc/meminfo', 'utf8');
        const match = memInfo.match(/^Cached:\s+(\d+)\s+kB$/m);
        if (!match) return null;
        return Number((Number(match[1]) / 1024).toFixed(2));
    } catch {
        return null;
    }
};

const getCacheMemoryMB = async () => {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execAsync('powershell -NoProfile -Command "(Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory).CacheBytes"');
            const bytes = Number(String(stdout).trim().split(/\s+/)[0]);
            if (!Number.isFinite(bytes)) return null;
            return Number((bytes / 1024 / 1024).toFixed(2));
        }
        return await readLinuxCachedMemoryMB();
    } catch {
        return null;
    }
};

const getCpuTemperatureC = async () => {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execAsync('powershell -NoProfile -Command "(Get-CimInstance MSAcpi_ThermalZoneTemperature | Select-Object -First 1 -ExpandProperty CurrentTemperature)"');
            const raw = Number(String(stdout).trim().split(/\s+/)[0]);
            if (!Number.isFinite(raw) || raw <= 0) return null;
            return Number(((raw / 10) - 273.15).toFixed(2));
        }

        const thermalRaw = await fs.readFile('/sys/class/thermal/thermal_zone0/temp', 'utf8');
        const temp = Number(String(thermalRaw).trim());
        if (!Number.isFinite(temp) || temp <= 0) return null;
        return Number((temp / 1000).toFixed(2));
    } catch {
        return null;
    }
};

const checkTargetHealth = async (target) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
        const response = await fetch(target.url, { method: 'GET', signal: controller.signal });
        clearTimeout(timeout);
        return {
            key: target.key,
            name: target.name,
            url: target.url,
            restartCommandId: target.restartCommandId || null,
            online: response.ok,
            statusCode: response.status
        };
    } catch {
        clearTimeout(timeout);
        return {
            key: target.key,
            name: target.name,
            url: target.url,
            restartCommandId: target.restartCommandId || null,
            online: false,
            statusCode: null
        };
    }
};

export const getMetrics = async (req, res) => {
    const db = req.db;
    try {
        const metrics = await db.all('SELECT * FROM system_metrics ORDER BY created_at DESC LIMIT 20');
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addMetric = async (req, res) => {
    const { name, category, value, unit, status, metadata } = req.body;
    const db = req.db;
    try {
        const result = await db.run(
            'INSERT INTO system_metrics (name, category, value, unit, status, metadata) VALUES (?, ?, ?, ?, ?, ?)',
            [name, category, value, unit, status, JSON.stringify(metadata)]
        );
        res.status(201).json({ id: result.lastID, name, value });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getEvents = async (req, res) => {
    const db = req.db;
    try {
        const events = await db.all('SELECT * FROM system_events ORDER BY created_at DESC LIMIT 50');
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addEvent = async (req, res) => {
    const { type, title, status, target } = req.body;
    const db = req.db;
    try {
        const result = await db.run(
            'INSERT INTO system_events (type, title, status, target) VALUES (?, ?, ?, ?)',
            [type, title, status, target]
        );
        res.status(201).json({ id: result.lastID, title, status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getStats = async (req, res) => {
    const db = req.db;
    try {
        const stats = {
            total_users: (await db.get('SELECT COUNT(*) as count FROM users')).count,
            total_projects: (await db.get('SELECT COUNT(*) as count FROM projects')).count,
            total_clients: (await db.get('SELECT COUNT(*) as count FROM clients')).count,
            total_tasks: (await db.get('SELECT COUNT(*) as count FROM tasks')).count,
            attendance_today: (await db.get('SELECT COUNT(*) as count FROM attendance WHERE date = CURRENT_DATE AND status = "present"')).count
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getRealtimeStats = async (req, res) => {
    try {
        const cpuLoad = await new Promise((resolve) => {
            osUtils.cpuUsage((v) => resolve(v));
        });

        const totalMemBytes = os.totalmem();
        const freeMemBytes = os.freemem();
        const usedMemBytes = totalMemBytes - freeMemBytes;
        const [cpuTempC, cacheMemoryMB] = await Promise.all([getCpuTemperatureC(), getCacheMemoryMB()]);

        res.json({
            cpuUsage: Number((Number(cpuLoad) * 100).toFixed(2)),
            cpuTempC,
            ram: {
                totalGB: Number((totalMemBytes / 1024 / 1024 / 1024).toFixed(2)),
                usedGB: Number((usedMemBytes / 1024 / 1024 / 1024).toFixed(2)),
                freeGB: Number((freeMemBytes / 1024 / 1024 / 1024).toFixed(2)),
                usagePercent: Number(((usedMemBytes / totalMemBytes) * 100).toFixed(2)),
                cacheMB: cacheMemoryMB
            },
            uptimeSec: os.uptime(),
            platform: os.platform(),
            hostname: os.hostname(),
            arch: os.arch(),
            loadAvg: os.loadavg()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getServiceHealth = async (req, res) => {
    try {
        const checks = await Promise.all(HEALTH_TARGETS.map(checkTargetHealth));
        res.json({
            generatedAt: new Date().toISOString(),
            checks
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPresetCommands = async (req, res) => {
    const items = Object.entries(PRESET_COMMANDS).map(([id, value]) => ({
        id,
        label: value.label,
        description: value.description
    }));

    res.json({
        rootPath: ROOT_PATH,
        commands: items
    });
};

export const runPresetCommand = async (req, res) => {
    const { commandId } = req.body;
    const selected = PRESET_COMMANDS[commandId];

    if (!selected) {
        return res.status(400).json({ message: 'Invalid command id.' });
    }

    try {
        const { stdout, stderr } = await execAsync(selected.command);
        res.json({
            message: `Executed: ${selected.label}`,
            stdout,
            stderr
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
            stderr: error.stderr || '',
            stdout: error.stdout || ''
        });
    }
};

export const executeCommand = async (req, res) => {
    const { action } = req.body;
    const legacyActionMap = {
        'restart-nginx': null,
        'stop-nginx': null,
        'start-nginx': null,
        'restart-pm2-service': 'restart_unified_backend',
        'kill-port-5000': 'free_port_5000',
        'kill-port-3200': 'free_port_3200',
        'kill-port-5190': 'free_port_5190',
        'kill-port-3100': 'free_port_3100'
    };

    const mappedCommandId = legacyActionMap[action] || req.body.commandId;
    if (!mappedCommandId) {
        return res.status(400).json({ message: 'Unsupported legacy action. Use /run-command with commandId.' });
    }

    req.body.commandId = mappedCommandId;
    return runPresetCommand(req, res);
};

export const getPm2List = async (req, res) => {
    try {
        const { stdout } = await execAsync('pm2 jlist');
        res.json(JSON.parse(stdout));
    } catch (error) {
        // If pm2 is not found or fails, return empty list
        res.json([]);
    }
};

export const getLogData = async (req, res) => {
    const { service } = req.query;
    let logPath = '';

    // Define some default log paths based on service
    if (service === 'backend') {
        logPath = path.join(process.cwd(), 'out.txt'); // Assuming PM2 out file
    } else if (service === 'nginx') {
        logPath = 'C:\\HOSTING\\nginx-1.28.2\\nginx-1.28.2\\logs\\error.log';
    }

    try {
        if (!logPath) return res.json({ logs: 'Log path not configured for this service' });
        const data = await fs.readFile(logPath, 'utf8');
        const lines = data.split('\n').slice(-50).join('\n'); // Last 50 lines
        res.json({ logs: lines });
    } catch (error) {
        res.json({ logs: 'Could not read log file: ' + error.message });
    }
};
