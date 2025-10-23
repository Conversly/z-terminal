import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import {
    handleProcessDatasource,
    handleDeleteKnowledge,
    handleFetchDataSources,
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

export const deleteKnowledge = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const { chatbotId, datasourceId } = req.body;

    const result = await handleDeleteKnowledge(
      req.user.userId as string,
      chatbotId,
      datasourceId
    );

    res.status(httpStatus.OK).json({
      success: result.success,
      message: result.message,
    });
  }
);

export const fetchDataSources = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = parseInt(req.params.chatbotId);

    if (isNaN(chatbotId)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid chatbot ID',
      });
    }

    const result = await handleFetchDataSources(
      req.user.userId as string,
      chatbotId
    );

    res.status(httpStatus.OK).json({
      success: result.success,
      data: result.data,
    });
  }
);
