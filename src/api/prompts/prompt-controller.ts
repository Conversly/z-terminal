import httpStatus from 'http-status';
import { Response, NextFunction } from 'express';
import catchAsync from '../../utils/catchAsync';
import { jwtReq } from '../../types';
import {
  handleGetAllPrompts,
  handleUpdateBasePrompt,
  handleUpsertChannelPrompt,
  handleDeleteChannelPrompt,
  handleGetChannelPrompt,
  handleGenerateBasePrompt,
  handleGenerateChannelPrompt,
} from './prompt-service';
import {
  UpdateBasePromptInput,
  GenerateBasePromptInput,
  UpsertChannelPromptInput,
  GenerateChannelPromptInput,
  DeleteChannelPromptInput,
  ChannelType,
} from './types';

/**
 * Get all prompts for a chatbot (base + channel-specific)
 */
export const getAllPrompts = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId;

    const result = await handleGetAllPrompts(chatbotId);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Prompts fetched successfully',
      data: result,
    });
  }
);

/**
 * Update base prompt
 */
export const updateBasePrompt = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const input: UpdateBasePromptInput = {
      chatbotId: req.body.chatbotId,
      systemPrompt: req.body.systemPrompt,
    };

    const result = await handleUpdateBasePrompt(input);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Base prompt updated successfully',
      data: result,
    });
  }
);

/**
 * Upsert channel prompt (create or update)
 */
export const upsertChannelPrompt = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const input: UpsertChannelPromptInput = {
      chatbotId: req.body.chatbotId,
      channel: req.body.channel as ChannelType,
      systemPrompt: req.body.systemPrompt,
    };

    const result = await handleUpsertChannelPrompt(input);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Channel prompt saved successfully',
      data: result,
    });
  }
);

/**
 * Delete channel prompt
 */
export const deleteChannelPrompt = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const input: DeleteChannelPromptInput = {
      id: req.params.id,
    };

    const result = await handleDeleteChannelPrompt(input);

    res.status(httpStatus.OK).json({
      success: true,
      message: result.message,
      data: result,
    });
  }
);

/**
 * Get single channel prompt
 */
export const getChannelPrompt = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId;
    const channel = req.params.channel as ChannelType;

    const result = await handleGetChannelPrompt(chatbotId, channel);

    res.status(httpStatus.OK).json({
      success: true,
      message: result ? 'Channel prompt found' : 'No channel prompt configured',
      data: result,
    });
  }
);

/**
 * Generate base prompt using AI
 */
export const generateBasePrompt = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const input: GenerateBasePromptInput = {
      businessDescription: req.query.businessDescription as string,
      tone: req.query.tone as string | undefined,
      targetAudience: req.query.targetAudience as string | undefined,
    };

    const result = await handleGenerateBasePrompt(input);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Base prompt generated successfully',
      data: result,
    });
  }
);

/**
 * Generate channel-specific prompt using AI
 */
export const generateChannelPrompt = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const input: GenerateChannelPromptInput = {
      chatbotId: req.query.chatbotId as string,
      channel: req.query.channel as ChannelType,
    };

    const result = await handleGenerateChannelPrompt(input);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Channel prompt generated successfully',
      data: result,
    });
  }
);

