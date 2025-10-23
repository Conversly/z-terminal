
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
