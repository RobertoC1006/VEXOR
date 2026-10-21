import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Only these two public Auth values are substituted into the client bundle.
  return {
    root: 'frontend',
    envPrefix: [],
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL ?? ''),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
        env.SUPABASE_PUBLISHABLE_KEY ?? '',
      ),
    },
    build: {
      outDir: '../dist/frontend',
      emptyOutDir: true,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 20,
              },
              { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 10 },
            ],
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: { '/api': { target: env.VEXOR_DEV_API_TARGET ?? 'http://127.0.0.1:3000' } },
    },
  };
});
