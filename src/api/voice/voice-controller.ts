import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { jwtReq } from '../../types';
import {
    handleGetVoiceConfig,
    handleUpdateVoiceConfig,
    handleDeleteVoiceConfig,
    handleGetVoiceWidgetConfig,
    handleGetVoiceCallSessions
} from './voice-service';
import { UpdateVoiceConfigInput } from './voice-types';

export const getVoiceConfig = catchAsync(async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId;
    const userId = req.user.userId as string;

    const config = await handleGetVoiceConfig(chatbotId, userId);

    res.status(httpStatus.OK).json({
        success: true,
        data: config,
    });
});

export const updateVoiceConfig = catchAsync(async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId;
    const updates = req.body as UpdateVoiceConfigInput;
    const userId = req.user.userId as string;

    const config = await handleUpdateVoiceConfig(chatbotId, userId, updates);

    res.status(httpStatus.OK).json({
        success: true,
        message: 'Voice config updated successfully',
        data: config,
    });
});

export const deleteVoiceConfig = catchAsync(async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId;
    const userId = req.user.userId as string;

    await handleDeleteVoiceConfig(chatbotId, userId);

    res.status(httpStatus.OK).json({
        success: true,
        message: 'Voice config deleted successfully',
    });
});

export const getVoiceWidgetConfig = catchAsync(async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId;
    const userId = req.user.userId as string;

    const config = await handleGetVoiceWidgetConfig(chatbotId, userId);

    res.status(httpStatus.OK).json({
        success: true,
        data: config,
    });
});

export const getVoiceCallSessions = catchAsync(async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId;
    const userId = req.user.userId as string;

    const sessions = await handleGetVoiceCallSessions(chatbotId, userId);

    res.status(httpStatus.OK).json({
        success: true,
        data: sessions,
    });
});
