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
  GetTopicBarChartResponse,
  GetTopicPieChartResponse,
} from './types';
import { eq, and, sql, inArray, desc } from 'drizzle-orm';
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

    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 5;

    const rows = await db
      .select({
        content: messagesTable.content,
        feedback: messagesTable.feedback,
        feedbackComment: messagesTable.feedbackComment,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.chatbotId, chatbotId),
          inArray(messagesTable.feedback, [1, 2]) // 1=like, 2=dislike
        )
      )
      .orderBy(desc(messagesTable.createdAt))
      .limit(safeLimit);

    const data = rows.map((r) => ({
      content: r.content,
      feedback: r.feedback === 1 ? 'like' as const : 'dislike' as const,
      feedbackComment: r.feedbackComment ?? null,
      createdAt: r.createdAt as Date,
    }));

    return { success: true, data };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching recent feedbacks:', error);
    throw new ApiError('Error fetching recent feedbacks', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleGetTopicBarChart = async (
  userId: string,
  chatbotId: number,
  days: number
): Promise<GetTopicBarChartResponse> => {
  try {
    const chatbot = await verifyChatbotOwnership(chatbotId, userId);

    const startDateSql = sql`(CURRENT_DATE - (${days - 1})::int)`;
    const endDateSql = sql`CURRENT_DATE`;

    const rowsRes = await db.execute(sql<{
      topic_id: number;
      topic_name: string;
      topic_color: string | null;
      date: string;
      messages: number;
      likes: number;
      dislikes: number;
    }>`
      WITH dates AS (
        SELECT generate_series(${startDateSql}, ${endDateSql}, '1 day'::interval)::date AS date
      ),
      topics AS (
        SELECT id, name, color
        FROM chatbot_topics
        WHERE chatbot_id = ${chatbotId}
      )
      SELECT
        t.id AS topic_id,
        t.name AS topic_name,
        t.color AS topic_color,
        to_char(d.date, 'YYYY-MM-DD') AS date,
        COALESCE(s.message_count, 0)::int AS messages,
        COALESCE(s.like_count, 0)::int AS likes,
        COALESCE(s.dislike_count, 0)::int AS dislikes
      FROM topics t
      CROSS JOIN dates d
      LEFT JOIN chatbot_topic_stats s
        ON s.chatbot_id = ${chatbotId}
       AND s.topic_id = t.id
       AND s.date = d.date
      ORDER BY t.id, d.date
    `);

    const rows = (rowsRes as any).rows as Array<{
      topic_id: number;
      topic_name: string;
      topic_color: string | null;
      date: string;
      messages: number;
      likes: number;
      dislikes: number;
    }>;

    const topicsMap = new Map<number, { topicId: number; topicName: string; color: string | null; series: Array<{ date: string; messages: number; likes: number; dislikes: number }> }>();
    for (const r of rows) {
      if (!topicsMap.has(r.topic_id)) {
        topicsMap.set(r.topic_id, { topicId: r.topic_id, topicName: r.topic_name, color: r.topic_color, series: [] });
      }
      topicsMap.get(r.topic_id)!.series.push({
        date: r.date,
        messages: Number(r.messages) || 0,
        likes: Number(r.likes) || 0,
        dislikes: Number(r.dislikes) || 0,
      });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (days - 1));

    return {
      success: true,
      data: {
        topics: Array.from(topicsMap.values()),
        dateRange: {
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        },
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching topic bar chart:', error);
    throw new ApiError('Error fetching topic bar chart', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleGetTopicPieChart = async (
  userId: string,
  chatbotId: number,
  days: number
): Promise<GetTopicPieChartResponse> => {
  try {
    const chatbot = await verifyChatbotOwnership(chatbotId, userId);

    const startDateSql = sql`(CURRENT_DATE - (${days - 1})::int)`;
    const endDateSql = sql`CURRENT_DATE`;

    const rowsRes = await db.execute(sql<{
      topic_id: number;
      topic_name: string;
      topic_color: string | null;
      messages: number;
      likes: number;
      dislikes: number;
    }>`
      SELECT
        t.id AS topic_id,
        t.name AS topic_name,
        t.color AS topic_color,
        COALESCE(SUM(s.message_count), 0)::int AS messages,
        COALESCE(SUM(s.like_count), 0)::int AS likes,
        COALESCE(SUM(s.dislike_count), 0)::int AS dislikes
      FROM chatbot_topics t
      LEFT JOIN chatbot_topic_stats s
        ON s.chatbot_id = ${chatbotId}
       AND s.topic_id = t.id
       AND s.date BETWEEN ${startDateSql} AND ${endDateSql}
      WHERE t.chatbot_id = ${chatbotId}
      GROUP BY t.id, t.name, t.color
      ORDER BY t.name
    `);

    const rows = (rowsRes as any).rows as Array<{
      topic_id: number;
      topic_name: string;
      topic_color: string | null;
      messages: number;
      likes: number;
      dislikes: number;
    }>;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (days - 1));

    return {
      success: true,
      data: {
        topics: rows.map(r => ({
          topicId: r.topic_id,
          topicName: r.topic_name,
          color: r.topic_color,
          messages: Number(r.messages) || 0,
          likes: Number(r.likes) || 0,
          dislikes: Number(r.dislikes) || 0,
        })),
        dateRange: {
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        },
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching topic pie chart:', error);
    throw new ApiError('Error fetching topic pie chart', httpStatus.INTERNAL_SERVER_ERROR);
  }
};
