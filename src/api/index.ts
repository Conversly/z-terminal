import userRouter from './user/user-router';
import authRouter from './auth/auth-router';
import { Router } from 'express';

const routes = [
  { path: '/auth', router: authRouter },
  { path: '/user', router: userRouter },
];

export default (): Router => {
  const app = Router();
  routes.forEach((route) => {
    app.use(route.path, route.router);
  });

  return app;
};