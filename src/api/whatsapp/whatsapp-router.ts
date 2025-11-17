import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  createWhatsAppIntegration,
  updateWhatsAppIntegration,
  getWhatsAppIntegration,
  deleteWhatsAppIntegration,
  sendMessage,
  getWhatsAppChats,
  getWhatsAppContactMessages,
  createWhatsAppContact,
  getWhatsAppAnalytics,
  getWhatsAppAnalyticsPerDay,
} from './whatsapp-controller';
import {
  createWhatsAppIntegrationSchema,
  updateWhatsAppIntegrationSchema,
  getWhatsAppIntegrationSchema,
  deleteWhatsAppIntegrationSchema,
  sendMessageSchema,
  createWhatsAppContactSchema,
} from './whatsapp-schema';

const app = express.Router();

// Note: Webhook routes have been moved to standalone whatsapp-webhook-service
// Webhook URL should be configured in Meta Console to point to the standalone service

// Integration management routes (auth required)
app.post(
  '/integration',
  auth,
  validate('body', createWhatsAppIntegrationSchema),
  createWhatsAppIntegration
);

app.patch(
  '/integration',
  auth,
  validate('query', getWhatsAppIntegrationSchema),
  validate('body', updateWhatsAppIntegrationSchema),
  updateWhatsAppIntegration
);

app.get(
  '/integration',
  auth,
  validate('query', getWhatsAppIntegrationSchema),
  getWhatsAppIntegration
);

app.delete(
  '/integration',
  auth,
  validate('query', deleteWhatsAppIntegrationSchema),
  deleteWhatsAppIntegration
);

// Send message route
app.post(
  '/send',
  auth,
  validate('query', getWhatsAppIntegrationSchema),
  validate('body', sendMessageSchema),
  sendMessage
);

// Get WhatsApp chats (list of contacts)
app.get(
  '/chats/:chatbotId/:whatsappId',
  auth,
  getWhatsAppChats
);

// Get messages for a specific contact
app.get(
  '/chats/:chatbotId/:whatsappId/:contactId',
  auth,
  getWhatsAppContactMessages
);

// Create WhatsApp contact
app.post(
  '/contacts/:chatbotId/:whatsappId',
  auth,
  validate('body', createWhatsAppContactSchema),
  createWhatsAppContact
);

// Get WhatsApp Analytics
app.get(
  '/analytics/:chatbotId/:whatsappId',
  auth,
  getWhatsAppAnalytics
);

// Get WhatsApp Analytics Per Day
app.get(
  '/analytics/per-day/:chatbotId/:whatsappId',
  auth,
  getWhatsAppAnalyticsPerDay
);

export default app;

