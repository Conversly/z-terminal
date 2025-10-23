
import * as yup from 'yup';

export const getAnalyticsSchema = yup.object().shape({
  chatbotId: yup.string()
    .matches(/^\d+$/, 'Chatbot ID must be a valid number')
    .required('Chatbot ID is required'),
});
