import express from 'express';
import Loaders from './loaders';
import logger from './loaders/logger';
import env from './config/index';
import { getDrizzleClient } from './loaders/postgres';
import { loadGoogleOAuthClient } from './loaders/googleOAuth';

async function startServer() {
  const app = express();

  await Loaders({ expressApp: app });

  await getDrizzleClient();

  await loadGoogleOAuthClient();

  app
    .listen(env.PORT, () => {
      logger.info(`🛡️  Server listening on port: ${env.PORT} 🛡️`);
    })
    .on('error', (err) => {
      logger.error(err);
      process.exit(1);
    });
}

startServer();
