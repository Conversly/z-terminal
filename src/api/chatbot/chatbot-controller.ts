import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import {
  handleCreateChatbot,
  handleGenerateInstruction,
  handleUpdateInstruction,
  handleGetChatbots,
  handleDeleteChatbot,
  handleGetChatbot,
} from './chatbot-service';
import { CreateChatbotInput, GenerateInstructionsInput, DeleteChatbotInput } from './types';

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

export const GenerateInstruction = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const input: GenerateInstructionsInput = {
      topic: req.query.topic as string,
    };

    const result = await handleGenerateInstruction(input);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Instructions generated successfully',
      data: result,
    });
  }
);

export const updateInstruction = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
      const systemPrompt = req.body.systemPrompt as string;
      const chatbotId = req.body.chatbotId as string;

    const result = await handleUpdateInstruction(systemPrompt, chatbotId);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Instructions updated successfully',
      data: result,
    });
  }
);

export const getChatbots = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbots = await handleGetChatbots(req.user.userId as string);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Chatbots fetched successfully',
      data: chatbots,
    });
  }
);

export const deleteChatbot = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const input: DeleteChatbotInput = {
      id: parseInt(req.params.id),
    };

    const result = await handleDeleteChatbot(req.user.userId as string, input);

    res.status(httpStatus.OK).json({
      success: true,
      message: result.message,
      data: result,
    });
  }
);

export const getChatbot = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {

    const result = await handleGetChatbot(parseInt(req.params.id));

    res.status(httpStatus.OK).json({
      success: true,
      data: result,
    });
  }
);