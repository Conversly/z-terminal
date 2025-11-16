import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';
import crypto from 'crypto';
import {
  chatBots as chatBotsTable,
  whatsapp_accounts as whatsappAccountsTable,
  WhatsappContacts as WhatsappContactsTable,
  whatsappClientUsers as whatsappClientUsersTable,
  whatsappConversations as whatsappConversationsTable,
  whatsappMessages as whatsappMessagesTable,
  messages as messagesTable,
} from '../../drizzle/schema';
import { desc, asc, sql } from 'drizzle-orm';
import {
  CreateWhatsAppIntegrationInput,
  UpdateWhatsAppIntegrationInput,
  WhatsAppIntegrationResponse,
  WhatsAppWebhookPayload,
  WhatsAppWebhookMessage,
  SendWhatsAppMessageInput,
  SendWhatsAppMessageResponse,
  WhatsAppTemplateStatusUpdate,
} from './types';
import env from '../../config';

// Verify webhook signature
export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  appSecret: string
): boolean => {
  try {
    const expected = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');
    
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    
    if (sigBuf.length !== expBuf.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
};

// Verify chatbot ownership helper
const verifyChatbotOwnership = async (chatbotId: string, userId: string) => {
  const chatbot = await db
    .select()
    .from(chatBotsTable)
    .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
    .limit(1)
    .then((r) => r[0]);

  if (!chatbot) {
    throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
  }

  return chatbot;
};

// Create WhatsApp integration
export const handleCreateWhatsAppIntegration = async (
  userId: string,
  input: CreateWhatsAppIntegrationInput
): Promise<WhatsAppIntegrationResponse> => {
  try {
    // Verify chatbot ownership
    await verifyChatbotOwnership(input.chatbotId, userId);

    // Check if integration already exists
    const existing = await db
      .select()
      .from(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, input.chatbotId))
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      throw new ApiError('WhatsApp integration already exists for this chatbot', httpStatus.CONFLICT);
    }

    // Extract phone number from display_phone_number or use a placeholder
    // WhatsApp API provides display_phone_number in webhook metadata
    const phoneNumber = input.phoneNumberId; // We'll update this when we get actual phone number

    // Use provided webhook URL or default to the deployed webhook service
    const webhookUrl = input.webhookUrl || env.WHATSAPP_WEBHOOK_URL || 'https://webhook-wa-mcnp.onrender.com/webhook';

    const [account] = await db
      .insert(whatsappAccountsTable)
      .values({
        chatbotId: input.chatbotId,
        phoneNumber: phoneNumber, // Will be updated from webhook
        wabaId: input.businessAccountId || '',
        phoneNumberId: input.phoneNumberId,
        displayPhoneNumber: phoneNumber,
        accessToken: input.accessToken,
        verifiedName: 'WhatsApp Business', // Will be updated from webhook
        status: 'active',
        webhookUrl: webhookUrl,
        webhookSecret: input.webhookSecret || null,
        verifyToken: input.verifyToken,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      id: account.id,
      chatbotId: account.chatbotId,
      phoneNumberId: account.phoneNumberId,
      accessToken: account.accessToken,
      verifyToken: account.verifyToken || '',
      webhookSecret: account.webhookSecret || null,
      businessAccountId: account.wabaId,
      webhookUrl: account.webhookUrl,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  } catch (error) {
    logger.error('Error creating WhatsApp integration:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Error creating WhatsApp integration', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

// Update WhatsApp integration
export const handleUpdateWhatsAppIntegration = async (
  userId: string,
  chatbotId: string,
  input: UpdateWhatsAppIntegrationInput
): Promise<WhatsAppIntegrationResponse> => {
  try {
    // Verify chatbot ownership
    await verifyChatbotOwnership(chatbotId, userId);

    // Get existing integration
    const existing = await db
      .select()
      .from(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      throw new ApiError('WhatsApp integration not found', httpStatus.NOT_FOUND);
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (input.phoneNumberId !== undefined) updates.phoneNumberId = input.phoneNumberId;
    if (input.accessToken !== undefined) updates.accessToken = input.accessToken;
    if (input.verifyToken !== undefined) updates.verifyToken = input.verifyToken;
    if (input.webhookSecret !== undefined) updates.webhookSecret = input.webhookSecret || null;
    if (input.businessAccountId !== undefined) updates.wabaId = input.businessAccountId || '';
    if (input.webhookUrl !== undefined) {
      updates.webhookUrl = input.webhookUrl || env.WHATSAPP_WEBHOOK_URL || 'https://webhook-wa-mcnp.onrender.com/webhook';
    }

    const [updated] = await db
      .update(whatsappAccountsTable)
      .set(updates)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId))
      .returning();

    return {
      id: updated.id,
      chatbotId: updated.chatbotId,
      phoneNumberId: updated.phoneNumberId,
      accessToken: updated.accessToken,
      verifyToken: updated.verifyToken || '',
      webhookSecret: updated.webhookSecret || null,
      businessAccountId: updated.wabaId,
      webhookUrl: updated.webhookUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  } catch (error) {
    logger.error('Error updating WhatsApp integration:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Error updating WhatsApp integration', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

// Get WhatsApp integration
export const handleGetWhatsAppIntegration = async (
  userId: string,
  chatbotId: string
): Promise<WhatsAppIntegrationResponse | null> => {
  try {
    // Verify chatbot ownership
    await verifyChatbotOwnership(chatbotId, userId);

    const account = await db
      .select()
      .from(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId))
      .limit(1)
      .then((r) => r[0]);

    if (!account) {
      return null;
    }

    return {
      id: account.id,
      chatbotId: account.chatbotId,
      phoneNumberId: account.phoneNumberId,
      accessToken: account.accessToken,
      verifyToken: account.verifyToken || '',
      webhookSecret: account.webhookSecret || null,
      businessAccountId: account.wabaId,
      webhookUrl: account.webhookUrl,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  } catch (error) {
    logger.error('Error fetching WhatsApp integration:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Error fetching WhatsApp integration', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

// Delete WhatsApp integration
export const handleDeleteWhatsAppIntegration = async (
  userId: string,
  chatbotId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Verify chatbot ownership
    await verifyChatbotOwnership(chatbotId, userId);

    const account = await db
      .select()
      .from(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId))
      .limit(1)
      .then((r) => r[0]);

    if (!account) {
      throw new ApiError('WhatsApp integration not found', httpStatus.NOT_FOUND);
    }

    await db
      .delete(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId));

    return {
      success: true,
      message: 'WhatsApp integration deleted successfully',
    };
  } catch (error) {
    logger.error('Error deleting WhatsApp integration:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Error deleting WhatsApp integration', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

// Verify webhook (for WhatsApp webhook verification)
export const handleWebhookVerify = async (
  verifyToken: string,
  challenge: string
): Promise<string> => {
  // Get integration by verify token
  const account = await db
    .select()
    .from(whatsappAccountsTable)
    .where(eq(whatsappAccountsTable.verifyToken, verifyToken))
    .limit(1)
    .then((r) => r[0]);

  if (!account) {
    throw new ApiError('Invalid verify token', httpStatus.FORBIDDEN);
  }

  // Return challenge for webhook verification
  return challenge;
};

// Handle incoming webhook messages
export const handleWebhookMessage = async (
  payload: WhatsAppWebhookPayload
): Promise<void> => {
  try {
    for (const entry of payload.entry) {
      const businessAccountId = entry.id;
      
      for (const change of entry.changes) {
        const { field, value } = change;
        const phoneNumberId = value?.metadata?.phone_number_id;
        
        if (!phoneNumberId) {
          logger.warn('No phone number ID in webhook payload');
          continue;
        }

        // Find account by phone number ID
        const account = await db
          .select()
          .from(whatsappAccountsTable)
          .where(eq(whatsappAccountsTable.phoneNumberId, phoneNumberId))
          .limit(1)
          .then((r) => r[0]);

        if (!account) {
          logger.warn(`No account found for phone number ID: ${phoneNumberId}`);
          continue;
        }

        if (field === 'messages') {
          // Process messages
          const messages = value?.messages;
          if (messages && messages.length > 0) {
            for (const message of messages) {
              await processIncomingMessage(account, message, value?.contacts);
            }
          }

          // Process statuses (for tracking message delivery)
          const statuses = value?.statuses;
          if (statuses && statuses.length > 0) {
            await processMessageStatuses(statuses);
          }
        } else if (field === 'message_template_status_update') {
          await handleTemplateStatusUpdate(businessAccountId, value as any);
        } else {
          logger.info(`Unhandled webhook field: ${field}`);
        }
      }
    }
  } catch (error) {
    logger.error('Error handling webhook message:', error);
    throw error;
  }
};

// Process message statuses
const processMessageStatuses = async (statuses: Array<{
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
  }>;
}>): Promise<void> => {
  for (const status of statuses) {
    try {
      logger.info('Message status update:', {
        messageId: status.id,
        status: status.status,
        recipient: status.recipient_id,
        timestamp: status.timestamp
      });

      if (status.status === 'failed') {
        const errorCode = status.errors?.[0]?.code;
        const errorMessage = status.errors?.[0]?.title;
        logger.error('Message delivery failed:', { errorCode, errorMessage });
      }

      // Update message status in database
      await db
        .update(whatsappMessagesTable)
        .set({
          status: status.status,
          updatedAt: new Date(),
        })
        .where(eq(whatsappMessagesTable.waMessageId, status.id));
    } catch (error) {
      logger.error(`Error updating message status for ${status.id}:`, error);
    }
  }
};

// Handle template status updates
const handleTemplateStatusUpdate = async (
  businessAccountId: string,
  value: any
): Promise<void> => {
  const templateStatus: WhatsAppTemplateStatusUpdate = {
    event: value?.event,
    message_template_id: value?.message_template_id,
    message_template_name: value?.message_template_name,
    message_template_language: value?.message_template_language,
  };

  logger.info('Template status update:', {
    template: templateStatus.message_template_name,
    language: templateStatus.message_template_language,
    event: templateStatus.event
  });
};

// Process incoming message and generate response
const processIncomingMessage = async (
  account: {
    id: string;
    chatbotId: string;
    phoneNumberId: string;
    accessToken: string;
    wabaId: string;
    displayPhoneNumber: string;
  },
  message: WhatsAppWebhookMessage,
  contacts?: Array<{
    profile: {
      name: string;
    };
    wa_id: string;
  }>
): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const from = message.from;
    const messageId = message.id;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);
    const type = message.type;

    // Extract message content based on type
    let messageContent = '';
    switch (type) {
      case 'text':
        messageContent = message.text?.body || '';
        logger.info('Text message:', { from, content: messageContent });
        break;
      case 'image':
        messageContent = message.image?.caption || '[Image]';
        logger.info('Image message:', {
          from,
          imageId: message.image?.id,
          caption: message.image?.caption || ''
        });
        break;
      case 'audio':
        messageContent = '[Voice message]';
        logger.info('Audio message:', { from, audioId: message.audio?.id });
        break;
      case 'video':
        messageContent = message.video?.caption || '[Video]';
        logger.info('Video message:', {
          from,
          videoId: message.video?.id,
          caption: message.video?.caption || ''
        });
        break;
      case 'document':
        messageContent = `[Document: ${message.document?.filename || 'document'}]`;
        logger.info('Document message:', {
          from,
          documentId: message.document?.id,
          filename: message.document?.filename || 'document'
        });
        break;
      case 'location':
        messageContent = `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
        logger.info('Location message:', {
          from,
          latitude: message.location?.latitude,
          longitude: message.location?.longitude
        });
        break;
      case 'button':
        messageContent = message.button?.text || '';
        logger.info('Button message:', {
          from,
          text: message.button?.text,
          payload: message.button?.payload
        });
        break;
      case 'interactive':
        const interactiveType = message.interactive?.type;
        if (interactiveType === 'button_reply') {
          messageContent = message.interactive?.button_reply?.title || '';
        } else if (interactiveType === 'list_reply') {
          messageContent = message.interactive?.list_reply?.title || '';
        }
        logger.info('Interactive reply:', { from, content: messageContent });
        break;
      default:
        logger.info(`Unsupported message type: ${type}`);
        messageContent = `[Unsupported message type: ${type}]`;
    }

    // For now, only process text messages and interactive messages
    // Other types can be handled later if needed
    if (type !== 'text' && type !== 'button' && type !== 'interactive') {
      logger.info(`Skipping non-text/interactive message: ${type}`);
      return;
    }

    if (!messageContent) {
      logger.warn('Message content is empty, skipping');
      return;
    }

    // Get or create client user
    let clientUser = await db
      .select()
      .from(whatsappClientUsersTable)
      .where(
        and(
          eq(whatsappClientUsersTable.whatsappAccountId, account.id),
          eq(whatsappClientUsersTable.phoneNumber, from)
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (!clientUser) {
      const contact = contacts?.find(c => c.wa_id === from);
      const [newUser] = await db
        .insert(whatsappClientUsersTable)
        .values({
          whatsappAccountId: account.id,
          phoneNumber: from,
          name: contact?.profile?.name || null,
          source: 'organic',
          optInStatus: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      clientUser = newUser;
    } else {
      // Update last seen
      await db
        .update(whatsappClientUsersTable)
        .set({
          lastSeen: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(whatsappClientUsersTable.id, clientUser.id));
    }

    // Create or update WhatsApp contact in unified contacts table
    const contact = contacts?.find(c => c.wa_id === from);
    const contactMetadata = {
      wa_id: from,
      profile: contact?.profile || {},
      first_seen_at: clientUser.createdAt,
      last_seen_at: new Date(),
      last_inbound_message_id: messageId,
      waba_id: account.wabaId,
      phone_number_id: account.phoneNumberId,
      display_phone_number: account.displayPhoneNumber,
      source: 'organic',
    };

    const existingContact = await db
      .select()
      .from(WhatsappContactsTable)
      .where(
        and(
          eq(WhatsappContactsTable.chatbotId, account.chatbotId),
          eq(WhatsappContactsTable.phoneNumber, from)
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (!existingContact) {
      await db.insert(WhatsappContactsTable).values({
        chatbotId: account.chatbotId,
        phoneNumber: from,
        displayName: contact?.profile?.name || null,
        userMetadata: contactMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      await db
        .update(WhatsappContactsTable)
        .set({
          displayName: contact?.profile?.name || existingContact.displayName,
          userMetadata: contactMetadata,
          updatedAt: new Date(),
        })
        .where(eq(WhatsappContactsTable.id, existingContact.id));
    }

    // Get or create conversation
    const waConversationId = `${from}_${account.id}`;
    let conversation = await db
      .select()
      .from(whatsappConversationsTable)
      .where(eq(whatsappConversationsTable.waConversationId, waConversationId))
      .limit(1)
      .then((r) => r[0]);

    if (!conversation) {
      const [newConversation] = await db
        .insert(whatsappConversationsTable)
        .values({
          whatsappAccountId: account.id,
          whatsappClientUserId: clientUser.id,
          waConversationId: waConversationId,
          startedAt: timestamp,
          status: 'open',
          aiInvolved: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      conversation = newConversation;
    } else {
      // Update conversation status if closed
      if (conversation.status === 'closed') {
        await db
          .update(whatsappConversationsTable)
          .set({
            status: 'open',
            updatedAt: new Date(),
          })
          .where(eq(whatsappConversationsTable.id, conversation.id));
      }
    }

    // Store user message
    // Map button and interactive types to 'text' for database storage
    const dbMessageType = (type === 'text' || type === 'button' || type === 'interactive') 
      ? 'text' 
      : type === 'image' || type === 'video' || type === 'document' 
        ? type 
        : 'text'; // Default to text for unsupported types
    
    await db
      .insert(whatsappMessagesTable)
      .values({
        conversationId: conversation.id,
        waMessageId: messageId,
        senderType: 'user',
        messageType: dbMessageType,
        content: messageContent,
        status: 'delivered',
        timestamp: timestamp,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    // Also store in unified messages table
    const uniqueConvId = conversation.id; // Use conversation ID as uniqueConvId
    await db.insert(messagesTable).values({
      chatbotId: account.chatbotId,
      channel: 'WHATSAPP',
      type: 'user',
      content: messageContent,
      uniqueConvId: uniqueConvId,
      channelMessageMetadata: {
        phoneNumber: from,
        waMessageId: messageId,
        messageType: dbMessageType,
        timestamp: timestamp.toISOString(),
      },
      createdAt: timestamp,
    });

    // Get chatbot info
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(eq(chatBotsTable.id, account.chatbotId))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot || !chatbot.apiKey) {
      logger.error(`Chatbot not found or API key missing for chatbot ID: ${account.chatbotId}`);
      return;
    }

    // Call lightning-response API
    const responseApiUrl = env.RESPONSE_API_BASE_URL || 'http://localhost:8030';
    const uniqueClientId = `whatsapp_${from}_${account.chatbotId}`;
    
    // Get conversation history from database
    const conversationHistory = await db
      .select({
        content: whatsappMessagesTable.content,
        senderType: whatsappMessagesTable.senderType,
      })
      .from(whatsappMessagesTable)
      .where(eq(whatsappMessagesTable.conversationId, conversation.id))
      .orderBy(whatsappMessagesTable.timestamp)
      .limit(10); // Last 10 messages for context

    // Build conversation array for lightning-response
    const messagesArray = conversationHistory.map(msg => ({
      role: msg.senderType === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const conversationHistoryJson = JSON.stringify(messagesArray);

    const responseRequest = {
      query: conversationHistoryJson,
      mode: 'default',
      user: {
        uniqueClientId: uniqueClientId,
        converslyWebId: chatbot.apiKey,
        metadata: {
          platform: 'whatsapp',
          phoneNumber: from,
        },
      },
      metadata: {
        originUrl: 'whatsapp://chat',
      },
      chatbotId: account.chatbotId,
    };

    logger.info(`Calling lightning-response for chatbot ${account.chatbotId}`);

    const response = await axios.post(
      `${responseApiUrl}/response`,
      responseRequest,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    const responseData = response.data;
    const responseTime = Date.now() - startTime;

    if (responseData.success && responseData.response) {
      // Store AI response message
      const aiMessageId = responseData.message_id || `ai_${Date.now()}`;
      await db
        .insert(whatsappMessagesTable)
        .values({
          conversationId: conversation.id,
          waMessageId: aiMessageId,
          senderType: 'ai',
          messageType: 'text',
          content: responseData.response,
          status: 'sent',
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Send response back via WhatsApp API
      const sendResult = await sendWhatsAppMessage({
        phoneNumberId: account.phoneNumberId,
        accessToken: account.accessToken,
        to: from,
        message: responseData.response,
      });

      const finalMessageId = sendResult.messageId || aiMessageId;

      // Update message status if we got a message ID from WhatsApp
      if (sendResult.messageId) {
        await db
          .update(whatsappMessagesTable)
          .set({
            waMessageId: sendResult.messageId,
            updatedAt: new Date(),
          })
          .where(eq(whatsappMessagesTable.waMessageId, aiMessageId));
      }

      // Also store in unified messages table
      await db.insert(messagesTable).values({
        chatbotId: account.chatbotId,
        channel: 'WHATSAPP',
        type: 'assistant',
        content: responseData.response,
        uniqueConvId: conversation.id,
        citations: responseData.citations || [],
        channelMessageMetadata: {
          phoneNumber: from,
          waMessageId: finalMessageId,
          messageType: 'text',
          responseTimeMs: responseTime,
        },
        createdAt: new Date(),
      });

      // Update conversation to mark AI involvement
      await db
        .update(whatsappConversationsTable)
        .set({
          aiInvolved: true,
          updatedAt: new Date(),
        })
        .where(eq(whatsappConversationsTable.id, conversation.id));
    } else {
      logger.error('Failed to get response from lightning-response:', responseData);
      // Send error message
      await sendWhatsAppMessage({
        phoneNumberId: account.phoneNumberId,
        accessToken: account.accessToken,
        to: from,
        message: 'Sorry, I encountered an error processing your message. Please try again later.',
      });
    }
  } catch (error) {
    logger.error('Error processing incoming message:', error);
    // Try to send error message if possible
    try {
      await sendWhatsAppMessage({
        phoneNumberId: account.phoneNumberId,
        accessToken: account.accessToken,
        to: message.from,
        message: 'Sorry, I encountered an error. Please try again later.',
      });
    } catch (sendError) {
      logger.error('Failed to send error message:', sendError);
    }
  }
};

// Send WhatsApp message
export const sendWhatsAppMessage = async (params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  message: string;
}): Promise<SendWhatsAppMessageResponse> => {
  try {
    const url = `https://graph.facebook.com/v18.0/${params.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'text',
      text: {
        body: params.message,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const messageId = response.data?.messages?.[0]?.id;

    return {
      success: true,
      messageId: messageId,
    };
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error);
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
    return {
      success: false,
      error: 'Unknown error sending message',
    };
  }
};

// Handle sending message (for manual sends)
export const handleSendWhatsAppMessage = async (
  userId: string,
  chatbotId: string,
  input: SendWhatsAppMessageInput
): Promise<SendWhatsAppMessageResponse> => {
  try {
    // Verify chatbot ownership
    await verifyChatbotOwnership(chatbotId, userId);

    // Get account
    const account = await db
      .select()
      .from(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId))
      .limit(1)
      .then((r) => r[0]);

    if (!account) {
      throw new ApiError('WhatsApp integration not found', httpStatus.NOT_FOUND);
    }

    return await sendWhatsAppMessage({
      phoneNumberId: account.phoneNumberId,
      accessToken: account.accessToken,
      to: input.to,
      message: input.message,
    });
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Error sending WhatsApp message', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

// Get WhatsApp chats (contacts with conversations)
export const handleGetWhatsAppChats = async (
  userId: string,
  chatbotId: string,
  whatsappId: string
): Promise<{
  success: boolean;
  data: Array<{
    contactId: string;
    phoneNumber: string;
    displayName: string | null;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCount?: number;
  }>;
}> => {
  try {
    // Verify chatbot ownership
    await verifyChatbotOwnership(chatbotId, userId);

    // Verify WhatsApp account belongs to chatbot
    const account = await db
      .select()
      .from(whatsappAccountsTable)
      .where(
        and(
          eq(whatsappAccountsTable.id, whatsappId),
          eq(whatsappAccountsTable.chatbotId, chatbotId)
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (!account) {
      throw new ApiError('WhatsApp account not found', httpStatus.NOT_FOUND);
    }

    // Get contacts with their last message from unified messages table
    // First get all contacts
    const allContacts = await db
      .select({
        id: WhatsappContactsTable.id,
        phoneNumber: WhatsappContactsTable.phoneNumber,
        displayName: WhatsappContactsTable.displayName,
      })
      .from(WhatsappContactsTable)
      .where(eq(WhatsappContactsTable.chatbotId, chatbotId));

    // Then get last message for each contact
    const contactsWithMessages = await Promise.all(
      allContacts.map(async (contact) => {
        const lastMessage = await db
          .select({
            content: messagesTable.content,
            createdAt: messagesTable.createdAt,
          })
          .from(messagesTable)
          .where(
            and(
              eq(messagesTable.chatbotId, chatbotId),
              sql`channel = 'WHATSAPP'`,
              sql`channel_message_metadata->>'phoneNumber' = ${contact.phoneNumber}`
            )
          )
          .orderBy(desc(messagesTable.createdAt))
          .limit(1)
          .then((r) => r[0]);

        return {
          contactId: contact.id,
          phoneNumber: contact.phoneNumber,
          displayName: contact.displayName,
          lastMessage: lastMessage?.content || null,
          lastMessageAt: lastMessage?.createdAt || null,
        };
      })
    );

    // Sort by last message time (most recent first)
    contactsWithMessages.sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      const dateA = a.lastMessageAt instanceof Date ? a.lastMessageAt : new Date(a.lastMessageAt);
      const dateB = b.lastMessageAt instanceof Date ? b.lastMessageAt : new Date(b.lastMessageAt);
      return dateB.getTime() - dateA.getTime();
    });

    const rows = contactsWithMessages;

    return {
      success: true,
      data: rows.map((r) => ({
        contactId: r.contactId,
        phoneNumber: r.phoneNumber,
        displayName: r.displayName,
        lastMessage: r.lastMessage,
        lastMessageAt: r.lastMessageAt
          ? r.lastMessageAt instanceof Date
            ? r.lastMessageAt
            : new Date(r.lastMessageAt)
          : null,
      })),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching WhatsApp chats:', error);
    throw new ApiError('Error fetching WhatsApp chats', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

// Get messages for a specific WhatsApp contact
export const handleGetWhatsAppContactMessages = async (
  userId: string,
  chatbotId: string,
  whatsappId: string,
  contactId: string
): Promise<{
  success: boolean;
  data: Array<{
    id: string;
    type: 'user' | 'assistant' | 'agent';
    content: string;
    createdAt: Date;
    citations?: string[];
  }>;
}> => {
  try {
    // Verify chatbot ownership
    await verifyChatbotOwnership(chatbotId, userId);

    // Verify WhatsApp account belongs to chatbot
    const account = await db
      .select()
      .from(whatsappAccountsTable)
      .where(
        and(
          eq(whatsappAccountsTable.id, whatsappId),
          eq(whatsappAccountsTable.chatbotId, chatbotId)
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (!account) {
      throw new ApiError('WhatsApp account not found', httpStatus.NOT_FOUND);
    }

    // Get contact
    const contact = await db
      .select()
      .from(WhatsappContactsTable)
      .where(
        and(
          eq(WhatsappContactsTable.id, contactId),
          eq(WhatsappContactsTable.chatbotId, chatbotId)
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (!contact) {
      throw new ApiError('Contact not found', httpStatus.NOT_FOUND);
    }

    // Get messages for this contact from unified messages table
    const messages = await db
      .select({
        id: messagesTable.id,
        type: messagesTable.type,
        content: messagesTable.content,
        createdAt: messagesTable.createdAt,
        citations: messagesTable.citations,
      })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.chatbotId, chatbotId),
          sql`channel = 'WHATSAPP'`,
          sql`channel_message_metadata->>'phoneNumber' = ${contact.phoneNumber}`
        )
      )
      .orderBy(asc(messagesTable.createdAt));

    return {
      success: true,
      data: messages.map((m) => ({
        id: m.id,
        type: m.type as 'user' | 'assistant' | 'agent',
        content: m.content,
        createdAt: m.createdAt as Date,
        citations: (m.citations as unknown as string[]) ?? [],
      })),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching WhatsApp contact messages:', error);
    throw new ApiError('Error fetching WhatsApp contact messages', httpStatus.INTERNAL_SERVER_ERROR);
  }
};
