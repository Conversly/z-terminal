import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import { messages as messagesTable } from '../../drizzle/schema';
import { and, eq, sql, asc } from 'drizzle-orm';
import { ChatlogItem, GetChatlogsResponse, GetMessagesResponse, MessageItem } from './types';
import { verifyChatbotOwnership } from '../../shared/helper-queries';

export const handleGetChatlogs = async (
  userId: string,
  chatbotId: string
): Promise<GetChatlogsResponse> => {
  try {
    // Verify chatbot ownership
    const chatbot = await verifyChatbotOwnership(chatbotId, userId);

    // Fetch latest 50 conversations (by last activity), with first starting user message per conversation
    // make sure this table have proper indexes, otherwise it will be very slow
    const result = await db.execute(sql`
      SELECT
        m.unique_conv_id AS "uniqueConvId",
        MAX(m.created_at) AS "lastActivity",
        (
          SELECT m2.content
          FROM messages m2
          WHERE m2.chatbot_id = ${chatbotId}
            AND m2.unique_conv_id = m.unique_conv_id
            AND m2.type = 'user'
          ORDER BY m2.created_at ASC
          LIMIT 1
        ) AS "firstUserMessage"
      FROM messages m
      WHERE m.chatbot_id = ${chatbotId}
      GROUP BY m.unique_conv_id
      ORDER BY "lastActivity" DESC
      LIMIT 50
    `);

    const rows = (result as any).rows as Array<{ uniqueConvId: string; firstUserMessage: string | null; lastActivity: Date | string }>; 

    return {
      success: true,
      data: rows.map((r) => ({
        uniqueConvId: r.uniqueConvId,
        firstUserMessage: r.firstUserMessage ?? null,
        lastActivity: r.lastActivity instanceof Date ? r.lastActivity : new Date(r.lastActivity as unknown as string),
      })),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching chatlogs:', error);
    throw new ApiError('Error fetching chatlogs', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleGetMessages = async (
  userId: string,
  chatbotId: string,
  uniqueConvId: string
): Promise<GetMessagesResponse> => {
  try {
    const chatbot = await verifyChatbotOwnership(chatbotId, userId);

    const messages = await db
      .select({
        id: messagesTable.id,
        type: messagesTable.type,
        content: messagesTable.content,
        createdAt: messagesTable.createdAt,
        citations: messagesTable.citations,
      })
      .from(messagesTable)
      .where(and(eq(messagesTable.chatbotId, chatbotId), eq(messagesTable.uniqueConvId, uniqueConvId)))
      .orderBy(asc(messagesTable.createdAt));

    const data: MessageItem[] = messages.map((m) => ({
      id: m.id,
      type: m.type as MessageItem['type'],
      content: m.content,
      createdAt: m.createdAt as Date,
      citations: (m.citations as unknown as string[]) ?? [],
    }));

    return { success: true, data };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching messages:', error);
    throw new ApiError('Error fetching messages', httpStatus.INTERNAL_SERVER_ERROR);
  }
};


