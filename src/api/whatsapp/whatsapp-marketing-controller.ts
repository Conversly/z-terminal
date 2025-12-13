import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import ApiError from '../../utils/apiError';
import { jwtReq } from '../../types';
import {
    handleGetTemplates,
    handleSyncTemplates,
    handleCreateTemplate,
    handleCreateDefaultTemplate,
    handleUpdateTemplate,
    handleGetDefaultTemplates,
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
        res.status(httpStatus.OK).json({ success: true, count: result.count, data: result.data });
    }
);

export const createTemplate = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.body.chatbotId;
        const input: CreateTemplateInput = {
            chatbotId: chatbotId,
            name: req.body.name,
            category: req.body.category,
            language: req.body.language,
            components: req.body.components || [],
            allowCategoryChange: req.body.allowCategoryChange,
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

export const getDefaultTemplates = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.query.chatbotId as string;
        if (!chatbotId) {
            throw new ApiError('Chatbot ID is required', httpStatus.BAD_REQUEST);
        }
        const result = await handleGetDefaultTemplates(req.user.userId as string, chatbotId);
        res.status(httpStatus.OK).json({ success: true, data: result });
    }
);

export const createDefaultTemplate = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.body.chatbotId;
        const input: CreateTemplateInput = {
            chatbotId: chatbotId,
            name: req.body.name,
            category: req.body.category,
            language: req.body.language,
            components: req.body.components || [],
            allowCategoryChange: req.body.allowCategoryChange,
            saveAsDraft: req.body.saveAsDraft || false,
        };

        const result = await handleCreateDefaultTemplate(
            req.user.userId as string, 
            chatbotId, 
            {
                name: input.name,
                category: input.category,
                language: input.language,
                components: input.components,
                allowCategoryChange: input.allowCategoryChange,
                saveAsDraft: input.saveAsDraft,
            }
        );
        res.status(httpStatus.CREATED).json({ success: true, data: result });
    }
);

export const updateTemplate = catchAsync(
    async (req: jwtReq, res: Response, next: NextFunction) => {
        const chatbotId = req.query.chatbotId as string;
        const templateId = req.params.id;

        if (!chatbotId) {
            throw new ApiError('Chatbot ID is required', httpStatus.BAD_REQUEST);
        }

        const input: Partial<CreateTemplateInput> = {};
        if (req.body.name) input.name = req.body.name;
        if (req.body.category) input.category = req.body.category;
        if (req.body.language) input.language = req.body.language;
        if (req.body.components) input.components = req.body.components;

        const result = await handleUpdateTemplate(
            req.user.userId as string,
            chatbotId,
            templateId,
            {
                ...input,
                allowCategoryChange: req.body.allowCategoryChange,
            }
        );
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
