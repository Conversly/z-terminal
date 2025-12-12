import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import ApiError from '../../utils/apiError';
import { jwtReq } from '../../types';
import {
    handleGetTemplates,
    handleSyncTemplates,
    handleCreateTemplate,
    handleDeleteTemplate,
    handleGetCampaigns,
    handleCreateCampaign,
    handleLaunchCampaign,
    handleGetContacts,
    handleGetCampaignStats
} from './whatsapp-marketing-service';
import { CreateCampaignInput, CreateTemplateInput } from './types';

// --- Templates ---

export const getTemplates = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.query.chatbotId as string;
        const result = await handleGetTemplates(chatbotId);
        res.status(httpStatus.OK).json({ success: true, data: result });
    }
);

export const syncTemplates = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.body.chatbotId;
        const result = await handleSyncTemplates(req.user.userId as string, chatbotId);
        res.status(httpStatus.OK).json({ success: true, count: result.length, data: result });
    }
);

export const createTemplate = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.body.chatbotId;
        const input: CreateTemplateInput = {
            name: req.body.name,
            category: req.body.category,
            language: req.body.language,
            components: req.body.components || [],
        };

        const result = await handleCreateTemplate(req.user.userId as string, chatbotId, input);
        res.status(httpStatus.CREATED).json({ success: true, data: result });
    }
);

export const deleteTemplate = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.query.chatbotId as string;
        const templateId = req.params.id;

        if (!chatbotId) {
            throw new ApiError('Chatbot ID is required', httpStatus.BAD_REQUEST);
        }

        const result = await handleDeleteTemplate(req.user.userId as string, chatbotId, templateId);
        res.status(httpStatus.OK).json({ success: true, data: result });
    }
);

// --- Campaigns ---

export const getCampaigns = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.query.chatbotId as string;
        const result = await handleGetCampaigns(chatbotId);
        res.status(httpStatus.OK).json({ success: true, data: result });
    }
);

export const createCampaign = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.body.chatbotId;
        const input: CreateCampaignInput = {
            name: req.body.name,
            templateId: req.body.templateId,
            scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
            // Audience handling would be complex (file upload etc), simplistic for now
        };

        const result = await handleCreateCampaign(req.user.userId as string, chatbotId, input);
        res.status(httpStatus.CREATED).json({ success: true, data: result });
    }
);

export const launchCampaign = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const { chatbotId } = req.query;
        const { id } = req.params;
        const { contactIds } = req.body; // Extract contactIds

        if (!chatbotId || typeof chatbotId !== 'string') {
            throw new ApiError('Chatbot ID is required', httpStatus.BAD_REQUEST);
        }

        const result = await handleLaunchCampaign(req.user.userId as string, id, chatbotId as string, contactIds); // Pass contactIds
        res.status(httpStatus.OK).json({ success: true, data: result });
    }
);

export const getCampaignStats = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const campaignId = req.params.id;
        const result = await handleGetCampaignStats(campaignId);
        res.status(httpStatus.OK).json({ success: true, data: result });
    }
);

// --- Contacts ---

export const getContacts = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.query.chatbotId as string;
        const result = await handleGetContacts(chatbotId);
        res.status(httpStatus.OK).json({ success: true, data: result });
    }
);
