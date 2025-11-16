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
  chatbotId: yup.string()
    .uuid('Chatbot ID must be a valid UUID')
    .required('Chatbot ID is required'),
  datasourceId: yup.string()
    .uuid('Datasource ID must be a valid UUID')
    .required('Datasource ID is required'),
});

export const fetchDataSourcesSchema = yup.object().shape({
  chatbotId: yup.string()
    .uuid('Chatbot ID must be a valid UUID')
    .required('Chatbot ID is required'),
});

export const addCitationSchema = yup.object().shape({
  chatbotId: yup.string()
    .uuid('Chatbot ID must be a valid UUID')
    .required('Chatbot ID is required'),
  dataSourceId: yup.string()
    .uuid('Data source ID must be a valid UUID')
    .required('Data source ID is required'),
  citation: yup.string()
    .trim()
    .min(1, 'Citation cannot be empty')
    .max(1000, 'Citation must be less than 1000 characters')
    .required('Citation is required'),
});

export const fetchEmbeddingsSchema = yup.object().shape({
  dataSourceId: yup.string()
    .uuid('Data source ID must be a valid UUID')
    .required('Data source ID is required'),
});

// Schema for ingestion service request
const websiteUrlWithIdSchema = yup.object().shape({
  datasourceId: yup.string()
    .uuid('Datasource ID must be a valid UUID')
    .required('Datasource ID is required'),
  url: yup.string().url('Invalid URL format').required('URL is required'),
});

const documentWithIdSchema = yup.object().shape({
  datasourceId: yup.string()
    .uuid('Datasource ID must be a valid UUID')
    .required('Datasource ID is required'),
  url: yup.string().url('Invalid URL format').required('Document URL is required'),
  downloadUrl: yup.string().url('Invalid download URL format').required('Download URL is required'),
  pathname: yup.string().required('Pathname is required'),
  contentType: yup.string().required('Content type is required'),
  contentDisposition: yup.string().required('Content disposition is required'),
});

const qaPairWithIdSchema = yup.object().shape({
  datasourceId: yup.string()
    .uuid('Datasource ID must be a valid UUID')
    .required('Datasource ID is required'),
  question: yup.string().required('Question is required'),
  answer: yup.string().required('Answer is required'),
  citations: yup.string().optional(),
});

const textContentWithIdSchema = yup.object().shape({
  datasourceId: yup.string()
    .uuid('Datasource ID must be a valid UUID')
    .required('Datasource ID is required'),
  content: yup.string().required('Text content is required'),
});

export const ingestionRequestSchema = yup.object().shape({
  chatbotId: yup.string().required('Chatbot ID is required'),
  websiteUrls: yup.array().of(websiteUrlWithIdSchema).optional(),
  documents: yup.array().of(documentWithIdSchema).optional(),
  qandaData: yup.array().of(qaPairWithIdSchema).optional(),
  textContent: yup.array().of(textContentWithIdSchema).optional(),
});

export const fetchSitemapRequestSchema = yup.object().shape({
  websiteUrl : yup.string().url('Invalid URL format').required('Website URL is required'),
  useCase: yup.string().default('Ai-Assistant').optional(),
});