const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const targets = {
  backendRoutes: path.join(repoRoot, 'backend', 'routes'),
  backendControllers: path.join(repoRoot, 'backend', 'controllers'),
  frontendPages: path.join(repoRoot, 'frontend', 'pages')
};

const allowedRootPages = new Set(['index.html', 'admin.html', 'aadil-portfolio.html']);

const legacyReferencePatterns = [
  /authRoutes\.js/i,
  /websiteRoutes\.js/i,
  /statsRoutes\.js/i,
  /[A-Za-z]+Controller\.js/i,
  /authMiddleware\.js/i,
  /errorHandler\.js/i,
  /generateOTP\.js/i,
  /nexus_ai\.html/i,
  /click_sphere\.html/i,
  /trend_hive\.html/i,
  /product_details\.html/i,
  /privacy_policy\.html/i,
  /terms_of_service\.html/i
];

const scanIgnoreDirs = new Set([
  '.git',
  'node_modules',
  '.vscode',
  'dist',
  'build',
  'coverage'
]);

function listFilesRecursive(dirPath, collector = []) {
  if (!fs.existsSync(dirPath)) return collector;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (scanIgnoreDirs.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      listFilesRecursive(fullPath, collector);
      continue;
    }

    collector.push(fullPath);
  }

  return collector;
}

function isKebabCaseFile(nameWithoutExt) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nameWithoutExt);
}

function validateRouteAndControllerFilenames() {
  const issues = [];

  const routeFiles = fs.existsSync(targets.backendRoutes)
    ? fs.readdirSync(targets.backendRoutes).filter((f) => f.endsWith('.js'))
    : [];
  for (const file of routeFiles) {
    if (!file.endsWith('-routes.js')) {
      issues.push(`Route filename must end with -routes.js: backend/routes/${file}`);
    }
  }

  const controllerFiles = fs.existsSync(targets.backendControllers)
    ? fs.readdirSync(targets.backendControllers).filter((f) => f.endsWith('.js'))
    : [];
  for (const file of controllerFiles) {
    if (!file.endsWith('-controller.js')) {
      issues.push(`Controller filename must end with -controller.js: backend/controllers/${file}`);
    }
  }

  return issues;
}

function validateFrontendPageFilenames() {
  const issues = [];

  const pages = fs.existsSync(targets.frontendPages)
    ? fs.readdirSync(targets.frontendPages).filter((f) => f.endsWith('.html'))
    : [];

  for (const file of pages) {
    const ext = path.extname(file);
    const base = path.basename(file, ext);
    if (!isKebabCaseFile(base)) {
      issues.push(`Frontend page must be kebab-case: frontend/pages/${file}`);
    }
  }

  const rootPagesToCheck = fs.existsSync(path.join(repoRoot, 'frontend'))
    ? fs.readdirSync(path.join(repoRoot, 'frontend')).filter((f) => f.endsWith('.html'))
    : [];

  for (const file of rootPagesToCheck) {
    if (!allowedRootPages.has(file)) {
      issues.push(`Unexpected root HTML page in frontend/: ${file}`);
    }
  }

  return issues;
}

function validateLegacyReferences() {
  const issues = [];
  const allFiles = [
    ...listFilesRecursive(path.join(repoRoot, 'backend')),
    ...listFilesRecursive(path.join(repoRoot, 'frontend'))
  ];

  for (const filePath of allFiles) {
    const rel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
    const ext = path.extname(filePath).toLowerCase();

    if (!['.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.bat'].includes(ext)) {
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    for (const pattern of legacyReferencePatterns) {
      if (pattern.test(content)) {
        issues.push(`Legacy naming reference found in ${rel} (pattern: ${pattern})`);
      }
    }
  }

  return issues;
}

function main() {
  const issues = [
    ...validateRouteAndControllerFilenames(),
    ...validateFrontendPageFilenames(),
    ...validateLegacyReferences()
  ];

  if (issues.length === 0) {
    console.log('Naming validation passed.');
    process.exit(0);
  }

  console.error('Naming validation failed with the following issues:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }

  process.exit(1);
}

main();
