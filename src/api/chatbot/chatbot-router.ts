import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  createChatbot,
    GetInstructions,
} from './chatbot-controller';
import {
  createChatbotSchema,
  getInstructionsSchema,
} from './chatbot-schema';

const app = express.Router();

app.post('/create', auth, validate('body', createChatbotSchema), createChatbot);

app.post('/instructions', auth, validate('body', getInstructionsSchema), GetInstructions);

export default app;
