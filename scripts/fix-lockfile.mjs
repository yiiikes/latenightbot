import { execSync } from 'child_process';
import { unlinkSync, existsSync } from 'fs';

const lockfile = '/vercel/share/v0-project/pnpm-lock.yaml';

if (existsSync(lockfile)) {
  unlinkSync(lockfile);
  console.log('Deleted old pnpm-lock.yaml');
}

try {
  execSync('cd /vercel/share/v0-project && pnpm install --no-frozen-lockfile', { stdio: 'inherit' });
  console.log('Lockfile regenerated successfully');
} catch (e) {
  console.error('Failed:', e.message);
}
