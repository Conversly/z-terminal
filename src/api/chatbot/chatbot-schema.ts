import * as yup from 'yup';

export const createChatbotSchema = yup.object().shape({
  name: yup.string().required('Chatbot name is required').min(1, 'Name must not be empty'),
  description: yup.string().required('Description is required').min(1, 'Description must not be empty'),
  systemPrompt: yup.string().required('System prompt is required').min(1, 'System prompt must not be empty'),
  status: yup.string().optional().default('INACTIVE'),
});


export const generateInstructionSchema = yup.object().shape({
  topic: yup.string().required('Topic is required').min(1, 'Topic must not be empty'),
});

export const chatbotInstructionsSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  systemPrompt: yup.string().required('System prompt is required').min(1, 'System prompt must not be empty'),
});

export const deleteChatbotSchema = yup.object().shape({
  id: yup.string()
    .uuid('Chatbot ID must be a valid UUID')
    .required('Chatbot ID is required'),
});

export const getChatbotSchema = yup.object().shape({
  id: yup.string()
    .uuid('Chatbot ID must be a valid UUID')
    .required('Chatbot ID is required'),
});

// Topics
export const createTopicSchema = yup.object().shape({
  chatbotId: yup
    .string()
    .uuid('Chatbot ID must be a valid UUID')
    .required('Chatbot ID is required'),
  name: yup.string().required('Topic name is required').min(1, 'Name must not be empty'),
});

export const topicIdParamsSchema = yup.object().shape({
  id: yup
    .string()
    .uuid('Topic ID must be a valid UUID')
    .required('Topic ID is required'),
});

export const updateTopicBodySchema = yup
  .object()
  .shape({
    id: yup.string()
      .uuid('Topic ID must be a valid UUID')
      .required('Topic ID is required'),
    name: yup.string().optional().min(1, 'Name must not be empty')
  })
  .test('at-least-one', 'Provide at least one field to update', (value) => {
    if (!value) return false;
    return typeof value.name === 'string';
  });