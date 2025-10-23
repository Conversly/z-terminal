import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import {
    handleProcessDatasource,
} from './datasource-service';

export const processDatasource = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {

    const chatbot = await handleProcessDatasource(
      req.user.userId as string,
      req.body.chatbotId,
      req.body.websiteUrls,
      req.body.qandaData,
      req.body.documents,
      req.body.textContent
    );

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Datasource Processing Started',
      data: chatbot,
    });
  }
);
