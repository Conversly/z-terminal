import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import {
  chatBots as chatBotsTable,
  analytics as analyticsTable,
  citations as citationsTable,
  messages as messagesTable,
} from '../../drizzle/schema';
import {
  GetAnalyticsResponse,
  GetSummaryResponse,
  GetChartsResponse,
  GetFeedbacksResponse,
} from './types';
import { eq, and, sql } from 'drizzle-orm';
import { verifyChatbotOwnership } from '../../shared/helper-queries';

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

export const handleGetSummary = async (
  userId: string,
  chatbotId: number
): Promise<GetSummaryResponse> => {
  try {
    const chatbot = await verifyChatbotOwnership(chatbotId, userId);

    const totalMessagesMonthResult = await db.execute(sql<{
      count: string;
    }>`
      SELECT COUNT(*)::text AS count
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND date_trunc('month', created_at) = date_trunc('month', now())
    `);

    const totalMessagesThisMonth = parseInt((totalMessagesMonthResult as any).rows[0]?.count ?? '0', 10);

    const avgMessagesPerConversationResult = await db.execute(sql<{
      avg: string | null;
    }>`
      SELECT
        CASE WHEN COUNT(DISTINCT unique_conv_id) = 0 THEN NULL
             ELSE (COUNT(*)::float / COUNT(DISTINCT unique_conv_id)) END AS avg
      FROM messages
      WHERE chatbot_id = ${chatbotId}
    `);

    const avgMessagesPerConversation = parseFloat((avgMessagesPerConversationResult as any).rows[0]?.avg ?? '0') || 0;

    const activeConversationsTodayResult = await db.execute(sql<{
      count: string;
    }>`
      SELECT COUNT(DISTINCT unique_conv_id)::text AS count
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND created_at >= now() - interval '1 day'
    `);

    const activeConversationsToday = parseInt((activeConversationsTodayResult as any).rows[0]?.count ?? '0', 10);

    const analyticsRecord = await db
      .select({ responses: analyticsTable.responses, likes: analyticsTable.likes, dislikes: analyticsTable.dislikes })
      .from(analyticsTable)
      .where(eq(analyticsTable.chatbotId, chatbotId))
      .limit(1)
      .then((r) => r[0]);

    const responses = analyticsRecord?.responses ?? 0;
    const likes = analyticsRecord?.likes ?? 0;
    const dislikes = analyticsRecord?.dislikes ?? 0;
    const likeRatePercent = responses > 0 ? (100 * likes) / responses : 0;

    return {
      success: true,
      data: {
        totalMessagesThisMonth,
        avgMessagesPerConversation,
        likeRatePercent,
        activeConversationsToday,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching analytics summary:', error);
    throw new ApiError('Error fetching analytics summary', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleGetCharts = async (
  userId: string,
  chatbotId: number,
  days: number
): Promise<GetChartsResponse> => {
  try {
    const chatbot = await verifyChatbotOwnership(chatbotId, userId);

    const messagesPerDayRes = await db.execute(sql<{
      date: string;
      count: string;
    }>`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, COUNT(*)::text AS count
      FROM messages
      WHERE chatbot_id = ${chatbotId}
        AND created_at >= now() - (${days} || ' days')::interval
      GROUP BY 1
      ORDER BY 1
    `);

    const messagesPerDay = ((messagesPerDayRes as any).rows as Array<{ date: string; count: string }>).map(r => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));

    const convsPerDayRes = await db.execute(sql<{
      date: string;
      convs: string;
    }>`
      WITH first_msgs AS (
        SELECT unique_conv_id, MIN(created_at) AS first_at
        FROM messages
        WHERE chatbot_id = ${chatbotId}
          AND created_at >= now() - (${days} || ' days')::interval
        GROUP BY unique_conv_id
      )
      SELECT to_char(date_trunc('day', first_at), 'YYYY-MM-DD') AS date, COUNT(*)::text AS convs
      FROM first_msgs
      GROUP BY 1
      ORDER BY 1
    `);

    const conversationsPerDay = ((convsPerDayRes as any).rows as Array<{ date: string; convs: string }>).map(r => ({
      date: r.date,
      count: parseInt(r.convs, 10),
    }));

    const analyticsRecord = await db
      .select({ responses: analyticsTable.responses, likes: analyticsTable.likes, dislikes: analyticsTable.dislikes })
      .from(analyticsTable)
      .where(eq(analyticsTable.chatbotId, chatbotId))
      .limit(1)
      .then((r) => r[0]);

    const responses = analyticsRecord?.responses ?? 0;
    const likes = analyticsRecord?.likes ?? 0;
    const dislikes = analyticsRecord?.dislikes ?? 0;
    const none = Math.max(0, responses - likes - dislikes);

    return {
      success: true,
      data: {
        messagesPerDay,
        conversationsPerDay,
        feedbackDistribution: { likes, dislikes, none },
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching analytics charts:', error);
    throw new ApiError('Error fetching analytics charts', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleGetFeedbacks = async (
  userId: string,
  chatbotId: number,
  limit: number
): Promise<GetFeedbacksResponse> => {
  try {
    const chatbot = await verifyChatbotOwnership(chatbotId, userId);

    // Feedback fields (feedback, feedback_comment) not present in messages schema currently.
    // Return empty list as placeholder to avoid breaking API; when fields are added,
    // update this query accordingly.
    return { success: true, data: [] };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching recent feedbacks:', error);
    throw new ApiError('Error fetching recent feedbacks', httpStatus.INTERNAL_SERVER_ERROR);
  }
};
