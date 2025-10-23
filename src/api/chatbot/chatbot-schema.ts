import * as yup from 'yup';

export const createChatbotSchema = yup.object().shape({
  name: yup.string().required('Chatbot name is required').min(1, 'Name must not be empty'),
  description: yup.string().required('Description is required').min(1, 'Description must not be empty'),
  systemPrompt: yup.string().required('System prompt is required').min(1, 'System prompt must not be empty'),
});


export const generateInstructionSchema = yup.object().shape({
  topic: yup.string().required('Topic is required').min(1, 'Topic must not be empty'),
});

export const chatbotInstructionsSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  systemPrompt: yup.string().required('System prompt is required').min(1, 'System prompt must not be empty'),
});

export const deleteChatbotSchema = yup.object().shape({
  id: yup.number()
    .required('Chatbot ID is required')
    .positive('Chatbot ID must be a positive number')
    .integer('Chatbot ID must be an integer'),
});