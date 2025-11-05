import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  processDatasource,
  deleteKnowledge,
  fetchDataSources,
  addCitation,
  fetchEmbeddings,
  fetchSitemap,
} from './datasource-controller';
import {
  processRequestSchema,
  deleteKnowledgeSchema,
  fetchDataSourcesSchema,
  addCitationSchema,
  fetchEmbeddingsSchema,
  fetchSitemapRequestSchema
} from './datasource-schema';

const app = express.Router();

app.post('/process', auth, validate('body', processRequestSchema), processDatasource);

app.post('/sitemap', auth, validate('body', fetchSitemapRequestSchema), fetchSitemap);

app.delete('/knowledge', auth, validate('body', deleteKnowledgeSchema), deleteKnowledge);

app.get('/:chatbotId', auth, validate('params', fetchDataSourcesSchema), fetchDataSources);

app.put('/citation', auth, validate('body', addCitationSchema), addCitation);

app.get('/embeddings/:dataSourceId', auth, validate('params', fetchEmbeddingsSchema), fetchEmbeddings);

export default app;
