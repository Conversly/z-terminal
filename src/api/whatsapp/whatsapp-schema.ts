import * as yup from 'yup';

export const createWhatsAppIntegrationSchema = yup.object().shape({
  chatbotId: yup
    .string()
    .required('Chatbot ID is required'),
  phoneNumberId: yup
    .string()
    .required('Phone Number ID is required')
    .min(1, 'Phone Number ID must not be empty'),
  accessToken: yup
    .string()
    .required('Access Token is required')
    .min(1, 'Access Token must not be empty'),
  verifyToken: yup
    .string()
    .required('Verify Token is required')
    .min(8, 'Verify Token must be at least 8 characters'),
  webhookSecret: yup
    .string()
    .optional()
    .min(1, 'Webhook Secret must not be empty if provided'),
  businessAccountId: yup.string().optional(),
  webhookUrl: yup.string().url('Invalid webhook URL format').optional(),
});

export const updateWhatsAppIntegrationSchema = yup.object().shape({
  phoneNumberId: yup.string().optional().min(1, 'Phone Number ID must not be empty'),
  accessToken: yup.string().optional().min(1, 'Access Token must not be empty'),
  verifyToken: yup.string().optional().min(8, 'Verify Token must be at least 8 characters'),
  webhookSecret: yup.string().optional().min(1, 'Webhook Secret must not be empty if provided'),
  businessAccountId: yup.string().optional(),
  webhookUrl: yup.string().url('Invalid webhook URL format').optional(),
}).test('at-least-one', 'Provide at least one field to update', (value) => {
  if (!value) return false;
  return !!(
    value.phoneNumberId ||
    value.accessToken ||
    value.verifyToken ||
    value.webhookSecret ||
    value.businessAccountId !== undefined ||
    value.webhookUrl
  );
});

export const getWhatsAppIntegrationSchema = yup.object().shape({
  chatbotId: yup
    .string()
    .required('Chatbot ID is required'),
});

export const deleteWhatsAppIntegrationSchema = yup.object().shape({
  chatbotId: yup
    .string()
    .required('Chatbot ID is required'),
});

export const webhookVerifySchema = yup.object().shape({
  'hub.mode': yup.string().required(),
  'hub.verify_token': yup.string().required(),
  'hub.challenge': yup.string().required(),
});

export const sendMessageSchema = yup.object().shape({
  to: yup
    .string()
    .required('Recipient phone number is required')
    .matches(/^\d+$/, 'Phone number must contain only digits'),
  message: yup
    .string()
    .required('Message is required')
    .min(1, 'Message must not be empty')
    .max(4096, 'Message is too long (max 4096 characters)'),
});

export const createWhatsAppContactSchema = yup.object().shape({
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (e.g., +1234567890)'),
  displayName: yup
    .string()
    .optional()
    .max(255, 'Display name must not exceed 255 characters'),
});

// --- Marketing Schemas ---

export const createTemplateSchema = yup.object().shape({
  chatbotId: yup.string().required(),
  name: yup.string().required(),
  category: yup.string().required(), // MARKETING, UTILITY, etc.
  language: yup.string().required(), // en_US
  components: yup.array().optional(), // Complex validation skipped for now
});

export const syncTemplatesSchema = yup.object().shape({
  chatbotId: yup.string().required(),
});

export const createCampaignSchema = yup.object().shape({
  chatbotId: yup.string().required(),
  name: yup.string().required(),
  templateId: yup.string().required(),
  scheduledAt: yup.date().optional(),
  audienceFile: yup.mixed().optional(), // If uploading CSV
});

export const launchCampaignSchema = yup.object().shape({
  chatbotId: yup.string().required(), // Security check
});

export const markMessagesAsReadSchema = yup.object().shape({
  messageIds: yup
    .array()
    .of(yup.string().required())
    .min(1, 'At least one message ID is required')
    .required('messageIds array is required'),
});


