import express from 'express';
import { auth } from '../../shared/middleware';
import {
  getUser,
} from './user-controller';

const app = express.Router();

app.get('/me', auth, getUser);

export default app;
