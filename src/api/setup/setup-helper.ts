import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import {
  dataSources as dataSourcesTable,
} from '../../drizzle/schema';
import { DocumentData, DatasourceResponse } from './types';
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";
import getColors from 'get-image-colors';

import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import axios from 'axios';
import env from '../../config';


/**
 * Fetches an image from a URL and extracts its primary color.
 * @param imageUrl - URL of the avatar or logo image
 * @returns A hex color string, e.g. "#3498db"
 */
function isNeutralColor(hex: string): boolean {
  const c = parseInt(hex.slice(1), 16);
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  return (diff < 20) || (max > 230) || (max < 25);
}

export async function getPrimaryColorFromImage(imageUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      maxRedirects: 5,
      timeout: 10000,
    });

    const contentType = (response.headers as any)['content-type'] as string | undefined;
    if (!contentType?.startsWith('image/')) {
      throw new ApiError('Provided URL is not an image', httpStatus.BAD_REQUEST);
    }

    const buffer = Buffer.from(response.data);
    const colors = await getColors(buffer, contentType);
    if (!colors || colors.length === 0) return null;

    const filtered = colors
      .map((c: any) => c.hex())
      .filter((hex: string) => !isNeutralColor(hex));

    const primary = filtered[0] || colors[0].hex();
    logger.info(`Extracted brand color: ${primary}`);
    return primary;
  } catch (error) {
    logger.error('Error extracting primary color:', error);
    throw new ApiError('Error extracting primary color', httpStatus.INTERNAL_SERVER_ERROR);
  }
}
/**
 * Fetches a webpage's HTML and converts it into Markdown.
 * @param url - The URL of the webpage
 * @returns Markdown string
 */
export async function fetchAndConvertToMarkdown(url: string): Promise<string> {
  try {
    // Step 1: Fetch the HTML
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch page: ${response.status}`);
    const html = await response.text();

    // Step 2: Load into DOM parser
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Optional cleanup — remove unnecessary elements
    document.querySelectorAll("script, style, noscript, iframe").forEach((el: Element) => el.remove());

    // Step 3: Convert HTML to Markdown
    const turndownService = new TurndownService({
      headingStyle: "atx", // # for headings
      codeBlockStyle: "fenced", // ``` for code
    });

    const markdown = turndownService.turndown(document.body.innerHTML);

    return markdown;
  } catch (error) {
    console.error("Error converting page to markdown:", error);
    throw error;
  }
}

