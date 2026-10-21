// The backend's local .env uses NODE_ENV=development. A release bundle must not.
process.env.NODE_ENV = 'production';
const { build } = await import('vite');
await build({ configFile: 'frontend/vite.config.ts' });
const { writeFile } = await import('node:fs/promises');
const revision = process.env.VERCEL_GIT_COMMIT_SHA;
await writeFile(
  'dist/frontend/version.json',
  JSON.stringify({ revision: revision && /^[a-f0-9]{40}$/.test(revision) ? revision : null }),
);
export {};
