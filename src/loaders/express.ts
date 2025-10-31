import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import routes from '../api';
import rateLimiter from '../shared/rateLimiter';
import { apiPrefix } from '../utils/constants';
import {
  errorConverter,
  errorHandler,
  httpRequestLogger,
} from '../shared/middleware';
import env from '../config';

const corsOptions = {
  origin:
    env.NODE_ENV === 'production'
      ? env.ALLOWED_ORIGINS!.split(',')
      : ['http://localhost:3000', 'http://localhost:5173', 'https://frontend-v1-gules.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-HMAC-Signature'],
  exposedHeaders: [],
};

export default ({ app }: { app: express.Application }): void => {
  app.options(`${apiPrefix}/deploy/widget/external`, (req, res) => {
    const origin = req.headers.origin as string | undefined;
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-HMAC-Signature'
    );
    res.header('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
  });

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(cookieParser());

  app.use(rateLimiter);

  app.get('/', (req, res) => {
    return res.send(
      "What are you doing here? 🧐 Go to <a href='https://trench.ag/'>Magic Link!!</a>"
    );
  });

  app.get('/healthcheck', (req, res) => {
    const healthcheck = {
      statusCode: 200,
      success: true,
      message: 'OK',
      timestamp: new Date(),
      uptime: process.uptime(),
      application: 'WHALE-TERMINAL',
    };

    try {
      return res.json(healthcheck);
    } catch (e) {
      return res.status(503).send();
    }
  });

  app.use(httpRequestLogger);

  app.set('trust proxy', 1);

  app.use(bodyParser.json());

  app.use(apiPrefix, routes());

  app.use((req, res, next) => {
    res.status(404).json({
      success: false,
      message: 'Resource not found',
    });
  });

  app.use(errorConverter);
  app.use(errorHandler);
};
