import * as yup from 'yup';


export const analyzeImageRequestSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  imageUrl: yup.string().url('Invalid URL format').required('Image URL is required'),
});

export const fetchSitemapRequestSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  websiteUrl : yup.string().url('Invalid URL format').required('Website URL is required'),
});

export const inferPromptRequestSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  websiteUrl: yup.string().url('Invalid URL format').required('Website URL is required'),
  useCase: yup.string().default('Ai-Assistant').optional(),
});

export const generateTopicsRequestSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  websiteUrl: yup.string().url('Invalid URL format').required('Website URL is required'),
  useCase: yup.string().default('Ai-Assistant').optional(),
});
