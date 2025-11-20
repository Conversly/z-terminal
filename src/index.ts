import express from 'express';
import Loaders from './loaders';
import logger from './loaders/logger';
import env from './config/index';
import { getDrizzleClient, closeDatabaseConnection } from './loaders/postgres';
import { loadGoogleOAuthClient } from './loaders/googleOAuth';

async function startServer() {
  const app = express();

  await Loaders({ expressApp: app });

  await getDrizzleClient();

  await loadGoogleOAuthClient();

  const port = Number(env.PORT) || 8020;
  
  const server = app
    .listen(port, '0.0.0.0', () => {
      logger.info(`🛡️  Server listening on port: ${port} 🛡️`);
    })
    .on('error', (err) => {
      logger.error(err);
      process.exit(1);
    });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, closing server gracefully...`);
    
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await closeDatabaseConnection();
        logger.info('All connections closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
