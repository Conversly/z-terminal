import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import {
  handleCreateWhatsAppIntegration,
  handleUpdateWhatsAppIntegration,
  handleGetWhatsAppIntegration,
  handleDeleteWhatsAppIntegration,
  handleSendWhatsAppMessage,
  handleMarkMessagesAsRead,
  handleGetWhatsAppChats,
  handleGetWhatsAppContactMessages,
  handleCreateWhatsAppContact,
  handleGetWhatsAppAnalytics,
  handleGetWhatsAppAnalyticsPerDay,
} from './whatsapp-service';
import {
  CreateWhatsAppIntegrationInput,
  UpdateWhatsAppIntegrationInput,
  SendWhatsAppMessageInput,
  WhatsAppWebhookPayload,
  CreateWhatsAppContactInput,
} from './types';
import env from '../../config';
import logger from '../../loaders/logger';

export const createWhatsAppIntegration = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const input: CreateWhatsAppIntegrationInput = {
      chatbotId: req.body.chatbotId,
      phoneNumberId: req.body.phoneNumberId,
      accessToken: req.body.accessToken,
      verifyToken: req.body.verifyToken,
      businessAccountId: req.body.businessAccountId,
      webhookUrl: req.body.webhookUrl,
    };

    const integration = await handleCreateWhatsAppIntegration(
      req.user.userId as string,
      input
    );

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'WhatsApp integration created successfully',
      data: integration,
    });
  }
);

export const updateWhatsAppIntegration = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.query.chatbotId as string;
    const input: UpdateWhatsAppIntegrationInput = {
      phoneNumberId: req.body.phoneNumberId,
      accessToken: req.body.accessToken,
      verifyToken: req.body.verifyToken,
      businessAccountId: req.body.businessAccountId,
      webhookUrl: req.body.webhookUrl,
    };

    const integration = await handleUpdateWhatsAppIntegration(
      req.user.userId as string,
      chatbotId,
      input
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'WhatsApp integration updated successfully',
      data: integration,
    });
  }
);

export const getWhatsAppIntegration = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.query.chatbotId as string;

    const integration = await handleGetWhatsAppIntegration(
      req.user.userId as string,
      chatbotId
    );

    if (!integration) {
      res.status(httpStatus.OK).json({
        success: false,
        message: 'WhatsApp integration not found',
        data: null,
      });
      return;
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'WhatsApp integration fetched successfully',
      data: integration,
    });
  }
);

export const deleteWhatsAppIntegration = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.query.chatbotId as string;

    const result = await handleDeleteWhatsAppIntegration(
      req.user.userId as string,
      chatbotId
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: result.message,
      data: result,
    });
  }
);

// Note: Webhook handlers (webhookVerify, webhookMessage) have been moved to standalone whatsapp-webhook-service
// The webhook service handles all incoming WhatsApp messages for all clients/users

// Send WhatsApp message (supports both text and template messages)
export const sendMessage = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.query.chatbotId as string;
    const input: SendWhatsAppMessageInput = {
      to: req.body.to,
      message: req.body.message,
      type: req.body.type || (req.body.template ? 'template' : 'text'),
      template: req.body.template,
    };

    const result = await handleSendWhatsAppMessage(
      req.user.userId as string,
      chatbotId,
      input
    );

    if (!result.success) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: result.error || 'Failed to send message',
        data: result,
      });
      return;
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Message sent successfully',
      data: result,
    });
  }
);

// Mark messages as read
export const markMessagesAsRead = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.query.chatbotId as string;
    const messageIds = req.body.messageIds as string[];

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'messageIds array is required and must not be empty',
      });
      return;
    }

    const result = await handleMarkMessagesAsRead(
      req.user.userId as string,
      chatbotId,
      messageIds
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: result.message,
      data: result,
    });
  }
);

// Get WhatsApp chats (list of contacts with conversations)
export const getWhatsAppChats = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId as string;
    const whatsappId = req.params.whatsappId as string;

    if (!chatbotId || !whatsappId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid chatbot ID or WhatsApp ID',
        data: { success: false, data: [] },
      });
    }

    const result = await handleGetWhatsAppChats(
      req.user.userId as string,
      chatbotId,
      whatsappId
    );

    res.status(httpStatus.OK).json({
      success: result.success,
      data: result,
    });
  }
);

// Get messages for a specific WhatsApp contact
export const getWhatsAppContactMessages = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId as string;
    const whatsappId = req.params.whatsappId as string;
    const contactId = req.params.contactId as string;

    if (!chatbotId || !whatsappId || !contactId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid chatbot ID, WhatsApp ID, or contact ID',
        data: { success: false, data: [] },
      });
    }

    const result = await handleGetWhatsAppContactMessages(
      req.user.userId as string,
      chatbotId,
      whatsappId,
      contactId
    );

    res.status(httpStatus.OK).json({
      success: result.success,
      data: result,
    });
  }
);

// Create WhatsApp contact
export const createWhatsAppContact = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId as string;
    const whatsappId = req.params.whatsappId as string;

    if (!chatbotId || !whatsappId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid chatbot ID or WhatsApp ID',
      });
    }

    const input: CreateWhatsAppContactInput = {
      phoneNumber: req.body.phoneNumber,
      displayName: req.body.displayName,
    };

    const contact = await handleCreateWhatsAppContact(
      req.user.userId as string,
      chatbotId,
      whatsappId,
      input
    );

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Contact added successfully',
      data: {
        id: contact.id,
        phoneNumber: contact.phoneNumber,
        displayName: contact.displayName,
        userMetadata: contact.userMetadata,
      },
    });
  }
);

// Get WhatsApp Analytics
export const getWhatsAppAnalytics = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId as string;
    const whatsappId = req.params.whatsappId as string;

    if (!chatbotId || !whatsappId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid chatbot ID or WhatsApp ID',
      });
    }

    const analytics = await handleGetWhatsAppAnalytics(
      req.user.userId as string,
      chatbotId,
      whatsappId
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Analytics retrieved successfully',
      data: analytics,
    });
  }
);

// Get WhatsApp Analytics Per Day
export const getWhatsAppAnalyticsPerDay = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId as string;
    const whatsappId = req.params.whatsappId as string;
    const days = parseInt(req.query.days as string) || 30;

    if (!chatbotId || !whatsappId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid chatbot ID or WhatsApp ID',
      });
    }

    const result = await handleGetWhatsAppAnalyticsPerDay(
      req.user.userId as string,
      chatbotId,
      whatsappId,
      days
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Analytics per day retrieved successfully',
      data: result,
    });
  }
);

