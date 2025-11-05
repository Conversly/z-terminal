import userRouter from './user/user-router';
import authRouter from './auth/auth-router';
import { Router } from 'express';
import chatbotRouter from './chatbot/chatbot-router';
import datasourceRouter from './datasource/datasource-router';
import analyticsRouter from './analytics/analytics-router';
import deployRouter from './deploy/deploy-router';
import setupRouter from './setup/setup-router';


const routes = [
  { path: '/auth', router: authRouter },
  { path: '/user', router: userRouter },
  { path: '/chatbot', router: chatbotRouter },
  { path: '/datasource', router: datasourceRouter },
  { path: '/analytics', router: analyticsRouter },
  { path: '/deploy', router: deployRouter },
  { path: '/setup', router: setupRouter },
];

export default (): Router => {
  const app = Router();
  routes.forEach((route) => {
    app.use(route.path, route.router);
  });

  return app;
};