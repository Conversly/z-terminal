import express from 'express';
import { auth, validate } from '../../shared/middleware';
import { getChatlogs, getMessages } from './activity-controller';
import { getChatlogsSchema, getMessagesSchema } from './activity-schema';

const app = express.Router();

app.get('/chatlogs', auth, validate('query', getChatlogsSchema), getChatlogs);
app.get('/messages', auth, validate('query', getMessagesSchema), getMessages);

export default app;
