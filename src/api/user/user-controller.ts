import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import {
  handleGetUser,
} from './user-service';

export const getUser = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const user = await handleGetUser(req.user.userId as string);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'User fetched successfully',
      data: user,
    });
  }
);

