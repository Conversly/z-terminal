import express from 'express';
import {
  logout,
  googleOauth,
  refreshToken,
  getSystemTime,
} from './auth-controller';
import { validate } from '../../shared/middleware';
import {
  googleOauthSchema,
} from './auth-schema';

const app = express.Router();

// google oauth method
app.post('/google-oauth', validate('body', googleOauthSchema), googleOauth);

// refresh token route
app.post('/refresh-token', refreshToken);

// logout route
app.post('/logout', logout);

app.get('/system-time', getSystemTime);

export default app;