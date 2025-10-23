import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  createChatbot,
    GenerateInstruction,
    updateInstruction,
} from './chatbot-controller';
import {
  createChatbotSchema,
  generateInstructionSchema,
  chatbotInstructionsSchema,
} from './chatbot-schema';

const app = express.Router();

app.post('/create', auth, validate('body', createChatbotSchema), createChatbot);

app.get('/generate-prompt', auth, validate('query', generateInstructionSchema), GenerateInstruction);

app.post('/prompt', auth, validate('body', chatbotInstructionsSchema), updateInstruction);

export default app;
