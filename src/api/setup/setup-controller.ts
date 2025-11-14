import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import {
  handleAnalyzeImage,
  handleInferPrompt,
  handleSearchSources,
  handleGenerateTopics,
  handleFetchSitemap,
} from './setup-service';


export const inferPrompt = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const data = await handleInferPrompt(
      req.user.userId as string,
      req.body.chatbotId,
      req.body.websiteUrl,
      req.body.useCase,
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Inferred chatbot prompt and metadata',
      data,
    });
  }
);

export const analyzeImage = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const data = await handleAnalyzeImage(
      req.user.userId as string,
      req.body.chatbotId,
      req.body.imageUrl,
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Analyzed primary color',
      data,
    });
  }
);

export const searchSources = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const data = await handleSearchSources(
      req.user.userId as string,
      req.body.chatbotId,
      req.body.websiteUrl,
      req.body.useCase,
    );

    res.status(httpStatus.CREATED).json(data);
  }
);

export const generateTopics = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const data = await handleGenerateTopics(
      req.user.userId as string,
      req.body.chatbotId,
      req.body.websiteUrl,
      req.body.useCase,
    );
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Generated topics',
      data,
    });
  }
);

export const getApiKeyStats = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const { getKeyRotationManager } = await import('../../shared/apiKeyRotationManager');
    const keyManager = getKeyRotationManager();
    const stats = keyManager.getStats();

    res.status(httpStatus.OK).json({
      success: true,
      message: 'API key rotation statistics',
      data: stats,

export const fetchSitemap = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const data = await handleFetchSitemap(
      req.user.userId as string,
      req.body.websiteUrl,
    );
        res.status(httpStatus.OK).json({
      success: true,
      message: 'Fetched sitemap',
      data,
    });
  }
);