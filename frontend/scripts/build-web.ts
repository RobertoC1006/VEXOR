// The backend's local .env uses NODE_ENV=development. A release bundle must not.
process.env.NODE_ENV = 'production';
const { build } = await import('vite');
await build({ configFile: 'frontend/vite.config.ts' });
export {};
