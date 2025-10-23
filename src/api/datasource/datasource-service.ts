import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import {
  chatBots as chatBotsTable,
  dataSources as dataSourcesTable,
} from '../../drizzle/schema';
import { DocumentData, QAPair, DatasourceResponse } from './types';
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