async function resolveAbsoluteUrl(base: string, href: string | null | undefined): Promise<string | null> {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export async function detectLogoUrl(websiteUrl: string): Promise<string> {
  try {
    const response = await fetch(websiteUrl);
    if (!response.ok) throw new Error('Failed to fetch homepage');
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const linkIcon = document.querySelector('link[rel~="icon" i]') as HTMLLinkElement | null;
    const linkShortcut = document.querySelector('link[rel~="shortcut" i][rel~="icon" i]') as HTMLLinkElement | null;
    const appleTouch = document.querySelector('link[rel~="apple-touch-icon" i]') as HTMLLinkElement | null;
    const ogImage = document.querySelector('meta[property="og:image" i]') as HTMLMetaElement | null;
    const imgLogo = document.querySelector('img[id*="logo" i], img[class*="logo" i], img[alt*="logo" i]') as HTMLImageElement | null;

    const candidates = [
      await resolveAbsoluteUrl(websiteUrl, linkIcon?.href),
      await resolveAbsoluteUrl(websiteUrl, linkShortcut?.href),
      await resolveAbsoluteUrl(websiteUrl, appleTouch?.href),
      await resolveAbsoluteUrl(websiteUrl, ogImage?.getAttribute('content') || undefined),
      await resolveAbsoluteUrl(websiteUrl, imgLogo?.getAttribute('src') || undefined),
    ].filter(Boolean) as string[];

    if (candidates.length > 0) return candidates[0];

    const origin = new URL(websiteUrl).origin;
    return `${origin}/favicon.ico`;
  } catch {
    const origin = new URL(websiteUrl).origin;
    return `${origin}/favicon.ico`;
  }
}

export async function inferBrandFromMarkdown(
  websiteUrl: string,
  markdown: string,
  useCase?: string,
): Promise<{ systemPrompt: string; name: string; description: string; logoUrl?: string }> {
  const { getKeyRotationManager } = await import('../../shared/apiKeyRotationManager');
  const keyManager = getKeyRotationManager();
  
  const systemInstruction = `You analyze a brand's public website content and propose defaults for a customer-facing AI chatbot. Return ONLY strict JSON with keys: systemPrompt, name, description, logoUrl. Do not include code fences or extra text.`;
  const prompt = `Website: ${websiteUrl}\nUse case: ${useCase || 'AI Assistant'}\n\nContent (markdown):\n${markdown}`;

  const maxKeyRotations = keyManager.getAvailableKeyCount();
  let attempts = 0;

  while (attempts < maxKeyRotations) {
    const currentApiKey = keyManager.getCurrentKey();
    
    if (!currentApiKey) {
      throw new ApiError('No API keys available', httpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      logger.info(`Attempting Gemini API call with key rotation (attempt ${attempts + 1}/${maxKeyRotations})`);
      
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        },
        { 
          headers: { 'x-goog-api-key': currentApiKey, 'Content-Type': 'application/json' },
          timeout: 30000 // 30 second timeout
        }
      );

      const textOut = response.data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
      if (!textOut) {
        throw new ApiError('Failed to infer brand details', httpStatus.INTERNAL_SERVER_ERROR);
      }
      
      let parsed: any;
      try {
        parsed = JSON.parse(textOut);
      } catch {
        throw new ApiError('Model returned non-JSON output', httpStatus.INTERNAL_SERVER_ERROR);
      }

      const systemPrompt: string = parsed.systemPrompt || parsed.system_prompt;
      const name: string = parsed.name || '';
      const description: string = parsed.description || '';
      const logoUrl: string | undefined = parsed.logoUrl || parsed.logo_url || undefined;

      if (!systemPrompt) {
        throw new ApiError('Missing systemPrompt in model output', httpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info('Successfully inferred brand details from markdown');
      return { systemPrompt, name, description, logoUrl };
      
    } catch (error: any) {
      logger.error(`Gemini API call failed:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
        attempt: attempts + 1,
        responseData: error.response?.data,
        apiKey: currentApiKey?.substring(0, 20) + '...',
      });

      // Check if we should rotate the key
      const shouldRotate = error.response?.status === 429 || // Rate limit
                          error.response?.status === 403 || // Quota exceeded
                          error.response?.status === 503 || // Service unavailable
                          error.code === 'ECONNRESET' ||
                          error.code === 'ETIMEDOUT';

      if (shouldRotate) {
        logger.info(`Rotating to next API key due to error (status: ${error.response?.status}, code: ${error.code})`);
        keyManager.rotateKey(currentApiKey, error);
        attempts++;
        continue;
      }

      // For 400 errors, check if it's an API key issue before throwing
      if (error.response?.status === 400) {
        const errorDetails = JSON.stringify(error.response?.data || {});
        logger.error(`400 error details:`, errorDetails);
        if (errorDetails.includes('API_KEY_INVALID') || errorDetails.includes('invalid api key') || errorDetails.includes('API key not valid')) {
          logger.warn(`Invalid API key detected, rotating (status: 400)`);
          keyManager.rotateKey(currentApiKey, error);
          attempts++;
          continue;
        }
      }

      // For non-rotatable errors, throw immediately
      if (error.response?.status === 401) {
        throw new ApiError('Invalid API key or insufficient permissions.', httpStatus.UNAUTHORIZED);
      } else {
        throw new ApiError(`Failed to infer brand details: ${error.message || 'Unknown error'}`, httpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  // If we've exhausted all keys
  const stats = keyManager.getStats();
  logger.error('All API keys exhausted', stats);
  throw new ApiError('All API keys are rate limited or unavailable. Please try again later.', httpStatus.TOO_MANY_REQUESTS);
}

export async function generateTopicsFromContent(
  websiteUrl: string,
  markdown: string,
  useCase?: string,
): Promise<string[]> {
  const { getKeyRotationManager } = await import('../../shared/apiKeyRotationManager');
  const keyManager = getKeyRotationManager();
  
  const systemInstruction = `You create a concise taxonomy of user question topics for a chatbot.
Return ONLY a strict JSON array of 10 short topic names (strings), each <= 3 words.
Do not include code fences or any extra text.`;
  const prompt = `Website: ${websiteUrl}
Use case: ${useCase || 'AI Assistant'}

Public content (markdown excerpt):
${markdown}`;

  const maxKeyRotations = keyManager.getAvailableKeyCount();
  let attempts = 0;

  while (attempts < maxKeyRotations) {
    const currentApiKey = keyManager.getCurrentKey();
    
    if (!currentApiKey) {
      throw new ApiError('No API keys available', httpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      logger.info(`Attempting Gemini API topics call with key rotation (attempt ${attempts + 1}/${maxKeyRotations})`);
      
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        },
        { 
          headers: { 'x-goog-api-key': currentApiKey, 'Content-Type': 'application/json' },
          timeout: 30000 // 30 second timeout
        }
      );

      const textOut = response.data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
      if (!textOut) {
        throw new ApiError('Failed to generate topics', httpStatus.INTERNAL_SERVER_ERROR);
      }
      
      let parsed: any;
      try {
        parsed = JSON.parse(textOut);
      } catch {
        throw new ApiError('Model returned non-JSON output for topics', httpStatus.INTERNAL_SERVER_ERROR);
      }
      
      if (!Array.isArray(parsed)) {
        throw new ApiError('Model did not return an array of topics', httpStatus.INTERNAL_SERVER_ERROR);
      }
      
      const cleaned = parsed
        .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
        .filter((t: string) => t.length > 0)
        .slice(0, 10);
        
      logger.info(`Successfully generated ${cleaned.length} topics from content`);
      return Array.from(new Set(cleaned));
      
    } catch (error: any) {
      logger.error(`Gemini API topics call failed:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
        attempt: attempts + 1,
        responseData: error.response?.data,
        apiKey: currentApiKey?.substring(0, 20) + '...',
      });

      // Check if we should rotate the key
      const shouldRotate = error.response?.status === 429 || // Rate limit
                          error.response?.status === 403 || // Quota exceeded
                          error.response?.status === 503 || // Service unavailable
                          error.code === 'ECONNRESET' ||
                          error.code === 'ETIMEDOUT';

      if (shouldRotate) {
        logger.info(`Rotating to next API key due to error (status: ${error.response?.status}, code: ${error.code})`);
        keyManager.rotateKey(currentApiKey, error);
        attempts++;
        continue;
      }

      // For 400 errors, check if it's an API key issue before throwing
      if (error.response?.status === 400) {
        const errorDetails = JSON.stringify(error.response?.data || {});
        logger.error(`400 error details for topics:`, errorDetails);
        if (errorDetails.includes('API_KEY_INVALID') || errorDetails.includes('invalid api key') || errorDetails.includes('API key not valid')) {
          logger.warn(`Invalid API key detected for topics, rotating (status: 400)`);
          keyManager.rotateKey(currentApiKey, error);
          attempts++;
          continue;
        }
      }

      // For non-rotatable errors, throw immediately
      if (error.response?.status === 401) {
        throw new ApiError('Invalid API key or insufficient permissions.', httpStatus.UNAUTHORIZED);
      } else {
        throw new ApiError(`Failed to generate topics: ${error.message || 'Unknown error'}`, httpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  // If we've exhausted all keys
  const stats = keyManager.getStats();
  logger.error('All API keys exhausted for topics generation', stats);
  throw new ApiError('All API keys are rate limited or unavailable. Please try again later.', httpStatus.TOO_MANY_REQUESTS);
}
