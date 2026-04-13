module.exports = {
  apps: [
    {
      name: 'TT-Backend',
      script: 'server.js',
      cwd: './backend',
      env: { NODE_ENV: 'development', PORT: 5000 }
    },
    {
      name: 'TT-Website',
      script: 'npx',
      args: 'http-server ./ -p 3000 --cors',
      cwd: './frontend'
    },
    {
      name: 'CRM-Dashboard',
      script: 'npm',
      args: 'run dev -- --port 5173',
      cwd: '../crm/frontend'
    },
    {
      name: 'BrandPilot-AI',
      script: 'npm',
      args: 'run dev -- --port 3200',
      cwd: '../brand pilot'
    },
    {
      name: 'Calendar-System',
      script: 'npm',
      args: 'run dev -- --port 3300',
      cwd: '../CALANDER'
    },
    {
      name: 'Nexus-AI',
      script: 'npx',
      args: 'http-server ./ -p 3400 --cors',
      cwd: '../nexus-ai-website'
    },
  ]
};
