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
  handleGetWhatsAppChats,
  handleGetWhatsAppContactMessages,
} from './whatsapp-service';
import {
  CreateWhatsAppIntegrationInput,
  UpdateWhatsAppIntegrationInput,
  SendWhatsAppMessageInput,
  WhatsAppWebhookPayload,
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
      res.status(httpStatus.NOT_FOUND).json({
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

// Send WhatsApp message
export const sendMessage = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.query.chatbotId as string;
    const input: SendWhatsAppMessageInput = {
      to: req.body.to,
      message: req.body.message,
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

// Get WhatsApp chats (list of contacts with conversations)
export const getWhatsAppChats = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const chatbotId = req.params.chatbotId as string;
    const whatsappId = req.params.whatsappId as string;

    if (!chatbotId || !whatsappId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid chatbot ID or WhatsApp ID',
      });
    }

    const result = await handleGetWhatsAppChats(
      req.user.userId as string,
      chatbotId,
      whatsappId
    );

    res.status(httpStatus.OK).json({
      success: result.success,
      data: result.data,
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
      data: result.data,
    });
  }
);

