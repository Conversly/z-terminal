import express from 'express';
import { auth, validate } from '../../shared/middleware';
import { getSummary, getCharts, getFeedbacks, getTopicBarChart, getTopicPieChart } from './analytics-controller';
import { getSummarySchema, getChartsSchema, getFeedbacksSchema } from './analytics-schema';

const app = express.Router();

app.get('/summary', auth, validate('query', getSummarySchema), getSummary);
app.get('/charts', auth, validate('query', getChartsSchema), getCharts);
app.get('/feedbacks', auth, validate('query', getFeedbacksSchema), getFeedbacks);
app.get('/topics/bar-chart', auth, validate('query', getChartsSchema), getTopicBarChart);
app.get('/topics/pie-chart', auth, validate('query', getChartsSchema), getTopicPieChart);



export default app;
