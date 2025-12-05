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
import { generateLivekitVoiceToken } from './livekit-service';
import { UpdateVoiceConfigInput } from './voice-types';
import { VoiceTokenRequest } from './livekit-types';
import { voiceTokenRequestSchema } from './livekit-schema';
import { verifyChatbotOwnership } from '../../shared/helper-queries';
import logger from '../../loaders/logger';

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

/**
 * Generate a LiveKit voice token for real-time voice communication
 * POST /voice/:chatbotId/token
 * Matches frontend POC request structure
 */
export const generateVoiceToken = catchAsync(async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId;
    const userId = req.user.userId as string;

    // Verify user owns this chatbot
    await verifyChatbotOwnership(chatbotId, userId);

    // Validate request body - handle both direct body and nested data property
    const requestBody = req.body?.data || req.body;
    const validatedBody = await voiceTokenRequestSchema.validate(requestBody, {
        abortEarly: false,
    });

    // Extract agent name from room_config (if provided)
    // Important: Empty string "" is valid and should be passed through (matches Python agent registration)
    // Only use default if agent_name is completely missing (undefined)
    const agentName = validatedBody.room_config?.agents?.[0]?.agent_name;
    const hasAgentName = validatedBody.room_config?.agents?.[0]?.hasOwnProperty('agent_name');

    // Import voice utils for name-to-ID conversion
    const { getElevenLabsVoiceId } = await import('./voice-utils');
    
    // Build agent config with defaults
    // Convert voice name to voice ID if needed (e.g., "rachel" -> "21m00Tcm4TlvDq8ikWAM")
    const rawVoiceId = validatedBody.agent_config?.tts_voice || '21m00Tcm4TlvDq8ikWAM';
    const agentConfig = {
        instructions: validatedBody.agent_config?.instructions || 'You are a helpful voice assistant.',
        tts_voice: getElevenLabsVoiceId(rawVoiceId), // Convert name to ID if needed
        stt_language: validatedBody.agent_config?.stt_language || 'en',
        tts_language: validatedBody.agent_config?.tts_language || 'en',
    };

    logger.info(`Generating LiveKit token for chatbot ${chatbotId}`, {
        agentName: hasAgentName ? (agentName === '' ? '(empty)' : agentName) : 'default',
        instructions: agentConfig.instructions.substring(0, 50) + '...',
        tts_voice: agentConfig.tts_voice,
        stt_language: agentConfig.stt_language,
        tts_language: agentConfig.tts_language,
    });

    // Generate LiveKit token
    // Pass undefined if agent_name wasn't provided at all, empty string if explicitly set to ""
    const agentNameToPass = hasAgentName ? agentName : undefined;
    const tokenResponse = await generateLivekitVoiceToken(
        chatbotId,
        userId,
        agentConfig,
        agentNameToPass
    );

    logger.info(`LiveKit token generated successfully for room: ${tokenResponse.roomName}`);

    res.status(httpStatus.OK).json({
        success: true,
        message: 'Voice token generated successfully',
        data: tokenResponse,
    });
});

