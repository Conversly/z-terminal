
import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import { chatBots as chatBotsTable, dataSources as dataSourcesTable } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import {
  fetchAndConvertToMarkdown,
  getPrimaryColorFromImage,
  detectLogoUrl,
  inferBrandFromMarkdown,
} from './setup-helper';

import { saveDatasources, discoverWebsiteUrls, buildPublicDocuments } from './search-sources-helper';
import { SearchSourcesResponse } from './types';
import { DataSourceItem } from '../datasource/types';


// 1. fetch logo, files from given url.
// 3. fetch brand colors, name.
// 1. fetch sitemap
// 2. parse sitemap : extract urls upto 3 levels
// 4. adjust prompt based on use-case and brand info.

export const handleInferPrompt = async (
  userId: string,
  chatbotId: string,
  websiteUrl: string,
  useCase?: string
): Promise<{ chatbotId: string; name: string; description: string; systemPrompt: string; logoUrl: string; }> => {
  try {
    const markdownRaw = await fetchAndConvertToMarkdown(websiteUrl);
    const markdown = markdownRaw.slice(0, 15000);
    const inferred = await inferBrandFromMarkdown(websiteUrl, markdown, useCase);
    const systemPrompt: string = inferred.systemPrompt;
    const name: string = inferred.name;
    const description: string = inferred.description;
    const logoFromModel: string | undefined = inferred.logoUrl;
    const logoUrl: string = logoFromModel || await detectLogoUrl(websiteUrl);

    const [updated] = await db
      .update(chatBotsTable)
      .set({
        name,
        description,
        systemPrompt,
        logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(chatBotsTable.id, parseInt(chatbotId)))
      .returning();

    if (!updated) throw new ApiError('Chatbot not found', httpStatus.NOT_FOUND);

    return { chatbotId, name: updated.name, description: updated.description, systemPrompt: updated.systemPrompt, logoUrl: updated.logoUrl || logoUrl };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error inferring prompt:', error);
    throw new ApiError('Error inferring prompt', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleAnalyzeImage = async (
  userId: string,
  chatbotId: string,
  imageUrl: string
): Promise<{ chatbotId: string; primaryColor: string; }> => {
  try {
    const color = await getPrimaryColorFromImage(imageUrl);
    if (!color) throw new ApiError('Unable to extract primary color', httpStatus.BAD_REQUEST);

    const [updated] = await db
      .update(chatBotsTable)
      .set({
        primaryColor: color,
        updatedAt: new Date(),
      })
      .where(eq(chatBotsTable.id, parseInt(chatbotId)))
      .returning();

    if (!updated) throw new ApiError('Chatbot not found', httpStatus.NOT_FOUND);

    return { chatbotId, primaryColor: updated.primaryColor };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error analyzing image:', error);
    throw new ApiError('Error analyzing image', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleSearchSources = async (
  userId: string,
  chatbotId: string,
  websiteUrl: string,
  useCase?: string
): Promise<SearchSourcesResponse> => {
  try {
    const discovered = await discoverWebsiteUrls(websiteUrl, 100, 50);

    const parsedChatbotId = parseInt(chatbotId);

    const totalUrls = discovered.urls.length;
    const totalPages = discovered.pages.length;
    const documents = totalUrls > 0 ? await buildPublicDocuments(discovered.files) : [];
    const totalFiles = documents.length;

    let inserted = 0;
    if (totalUrls > 0) {
      const res = await saveDatasources(userId, parsedChatbotId, discovered.pages, documents);
      inserted = res.success ? (totalPages + totalFiles) : 0;
    }

    const dataSources: DataSourceItem[] = await db
      .select({
        id: dataSourcesTable.id,
        type: dataSourcesTable.type,
        name: dataSourcesTable.name,
        sourceDetails: dataSourcesTable.sourceDetails,
        createdAt: dataSourcesTable.createdAt,
        citation: dataSourcesTable.citation,
      })
      .from(dataSourcesTable)
      .where(eq(dataSourcesTable.chatbotId, parsedChatbotId));

    return {
      success: true,
      data: dataSources,
      totalUrls,
      totalPages,
      totalFiles,
      insertedCount: inserted,
      source: discovered.source,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error searching sources:', error);
    throw new ApiError('Error searching sources', httpStatus.INTERNAL_SERVER_ERROR);
  }
};
