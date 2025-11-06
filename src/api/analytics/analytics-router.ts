import express from 'express';
import { auth, validate } from '../../shared/middleware';
import { getAnalytics, getSummary, getCharts, getFeedbacks } from './analytics-controller';
import { getAnalyticsSchema, getSummarySchema, getChartsSchema, getFeedbacksSchema } from './analytics-schema';

const app = express.Router();

app.get('/:chatbotId', auth, validate('params', getAnalyticsSchema), getAnalytics);

// New analytics endpoints (Option 2)
app.get('/summary', auth, validate('query', getSummarySchema), getSummary);
app.get('/charts', auth, validate('query', getChartsSchema), getCharts);
app.get('/feedbacks', auth, validate('query', getFeedbacksSchema), getFeedbacks);

export default app;




