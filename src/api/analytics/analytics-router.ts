import express from 'express';
import { auth, validate } from '../../shared/middleware';
import { getAnalytics } from './analytics-controller';
import { getAnalyticsSchema } from './analytics-schema';

const app = express.Router();

app.get('/:chatbotId', auth, validate('params', getAnalyticsSchema), getAnalytics);

export default app;
