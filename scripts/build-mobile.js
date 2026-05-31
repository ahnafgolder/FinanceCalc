const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const apiDir = path.join(root, 'src/app/api');
const stashDir = path.join(root, '.mobile-build-stash-api');
const envFile = path.join(root, '.env.mobile');

const env = { ...process.env, MOBILE_BUILD: '1' };

for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

function stashApiRoutes() {
  if (fs.existsSync(apiDir)) {
    if (fs.existsSync(stashDir)) fs.rmSync(stashDir, { recursive: true, force: true });
    fs.renameSync(apiDir, stashDir);
  }
}

function restoreApiRoutes() {
  if (fs.existsSync(stashDir)) {
    if (fs.existsSync(apiDir)) fs.rmSync(apiDir, { recursive: true, force: true });
    fs.renameSync(stashDir, apiDir);
  }
}

stashApiRoutes();
try {
  execSync('npx next build', { env, stdio: 'inherit', cwd: root });
} finally {
  restoreApiRoutes();
}
