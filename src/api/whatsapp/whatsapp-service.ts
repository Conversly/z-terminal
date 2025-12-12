import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import {
  whatsappAccounts as whatsappAccountsTable,
  chatBots as chatBotsTable,
  whatsappContacts as whatsappContactsTable,
  messages as messagesTable,
} from '../../drizzle/schema';
import {
  CreateWhatsAppIntegrationInput,
  UpdateWhatsAppIntegrationInput,
  WhatsAppIntegrationResponse,
  SendWhatsAppMessageInput,
  SendWhatsAppMessageResponse,
  CreateWhatsAppContactInput,
  WhatsAppContactResponse,
  WhatsAppAnalyticsResponse,
  WhatsAppAnalyticsPerDayResponse,
} from './types';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import axios from 'axios';

export const handleCreateWhatsAppIntegration = async (
  userId: string,
  input: CreateWhatsAppIntegrationInput
): Promise<WhatsAppIntegrationResponse> => {
  try {
    // Verify chatbot ownership
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, input.chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

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

    // Get phone number info from WhatsApp API to get verified name and other details
    // For now, we'll use defaults if not provided
    const phoneNumber = input.phoneNumber || input.phoneNumberId; // Use provided phoneNumber or phoneNumberId
    const wabaId = input.businessAccountId || '';
    const verifiedName = 'WhatsApp Business'; // Default, should be fetched from API
    const whatsappBusinessId = input.businessAccountId || '';

    const [integration] = await db
      .insert(whatsappAccountsTable)
      .values({
        chatbotId: input.chatbotId,
        phoneNumber: phoneNumber,
        wabaId: wabaId,
        phoneNumberId: input.phoneNumberId,
        accessToken: input.accessToken,
        verifiedName: verifiedName,
        whatsappBusinessId: whatsappBusinessId,
        webhookUrl: input.webhookUrl || null,
        verifyToken: input.verifyToken || null,
        status: 'active',
      })
      .returning();

    return {
      id: integration.id,
      chatbotId: integration.chatbotId,
      phoneNumberId: integration.phoneNumberId,
      accessToken: integration.accessToken,
      verifyToken: integration.verifyToken || '',
      webhookSecret: null,
      businessAccountId: integration.whatsappBusinessId,
      webhookUrl: integration.webhookUrl,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error creating WhatsApp integration:', error);
    throw new ApiError('Error creating WhatsApp integration', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleUpdateWhatsAppIntegration = async (
  userId: string,
  chatbotId: string,
  input: UpdateWhatsAppIntegrationInput
): Promise<WhatsAppIntegrationResponse> => {
  try {
    // Verify chatbot ownership
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

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

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (input.phoneNumberId) {
      updateData.phoneNumberId = input.phoneNumberId;
      updateData.phoneNumber = input.phoneNumberId; // Update phoneNumber as well
    }
    if (input.accessToken) {
      updateData.accessToken = input.accessToken;
    }
    if (input.verifyToken !== undefined) {
      updateData.verifyToken = input.verifyToken;
    }
    if (input.businessAccountId) {
      updateData.whatsappBusinessId = input.businessAccountId;
      updateData.wabaId = input.businessAccountId;
    }
    if (input.webhookUrl !== undefined) {
      updateData.webhookUrl = input.webhookUrl;
    }

    const [updated] = await db
      .update(whatsappAccountsTable)
      .set(updateData)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId))
      .returning();

    return {
      id: updated.id,
      chatbotId: updated.chatbotId,
      phoneNumberId: updated.phoneNumberId,
      accessToken: updated.accessToken,
      verifyToken: updated.verifyToken || '',
      webhookSecret: null,
      businessAccountId: updated.whatsappBusinessId,
      webhookUrl: updated.webhookUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error updating WhatsApp integration:', error);
    throw new ApiError('Error updating WhatsApp integration', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleGetWhatsAppIntegration = async (
  userId: string,
  chatbotId: string
): Promise<WhatsAppIntegrationResponse | null> => {
  try {
    // Verify chatbot ownership
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

    const integration = await db
      .select()
      .from(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId))
      .limit(1)
      .then((r) => r[0]);

    if (!integration) {
      return null;
    }

    return {
      id: integration.id,
      chatbotId: integration.chatbotId,
      phoneNumberId: integration.phoneNumberId,
      accessToken: integration.accessToken,
      verifyToken: integration.verifyToken || '',
      webhookSecret: null,
      businessAccountId: integration.whatsappBusinessId,
      webhookUrl: integration.webhookUrl,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error getting WhatsApp integration:', error);
    throw new ApiError('Error getting WhatsApp integration', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleDeleteWhatsAppIntegration = async (
  userId: string,
  chatbotId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Verify chatbot ownership
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

    const integration = await db
      .select()
      .from(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId))
      .limit(1)
      .then((r) => r[0]);

    if (!integration) {
      throw new ApiError('WhatsApp integration not found', httpStatus.NOT_FOUND);
    }

    await db
      .delete(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId));

    return {
      success: true,
      message: 'WhatsApp integration deleted successfully',
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error deleting WhatsApp integration:', error);
    throw new ApiError('Error deleting WhatsApp integration', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleMarkMessagesAsRead = async (
  userId: string,
  chatbotId: string,
  messageIds: string[]
): Promise<{ success: boolean; message: string }> => {
  try {
    // Verify chatbot ownership and get integration
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

    const integration = await db
      .select()
      .from(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId))
      .limit(1)
      .then((r) => r[0]);

    if (!integration) {
      throw new ApiError('WhatsApp integration not found', httpStatus.NOT_FOUND);
    }

    if (!messageIds || messageIds.length === 0) {
      throw new ApiError('At least one message ID is required', httpStatus.BAD_REQUEST);
    }

    // Mark each message as read via Meta API
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
    const url = `https://graph.facebook.com/${apiVersion}/${integration.phoneNumberId}/messages`;
    let successCount = 0;
    const errors: string[] = [];

    for (const messageId of messageIds) {
      try {
        const payload = {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        };

        await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        // Update message status in database
        await db
          .update(messagesTable)
          .set({
            channelMessageMetadata: sql`jsonb_set(
              COALESCE(channel_message_metadata, '{}'::jsonb),
              '{status}',
              '"read"'::jsonb
            )`,
          })
          .where(
            and(
              eq(messagesTable.chatbotId, chatbotId),
              eq(messagesTable.channel, 'WHATSAPP'),
              sql`channel_message_metadata->>'waMessageId' = ${messageId}`
            )
          );

        successCount++;
      } catch (error: any) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        errors.push(`Message ${messageId}: ${errorMsg}`);
        logger.error(`Failed to mark message ${messageId} as read:`, errorMsg);
      }
    }

    if (successCount === 0) {
      throw new ApiError(`Failed to mark messages as read: ${errors.join('; ')}`, httpStatus.BAD_GATEWAY);
    }

    return {
      success: true,
      message: `Successfully marked ${successCount}/${messageIds.length} messages as read${errors.length > 0 ? `. Errors: ${errors.join('; ')}` : ''}`,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error marking messages as read:', error);
    throw new ApiError('Error marking messages as read', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleSendWhatsAppMessage = async (
  userId: string,
  chatbotId: string,
  input: SendWhatsAppMessageInput
): Promise<SendWhatsAppMessageResponse> => {
  try {
    // Verify chatbot ownership and get integration
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

    const integration = await db
      .select()
      .from(whatsappAccountsTable)
      .where(eq(whatsappAccountsTable.chatbotId, chatbotId))
      .limit(1)
      .then((r) => r[0]);

    if (!integration) {
      throw new ApiError('WhatsApp integration not found', httpStatus.NOT_FOUND);
    }

    // Send message via WhatsApp API
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
    const url = `https://graph.facebook.com/${apiVersion}/${integration.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: input.to,
      type: 'text',
      text: {
        preview_url: false, // Explicitly set preview_url as per API docs
        body: input.message,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const whatsappMessageId = response.data?.messages?.[0]?.id;

    // Save the sent message to the messages table for chat interface
    try {
      // Normalize phone number (remove + if present for consistency with database)
      const phoneNumber = input.to.startsWith('+') ? input.to.substring(1) : input.to;
      const uniqueConvId = `whatsapp_${phoneNumber}_${chatbotId}`;

      await db.insert(messagesTable).values({
        chatbotId: chatbotId,
        channel: 'WHATSAPP',
        type: 'assistant', // Sent messages are from assistant/bot
        content: input.message,
        uniqueConvId: uniqueConvId,
        channelMessageMetadata: {
          phoneNumber: phoneNumber,
          whatsappMessageId: whatsappMessageId,
          phoneNumberId: integration.phoneNumberId,
        },
        citations: [],
        feedback: 0,
      });
    } catch (dbError: any) {
      // Log error but don't fail the request since message was sent successfully
      logger.error('Error saving sent message to database:', dbError);
    }

    return {
      success: true,
      messageId: whatsappMessageId,
    };
  } catch (error: any) {
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

export const handleGetWhatsAppChats = async (
  userId: string,
  chatbotId: string,
  whatsappId: string
): Promise<{ success: boolean; data: any[] }> => {
  try {
    // Verify chatbot ownership
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

    // Get unique contacts from messages table with their latest message
    const contacts = await db
      .select({
        phoneNumber: sql<string>`jsonb_extract_path_text((${messagesTable.channelMessageMetadata})::jsonb, 'phoneNumber')`,
        lastMessage: messagesTable.content,
        lastMessageTime: messagesTable.createdAt,
      })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.chatbotId, chatbotId),
          eq(messagesTable.channel, 'WHATSAPP'),
          sql`jsonb_extract_path_text((${messagesTable.channelMessageMetadata})::jsonb, 'phoneNumber') IS NOT NULL`
        )
      )
      .orderBy(desc(messagesTable.createdAt));

    // Also get contacts from whatsappContacts table
    const whatsappContacts = await db
      .select()
      .from(whatsappContactsTable)
      .where(eq(whatsappContactsTable.chatbotId, chatbotId));

    // Merge and format contacts
    const contactMap = new Map<string, any>();
    
    // First, add contacts from whatsappContacts table (these have more complete info)
    whatsappContacts.forEach(contact => {
      contactMap.set(contact.phoneNumber, {
        id: contact.id,
        phoneNumber: contact.phoneNumber,
        displayName: contact.displayName || contact.phoneNumber,
        userMetadata: contact.userMetadata,
      });
    });

    // Then, add contacts from messages (only if not already in map, to get unique contacts)
    contacts.forEach(contact => {
      if (contact.phoneNumber && !contactMap.has(contact.phoneNumber)) {
        contactMap.set(contact.phoneNumber, {
          id: contact.phoneNumber,
          phoneNumber: contact.phoneNumber,
          displayName: contact.phoneNumber,
        });
      }
    });

    return {
      success: true,
      data: Array.from(contactMap.values()),
    };
  } catch (error: any) {
    logger.error('Error getting WhatsApp chats:', error);
    return {
      success: false,
      data: [],
    };
  }
};

export const handleGetWhatsAppContactMessages = async (
  userId: string,
  chatbotId: string,
  whatsappId: string,
  contactId: string
): Promise<{ success: boolean; data: any[] }> => {
  try {
    // Verify chatbot ownership
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

    // First, try to get the contact from whatsappContacts table to get the phone number
    // contactId could be either the contact ID (UUID) or the phone number itself
    let phoneNumber: string | null = null;
    
    // Check if contactId is a UUID (contact ID) or a phone number
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId) || 
                   /^[a-z0-9]{20,}$/i.test(contactId); // Also check for drizzle IDs
    
    if (isUUID) {
      // It's a contact ID, look up the phone number
      const contact = await db
        .select()
        .from(whatsappContactsTable)
        .where(
          and(
            eq(whatsappContactsTable.id, contactId),
            eq(whatsappContactsTable.chatbotId, chatbotId)
          )
        )
        .limit(1)
        .then((r) => r[0]);
      
      if (contact) {
        phoneNumber = contact.phoneNumber;
      }
    } else {
      // It's likely a phone number
      phoneNumber = contactId;
    }

    if (!phoneNumber) {
      // If we couldn't find the contact, return empty array
      return {
        success: true,
        data: [],
      };
    }

    // Get messages for this contact using phoneNumber
    // Match by either phoneNumber in metadata OR uniqueConvId pattern
    const uniqueConvIdPattern = `whatsapp_${phoneNumber}_${chatbotId}`;
    const messages = await db
      .select()
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.chatbotId, chatbotId),
          eq(messagesTable.channel, 'WHATSAPP'),
          or(
            sql`jsonb_extract_path_text((${messagesTable.channelMessageMetadata})::jsonb, 'phoneNumber') = ${phoneNumber}`,
            eq(messagesTable.uniqueConvId, uniqueConvIdPattern)
          )
        )
      )
      .orderBy(messagesTable.createdAt);

    return {
      success: true,
      data: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        type: msg.type,
        timestamp: msg.createdAt,
        metadata: msg.channelMessageMetadata,
      })),
    };
  } catch (error: any) {
    logger.error('Error getting WhatsApp contact messages:', error);
    return {
      success: false,
      data: [],
    };
  }
};

export const handleCreateWhatsAppContact = async (
  userId: string,
  chatbotId: string,
  whatsappId: string,
  input: CreateWhatsAppContactInput
): Promise<WhatsAppContactResponse> => {
  try {
    // Verify chatbot ownership
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

    // Verify WhatsApp integration exists and belongs to the chatbot
    const integration = await db
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

    if (!integration) {
      throw new ApiError('WhatsApp integration not found', httpStatus.NOT_FOUND);
    }

    // Check if contact already exists
    const existing = await db
      .select()
      .from(whatsappContactsTable)
      .where(
        and(
          eq(whatsappContactsTable.chatbotId, chatbotId),
          eq(whatsappContactsTable.phoneNumber, input.phoneNumber)
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      throw new ApiError('WhatsApp contact already exists for this chatbot and phone number', httpStatus.CONFLICT);
    }

    // Create new contact
    const [contact] = await db
      .insert(whatsappContactsTable)
      .values({
        chatbotId: chatbotId,
        phoneNumber: input.phoneNumber,
        displayName: input.displayName || null,
        userMetadata: {}, // Default empty metadata
      })
      .returning();

    return {
      id: contact.id,
      chatbotId: contact.chatbotId,
      phoneNumber: contact.phoneNumber,
      displayName: contact.displayName,
      userMetadata: contact.userMetadata,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error creating WhatsApp contact:', error);
    throw new ApiError('Error creating WhatsApp contact', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleGetWhatsAppAnalytics = async (
  userId: string,
  chatbotId: string,
  whatsappId: string
): Promise<WhatsAppAnalyticsResponse> => {
  try {
    // Verify chatbot ownership
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

    // Verify WhatsApp integration exists and belongs to the chatbot
    const integration = await db
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

    if (!integration) {
      throw new ApiError('WhatsApp integration not found', httpStatus.NOT_FOUND);
    }

    // Get total messages count
    const totalMessagesResult = await db.execute(sql<{ count: string }>`
      SELECT COUNT(*)::text AS count
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND channel = 'WHATSAPP'
    `);
    const totalMessages = parseInt((totalMessagesResult as any).rows[0]?.count ?? '0', 10);

    // Get user messages count
    const userMessagesResult = await db.execute(sql<{ count: string }>`
      SELECT COUNT(*)::text AS count
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND channel = 'WHATSAPP'
        AND type = 'user'
    `);
    const userMessages = parseInt((userMessagesResult as any).rows[0]?.count ?? '0', 10);

    // Get AI responses count
    const aiResponsesResult = await db.execute(sql<{ count: string }>`
      SELECT COUNT(*)::text AS count
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND channel = 'WHATSAPP'
        AND type = 'assistant'
    `);
    const aiResponses = parseInt((aiResponsesResult as any).rows[0]?.count ?? '0', 10);

    // Get agent responses count
    const agentResponsesResult = await db.execute(sql<{ count: string }>`
      SELECT COUNT(*)::text AS count
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND channel = 'WHATSAPP'
        AND type = 'agent'
    `);
    const agentResponses = parseInt((agentResponsesResult as any).rows[0]?.count ?? '0', 10);

    // Get unique WhatsApp conversations
    const uniqueConversationsResult = await db.execute(sql<{ count: string }>`
      SELECT COUNT(DISTINCT unique_conv_id)::text AS count
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND channel = 'WHATSAPP'
        AND unique_conv_id IS NOT NULL
    `);
    const uniqueWhatsappConversations = parseInt((uniqueConversationsResult as any).rows[0]?.count ?? '0', 10);

    // Get unique contacts (from messages metadata)
    const uniqueContactsResult = await db.execute(sql<{ count: string }>`
      SELECT COUNT(DISTINCT jsonb_extract_path_text((channel_message_metadata)::jsonb, 'phoneNumber'))::text AS count
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND channel = 'WHATSAPP'
        AND jsonb_extract_path_text((channel_message_metadata)::jsonb, 'phoneNumber') IS NOT NULL
    `);
    const uniqueContacts = parseInt((uniqueContactsResult as any).rows[0]?.count ?? '0', 10);

    // Get total contacts from whatsappContacts table
    const totalContactsResult = await db.execute(sql<{ count: string }>`
      SELECT COUNT(*)::text AS count
      FROM whatsapp_contacts
      WHERE chatbot_id = ${chatbotId}
    `);
    const totalContacts = parseInt((totalContactsResult as any).rows[0]?.count ?? '0', 10);

    // Get active conversations (conversations with messages in last 24 hours)
    const activeConversationsResult = await db.execute(sql<{ count: string }>`
      SELECT COUNT(DISTINCT unique_conv_id)::text AS count
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND channel = 'WHATSAPP'
        AND unique_conv_id IS NOT NULL
        AND created_at >= now() - interval '1 day'
    `);
    const activeConversations = parseInt((activeConversationsResult as any).rows[0]?.count ?? '0', 10);

    return {
      totalMessages,
      totalContacts,
      activeConversations,
      userMessages,
      aiResponses,
      agentResponses,
      uniqueWhatsappConversations,
      uniqueContacts,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error getting WhatsApp analytics:', error);
    throw new ApiError('Error getting WhatsApp analytics', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleGetWhatsAppAnalyticsPerDay = async (
  userId: string,
  chatbotId: string,
  whatsappId: string,
  days: number = 30
): Promise<WhatsAppAnalyticsPerDayResponse> => {
  try {
    // Verify chatbot ownership
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
      .limit(1)
      .then((r) => r[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

    // Verify WhatsApp integration exists and belongs to the chatbot
    const integration = await db
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

    if (!integration) {
      throw new ApiError('WhatsApp integration not found', httpStatus.NOT_FOUND);
    }

    // Get analytics per day
    const analyticsResult = await db.execute(sql<{
      date: string;
      user_messages: string;
      ai_responses: string;
      agent_responses: string;
      unique_conversations: string;
      unique_contacts: string;
    }>`
      SELECT
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
        COUNT(*) FILTER (WHERE type = 'user')::text AS user_messages,
        COUNT(*) FILTER (WHERE type = 'assistant')::text AS ai_responses,
        COUNT(*) FILTER (WHERE type = 'agent')::text AS agent_responses,
        COUNT(DISTINCT unique_conv_id) FILTER (WHERE unique_conv_id IS NOT NULL)::text AS unique_conversations,
        COUNT(DISTINCT jsonb_extract_path_text((channel_message_metadata)::jsonb, 'phoneNumber')) FILTER (
          WHERE jsonb_extract_path_text((channel_message_metadata)::jsonb, 'phoneNumber') IS NOT NULL
        )::text AS unique_contacts
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND channel = 'WHATSAPP'
        AND created_at >= now() - (${days} || ' days')::interval
      GROUP BY date_trunc('day', created_at)
      ORDER BY date ASC
    `);

    const rows = (analyticsResult as any).rows as Array<{
      date: string;
      user_messages: string;
      ai_responses: string;
      agent_responses: string;
      unique_conversations: string;
      unique_contacts: string;
    }>;

    const data = rows.map((row) => ({
      date: row.date,
      userMessages: parseInt(row.user_messages ?? '0', 10),
      aiResponses: parseInt(row.ai_responses ?? '0', 10),
      agentResponses: parseInt(row.agent_responses ?? '0', 10),
      uniqueWhatsappConversations: parseInt(row.unique_conversations ?? '0', 10),
      uniqueContacts: parseInt(row.unique_contacts ?? '0', 10),
    }));

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error getting WhatsApp analytics per day:', error);
    throw new ApiError('Error getting WhatsApp analytics per day', httpStatus.INTERNAL_SERVER_ERROR);
  }
};
