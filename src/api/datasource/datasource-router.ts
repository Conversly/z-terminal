import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  processDatasource,
  deleteKnowledge,
  fetchDataSources,
} from './datasource-controller';
import {
  processRequestSchema,
  deleteKnowledgeSchema,
  fetchDataSourcesSchema,
} from './datasource-schema';

const app = express.Router();

app.post('/process', auth, validate('body', processRequestSchema), processDatasource);

app.delete('/knowledge', auth, validate('body', deleteKnowledgeSchema), deleteKnowledge);

app.get('/:chatbotId', auth, validate('params', fetchDataSourcesSchema), fetchDataSources);

export default app;
