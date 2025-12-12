import userRouter from './user/user-router';
import authRouter from './auth/auth-router';
import { Router } from 'express';
import chatbotRouter from './chatbot/chatbot-router';
import datasourceRouter from './datasource/datasource-router';
import analyticsRouter from './analytics/analytics-router';
import deployRouter from './deploy/deploy-router';
import setupRouter from './setup/setup-router';
import activityRouter from './activity/activity-router';
import whatsappRouter from './whatsapp/whatsapp-router';
import actionRouter from './actions/action-router';
import voiceRouter from './voice/voice-router';
import promoteRouter from './promote/promote-router';
import promptRouter from './prompts/prompt-router';

const routes = [
  { path: '/auth', router: authRouter },
  { path: '/user', router: userRouter },
  { path: '/chatbot', router: chatbotRouter },
  { path: '/datasource', router: datasourceRouter },
  { path: '/analytics', router: analyticsRouter },
  { path: '/deploy', router: deployRouter },
  { path: '/setup', router: setupRouter },
  { path: '/activity', router: activityRouter },
  { path: '/whatsapp', router: whatsappRouter },
  { path: '/actions', router: actionRouter },
  { path: '/voice', router: voiceRouter },
  { path: '/promote', router: promoteRouter },
  { path: '/prompts', router: promptRouter },
];

export default (): Router => {
  const app = Router();
  routes.forEach((route) => {
    app.use(route.path, route.router);
  });

  return app;
};