import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  createChatbot,
    GenerateInstruction,
    updateInstruction,
    getChatbots,
    deleteChatbot,
} from './chatbot-controller';
import {
  createChatbotSchema,
  generateInstructionSchema,
  chatbotInstructionsSchema,
  deleteChatbotSchema,
} from './chatbot-schema';

const app = express.Router();

app.get('/', auth, getChatbots);

app.post('/create', auth, validate('body', createChatbotSchema), createChatbot);

app.get('/generate-prompt', auth, validate('query', generateInstructionSchema), GenerateInstruction);

app.post('/prompt', auth, validate('body', chatbotInstructionsSchema), updateInstruction);

app.delete('/:id', auth, validate('params', deleteChatbotSchema), deleteChatbot);

export default app;
