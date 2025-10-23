import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  processDatasource,
} from './datasource-controller';
import {
processRequestSchema,
} from './datasource-schema';

const app = express.Router();

app.post('/process', auth, validate('body', processRequestSchema), processDatasource);


export default app;
