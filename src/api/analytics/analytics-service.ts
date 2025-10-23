import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import {
  chatBots as chatBotsTable,
  analytics as analyticsTable,
  citations as citationsTable,
} from '../../drizzle/schema';
import { GetAnalyticsResponse } from './types';
import { eq, and } from 'drizzle-orm';

export const handleGetAnalytics = async (
  userId: string,
  chatbotId: number
): Promise<GetAnalyticsResponse> => {
  try {
    // Step 1: Verify the chatbot exists and belongs to the user
    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(
        and(
          eq(chatBotsTable.id, chatbotId),
          eq(chatBotsTable.userId, userId)
        )
      )
      .limit(1)
      .then((res) => res[0]);

    if (!chatbot) {
      throw new ApiError(
        'Chatbot not found or does not belong to user',
        httpStatus.NOT_FOUND
      );
    }

    // Step 2: Fetch analytics record for the given chatbotId
    const analyticsRecord = await db
      .select({
        id: analyticsTable.id,
        responses: analyticsTable.responses,
        likes: analyticsTable.likes,
        dislikes: analyticsTable.dislikes,
      })
      .from(analyticsTable)
      .where(eq(analyticsTable.chatbotId, chatbotId))
      .limit(1)
      .then((res) => res[0]);

    // If no analytics record exists, return default values
    if (!analyticsRecord) {
      logger.info(`No analytics found for chatbot ${chatbotId}, returning defaults`);
      return {
        success: true,
        data: {
          responses: 0,
          likes: 0,
          dislikes: 0,
          citations: [],
        },
      };
    }

    // Step 3: Fetch citations for this chatbot
    const citationsList = await db
      .select({
        source: citationsTable.source,
        count: citationsTable.count,
      })
      .from(citationsTable)
      .where(eq(citationsTable.chatbotId, chatbotId));

    logger.info(
      `Fetched analytics for chatbot ${chatbotId}: ${analyticsRecord.responses} responses, ${citationsList.length} citations`
    );

    return {
      success: true,
      data: {
        responses: analyticsRecord.responses ?? 0,
        likes: analyticsRecord.likes ?? 0,
        dislikes: analyticsRecord.dislikes ?? 0,
        citations: citationsList.length > 0 
          ? citationsList.map(c => ({ source: c.source, count: c.count ?? 0 }))
          : [],
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error fetching analytics:', error);
    throw new ApiError('Error fetching analytics', httpStatus.INTERNAL_SERVER_ERROR);
  }
};
