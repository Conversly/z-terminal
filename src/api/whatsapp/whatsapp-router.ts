import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  createWhatsAppIntegration,
  updateWhatsAppIntegration,
  getWhatsAppIntegration,
  deleteWhatsAppIntegration,
  sendMessage,
} from './whatsapp-controller';
import {
  createWhatsAppIntegrationSchema,
  updateWhatsAppIntegrationSchema,
  getWhatsAppIntegrationSchema,
  deleteWhatsAppIntegrationSchema,
  sendMessageSchema,
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

export default app;

