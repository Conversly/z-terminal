
import * as yup from 'yup';

const qaPairSchema = yup.object().shape({
  question: yup.string().required('Question is required'),
  answer: yup.string().required('Answer is required'),
  citations: yup.string().optional(),
});


const documentSchema = yup.object().shape({
    url: yup.string().url('Invalid URL format').required('Document URL is required'),
    downloadUrl: yup.string().url('Invalid download URL format').required('Download URL is required'),
    pathname: yup.string().required('Pathname is required'),
    contentType: yup.string().required('Content type is required'),
    contentDisposition: yup.string().required('Content disposition is required'),
});

export const processRequestSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  websiteUrls: yup.array().of(yup.string().required()).optional(),
  qandaData: yup.array().of(qaPairSchema).optional(),
  documents: yup.array().of(documentSchema).optional(),
  textContent: yup.array().of(yup.string().required()).optional(),
});

export const deleteKnowledgeSchema = yup.object().shape({
  chatbotId: yup.number()
    .integer('Chatbot ID must be an integer')
    .positive('Chatbot ID must be positive')
    .required('Chatbot ID is required'),
  datasourceId: yup.number()
    .integer('Datasource ID must be an integer')
    .positive('Datasource ID must be positive')
    .required('Datasource ID is required'),
});

export const fetchDataSourcesSchema = yup.object().shape({
  chatbotId: yup.string()
    .matches(/^\d+$/, 'Chatbot ID must be a valid number')
    .required('Chatbot ID is required'),
});

export const addCitationSchema = yup.object().shape({
  chatbotId: yup.number()
    .integer('Chatbot ID must be an integer')
    .positive('Chatbot ID must be positive')
    .required('Chatbot ID is required'),
  dataSourceId: yup.number()
    .integer('Data source ID must be an integer')
    .positive('Data source ID must be positive')
    .required('Data source ID is required'),
  citation: yup.string()
    .trim()
    .min(1, 'Citation cannot be empty')
    .max(1000, 'Citation must be less than 1000 characters')
    .required('Citation is required'),
});

export const fetchEmbeddingsSchema = yup.object().shape({
  dataSourceId: yup.string()
    .matches(/^\d+$/, 'Data source ID must be a valid number')
    .required('Data source ID is required'),
});
