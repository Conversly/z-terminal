
import * as yup from 'yup';

export const getAnalyticsSchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
});

export const getSummarySchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
});

export const getChartsSchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
  days: yup.number()
    .oneOf([7, 30], 'Days must be either 7 or 30')
    .default(7),
});

export const getFeedbacksSchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
  limit: yup.number()
    .min(1)
    .max(50)
    .default(5),
});