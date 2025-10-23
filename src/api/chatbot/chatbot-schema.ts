import * as yup from 'yup';

export const createChatbotSchema = yup.object().shape({
  name: yup.string().required('Chatbot name is required').min(1, 'Name must not be empty'),
  description: yup.string().required('Description is required').min(1, 'Description must not be empty'),
  systemPrompt: yup.string().required('System prompt is required').min(1, 'System prompt must not be empty'),
});


export const getInstructionsSchema = yup.object().shape({
  topic: yup.string().required('Topic is required').min(1, 'Topic must not be empty'),
});