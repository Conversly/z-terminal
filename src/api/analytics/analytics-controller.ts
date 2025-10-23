import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import { handleGetAnalytics } from './analytics-service';

export const getAnalytics = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = parseInt(req.params.chatbotId);

    if (isNaN(chatbotId)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid chatbot ID',
      });
    }

    const result = await handleGetAnalytics(
      req.user.userId as string,
      chatbotId
    );

    res.status(httpStatus.OK).json({
      success: result.success,
      data: result.data,
    });
  }
);
