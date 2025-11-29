import express from 'express';
import {
  logout,
  googleOauth,
  refreshToken,
  getSystemTime,
  initiateGoogleAuth,
  googleOAuthCallback,
  emailPasswordLogin,
  emailPasswordRegister,
  verifyEmail,
} from './auth-controller';
import { validate } from '../../shared/middleware';
import {
  googleOauthSchema,
  emailPasswordLoginSchema,
  emailPasswordRegisterSchema,
} from './auth-schema';

const app = express.Router();

// Email/Password authentication
app.post('/register', validate('body', emailPasswordRegisterSchema), emailPasswordRegister);
app.post('/login', validate('body', emailPasswordLoginSchema), emailPasswordLogin);
app.get('/verify-email', verifyEmail);

// google oauth method
app.post('/google-oauth', validate('body', googleOauthSchema), googleOauth);

// Redirect-based Google OAuth (initiate)
app.get('/google', initiateGoogleAuth);

// Redirect-based Google OAuth (callback)
app.get('/google/callback', googleOAuthCallback);

// refresh token route
app.post('/refresh-token', refreshToken);

// logout route
app.post('/logout', logout);

app.get('/system-time', getSystemTime);

export default app;