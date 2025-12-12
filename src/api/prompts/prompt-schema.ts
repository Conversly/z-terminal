import * as yup from 'yup';

const validChannels = ['WIDGET', 'WHATSAPP', 'VOICE'] as const;

// Get all prompts for a chatbot
export const getChatbotPromptsSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
});

// Update base prompt
export const updateBasePromptSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  systemPrompt: yup.string().required('System prompt is required').min(1, 'System prompt must not be empty'),
});

// Generate base prompt via AI
export const generateBasePromptSchema = yup.object().shape({
  businessDescription: yup.string().required('Business description is required').min(10, 'Please provide a more detailed description'),
  tone: yup.string().optional(),
  targetAudience: yup.string().optional(),
});

// Upsert channel prompt (create or update)
export const upsertChannelPromptSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  channel: yup
    .string()
    .required('Channel is required')
    .oneOf(validChannels, 'Channel must be one of: WIDGET, WHATSAPP, VOICE'),
  systemPrompt: yup.string().required('System prompt is required').min(1, 'System prompt must not be empty'),
});

// Generate channel prompt via AI
export const generateChannelPromptSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  channel: yup
    .string()
    .required('Channel is required')
    .oneOf(validChannels, 'Channel must be one of: WIDGET, WHATSAPP, VOICE'),
});

// Delete channel prompt
export const deleteChannelPromptSchema = yup.object().shape({
  id: yup.string().required('Channel prompt ID is required'),
});

// Get single channel prompt
export const getChannelPromptSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  channel: yup
    .string()
    .required('Channel is required')
    .oneOf(validChannels, 'Channel must be one of: WIDGET, WHATSAPP, VOICE'),
});

