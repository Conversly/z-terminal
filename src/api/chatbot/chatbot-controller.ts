import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import {
  handleCreateChatbot,
  handleGetInstructions,
} from './chatbot-service';
import { CreateChatbotInput, GetInstructionsInput } from './types';

export const createChatbot = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const input: CreateChatbotInput = {
      name: req.body.name,
      description: req.body.description,
      systemPrompt: req.body.systemPrompt,
    };

    const chatbot = await handleCreateChatbot(req.user.userId as string, input);

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Chatbot created successfully',
      data: chatbot,
    });
  }
);

export const GetInstructions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const input: GetInstructionsInput = {
      topic: req.body.topic,
    };

    const result = await handleGetInstructions(input);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Instructions generated successfully',
      data: result,
    });
  }
);