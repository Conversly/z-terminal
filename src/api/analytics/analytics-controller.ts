import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import { handleGetAnalytics, handleGetSummary, handleGetCharts, handleGetFeedbacks } from './analytics-service';

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

export const getSummary = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = parseInt(req.query.chatbotId as string);
    const result = await handleGetSummary(req.user.userId as string, chatbotId);
    res.status(httpStatus.OK).json({ success: result.success, data: result.data });
  }
);

export const getCharts = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = parseInt(req.query.chatbotId as string);
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    const result = await handleGetCharts(req.user.userId as string, chatbotId, days);
    res.status(httpStatus.OK).json({ success: result.success, data: result.data });
  }
);

export const getFeedbacks = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = parseInt(req.query.chatbotId as string);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const result = await handleGetFeedbacks(req.user.userId as string, chatbotId, limit);
    res.status(httpStatus.OK).json({ success: result.success, data: result.data });
  }
);
