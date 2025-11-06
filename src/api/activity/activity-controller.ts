import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import { handleGetChatlogs, handleGetMessages } from './activity-service';

export const getChatlogs = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = parseInt(req.query.chatbotId as string);

    if (isNaN(chatbotId)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid chatbot ID',
      });
    }

    const result = await handleGetChatlogs(
      req.user.userId as string,
      chatbotId
    );

    res.status(httpStatus.OK).json({
      success: result.success,
      data: result.data,
    });
  }
);

export const getMessages = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = parseInt(req.query.chatbotId as string);
    const uniqueConvId = (req.query.uniqueConvId as string) || '';

    if (isNaN(chatbotId) || !uniqueConvId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid chatbot ID or uniqueConvId',
      });
    }

    const result = await handleGetMessages(
      req.user.userId as string,
      chatbotId,
      uniqueConvId
    );

    res.status(httpStatus.OK).json({
      success: result.success,
      data: result.data,
    });
  }
);
