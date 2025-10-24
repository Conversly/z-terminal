import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  createChatbot,
    GenerateInstruction,
    updateInstruction,
    getChatbots,
    deleteChatbot,
    getChatbot,
} from './chatbot-controller';
import {
  createChatbotSchema,
  generateInstructionSchema,
  chatbotInstructionsSchema,
  deleteChatbotSchema,
  getChatbotSchema,
} from './chatbot-schema';
import { get } from 'http';

const app = express.Router();

app.get('/', auth, getChatbots);

app.post('/create', auth, validate('body', createChatbotSchema), createChatbot);

app.get('/generate-prompt', auth, validate('query', generateInstructionSchema), GenerateInstruction);

app.post('/prompt', auth, validate('body', chatbotInstructionsSchema), updateInstruction);

app.delete('/:id', auth, validate('params', deleteChatbotSchema), deleteChatbot);

app.get('/:id', auth, validate('params', getChatbotSchema), getChatbot);

export default app;
