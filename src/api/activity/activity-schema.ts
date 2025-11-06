import * as yup from 'yup';

export const getChatlogsSchema = yup.object().shape({
  chatbotId: yup
    .string()
    .matches(/^\d+$/, 'Chatbot ID must be a valid number')
    .required('Chatbot ID is required'),
});

export const getMessagesSchema = yup.object().shape({
  chatbotId: yup
    .string()
    .matches(/^\d+$/, 'Chatbot ID must be a valid number')
    .required('Chatbot ID is required'),
  uniqueConvId: yup
    .string()
    .trim()
    .required('uniqueConvId is required'),
});