import { createApp } from './app.js';
import { loadEnv } from './config/index.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const app = createApp();

  app.listen(env.PORT, () => {
    console.info(`Job Match API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
