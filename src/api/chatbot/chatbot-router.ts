import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  createChatbot,
    GenerateInstruction,
    updateInstruction,
    getChatbots,
    deleteChatbot,
    getChatbot,
    createTopic,
    updateTopic,
    deleteTopic,
    getTopic,
} from './chatbot-controller';
import {
  getWhatsAppChats,
  getWhatsAppContactMessages,
} from '../whatsapp/whatsapp-controller';
import {
  createChatbotSchema,
  generateInstructionSchema,
  chatbotInstructionsSchema,
  deleteChatbotSchema,
  getChatbotSchema,
  createTopicSchema,
  topicIdParamsSchema,
  updateTopicBodySchema,
} from './chatbot-schema';
import { get } from 'http';

const app = express.Router();

app.get('/', auth, getChatbots);

app.post('/create', auth, validate('body', createChatbotSchema), createChatbot);

app.get('/generate-prompt', auth, validate('query', generateInstructionSchema), GenerateInstruction);

app.post('/prompt', auth, validate('body', chatbotInstructionsSchema), updateInstruction);

app.delete('/:id', auth, validate('params', deleteChatbotSchema), deleteChatbot);

app.get('/:id', auth, validate('params', getChatbotSchema), getChatbot);

// Topic routes
app.post(
  '/topics',
  auth,
  validate('body', createTopicSchema),
  createTopic
);

app.patch(
  '/topics',
  auth,
  validate('body', updateTopicBodySchema),
  updateTopic
);

app.delete(
  '/topics/:id',
  auth,
  validate('params', topicIdParamsSchema),
  deleteTopic
);

app.get(
  '/topics/:id',
  auth,
  validate('params', getChatbotSchema),
  getTopic
);

// WhatsApp nested routes
// GET /chatbot/:chatbotId/whatsapp/:whatsappId/chats - list all chats
app.get(
  '/:chatbotId/whatsapp/:whatsappId/chats',
  auth,
  getWhatsAppChats
);

// GET /chatbot/:chatbotId/whatsapp/:whatsappId/chats/:contactId - get messages for a contact
app.get(
  '/:chatbotId/whatsapp/:whatsappId/chats/:contactId',
  auth,
  getWhatsAppContactMessages
);

export default app;
