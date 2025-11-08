import express from 'express';
import { auth, validate } from '../../shared/middleware';
import { getAnalytics, getSummary, getCharts, getFeedbacks, getTopicBarChart, getTopicPieChart } from './analytics-controller';
import { getAnalyticsSchema, getSummarySchema, getChartsSchema, getFeedbacksSchema } from './analytics-schema';

const app = express.Router();

app.get('/summary', auth, validate('query', getSummarySchema), getSummary);
app.get('/charts', auth, validate('query', getChartsSchema), getCharts);
app.get('/feedbacks', auth, validate('query', getFeedbacksSchema), getFeedbacks);
app.get('/topics/bar-chart', auth, validate('query', getChartsSchema), getTopicBarChart);
app.get('/topics/pie-chart', auth, validate('query', getChartsSchema), getTopicPieChart);

// Keep dynamic route last so it doesn't capture static paths like /feedbacks
app.get('/:chatbotId', auth, validate('params', getAnalyticsSchema), getAnalytics);

export default app;
