import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import {
  chatBots as chatBotsTable,
  dataSources as dataSourcesTable,
  embeddings as embeddingsTable,
} from '../../drizzle/schema';
import { DocumentData, QAPair, DatasourceResponse, DeleteKnowledgeResponse, FetchDataSourcesResponse } from './types';
import { eq, and } from 'drizzle-orm';
export const handleProcessDatasource = async (
  userId: string,
  chatbotId: string,
  WebsiteURLs?: string[],
  QandAData?: QAPair[],
  Documents?: DocumentData[],
  TextContent?: string[]
): Promise<DatasourceResponse> => {
  try {
    const parsedChatbotId = parseInt(chatbotId);
    if (isNaN(parsedChatbotId)) {
      throw new ApiError('Invalid chatbot ID', httpStatus.BAD_REQUEST);
    }

    const chatbot = await db
      .select()
      .from(chatBotsTable)
      .where(
        and(
          eq(chatBotsTable.id, parsedChatbotId),
          eq(chatBotsTable.userId, userId)
        )
      )
      .limit(1)
      .then((res) => res[0]);

    if (!chatbot) {
      throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
    }

    const datasourcesToInsert = [];
    
    if (WebsiteURLs && WebsiteURLs.length > 0) {
      for (const url of WebsiteURLs) {
        const urlName = url
          .replace(/^https?:\/\//, '') // remove protocol
          .replace(/^www\./, '') // remove www
          .replace(/\.(com|org|net|edu|gov|io|co|uk|ca|au|de|fr|jp|cn|in|br|ru|es|it|nl|se|no|dk|fi|pl|be|ch|at|cz|gr|pt|ie|nz|za|kr|mx|ar|cl|sg|my|th|id|ph|vn|tr|ua|ro|hu|bg|hr|sk|si|ee|lv|lt|lu|mt|cy|is).*$/, '') // remove common TLDs and everything after
          .replace(/\/$/, ''); // remove trailing slash
        
        datasourcesToInsert.push({
          chatbotId: parsedChatbotId,
          type: 'URL' as const,
          sourceDetails: {},
          name: urlName || url,
          citation: url,
        });
      }
    }

    if (Documents && Documents.length > 0) {
      for (const doc of Documents) {
        const filename = doc.pathname.split('/').pop() || doc.pathname;
        
        datasourcesToInsert.push({
          chatbotId: parsedChatbotId,
          type: 'DOCUMENT' as const,
          sourceDetails: doc,
          name: filename,
          citation: '', // no citation for document upload
        });
      }
    }

    // Process Q&A Data
    if (QandAData && QandAData.length > 0) {
      for (const qna of QandAData) {
        // Get first 10 words of question
        const words = qna.question.trim().split(/\s+/);
        const name = words.slice(0, 10).join(' ');
        
        datasourcesToInsert.push({
          chatbotId: parsedChatbotId,
          type: 'QNA' as const,
          sourceDetails: {},
          name: name,
          citation: qna.citations || '', // use citation if present, otherwise empty string
        });
      }
    }

    // Process Text Content
    if (TextContent && TextContent.length > 0) {
      for (const text of TextContent) {
        // Get first 10 words of text content
        const words = text.trim().split(/\s+/);
        const name = words.slice(0, 10).join(' ');
        
        datasourcesToInsert.push({
          chatbotId: parsedChatbotId,
          type: 'TXT' as const,
          sourceDetails: {},
          name: name,
          citation: '',
        });
      }
    }

    const insertedDatasources = await db
      .insert(dataSourcesTable)
      .values(datasourcesToInsert)
      .returning({ 
        id: dataSourcesTable.id
      });

    return {
      success: true,
      insertedCount: insertedDatasources.length,
      datasourceIds: insertedDatasources.map((ds) => ds.id),
    };
  } catch (error) {
    logger.error('Error processing datasources:', error);
    throw new ApiError('Error processing datasources', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleDeleteKnowledge = async (
  userId: string,
  chatbotId: number,
  datasourceId: number
): Promise<DeleteKnowledgeResponse> => {
  try {
    // First, verify the chatbot exists and belongs to the user
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

    // Verify the datasource exists and belongs to this chatbot
    const datasource = await db
      .select()
      .from(dataSourcesTable)
      .where(
        and(
          eq(dataSourcesTable.id, datasourceId),
          eq(dataSourcesTable.chatbotId, chatbotId)
        )
      )
      .limit(1)
      .then((res) => res[0]);

    if (!datasource) {
      throw new ApiError(
        'Datasource not found or does not belong to this chatbot',
        httpStatus.NOT_FOUND
      );
    }

    // Delete embeddings first (they reference the datasource)
    await db
      .delete(embeddingsTable)
      .where(
        and(
          eq(embeddingsTable.chatbotId, chatbotId),
          eq(embeddingsTable.dataSourceId, datasourceId)
        )
      );

    // Then delete the datasource
    await db
      .delete(dataSourcesTable)
      .where(
        and(
          eq(dataSourcesTable.id, datasourceId),
          eq(dataSourcesTable.chatbotId, chatbotId)
        )
      );

    logger.info(`Successfully deleted datasource ${datasourceId} for chatbot ${chatbotId}`);

    return {
      success: true,
      message: 'Knowledge deleted successfully',
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error deleting knowledge:', error);
    throw new ApiError('Error deleting knowledge', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleFetchDataSources = async (
  userId: string,
  chatbotId: number
): Promise<FetchDataSourcesResponse> => {
  try {
    // First, verify the chatbot exists and belongs to the user
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

    // Fetch all datasources for this chatbot
    const dataSources = await db
      .select({
        id: dataSourcesTable.id,
        type: dataSourcesTable.type,
        name: dataSourcesTable.name,
        sourceDetails: dataSourcesTable.sourceDetails,
        createdAt: dataSourcesTable.createdAt,
        citation: dataSourcesTable.citation,
      })
      .from(dataSourcesTable)
      .where(eq(dataSourcesTable.chatbotId, chatbotId));

    logger.info(`Fetched ${dataSources.length} datasources for chatbot ${chatbotId}`);

    return {
      success: true,
      data: dataSources,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error fetching data sources:', error);
    throw new ApiError('Error fetching data sources', httpStatus.INTERNAL_SERVER_ERROR);
  }
};