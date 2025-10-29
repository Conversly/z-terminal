import express from 'express';
import { auth, validate } from '../../shared/middleware';
import { getWidget, upsertWidget } from './deploy-controller';
import { deployWidgetSchema, fetchWidgetSchema } from './deploy-schema';

const app = express.Router();

app.get('/widget/:chatbotId', auth, validate('params', fetchWidgetSchema), getWidget);
app.post('/widget', auth, validate('body', deployWidgetSchema), upsertWidget);
// app.post('/key/:chatbotId', auth, validate('params', fetchWidgetSchema), getKey);


export default app;