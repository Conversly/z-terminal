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
import { getGeminiKeyManager } from '../../shared/apikey-manager';


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
    // Step 1: Fetch the HTML with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    let response: any;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)',
        },
      } as any);
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle DNS resolution errors
      if (fetchError.code === 'EAI_AGAIN' || fetchError.errno === 'EAI_AGAIN') {
        logger.error(`DNS resolution failed for ${url}:`, fetchError);
        throw new ApiError(
          `Unable to reach the website. DNS resolution failed for ${url}. Please check if the website is accessible and try again.`,
          httpStatus.BAD_REQUEST
        );
      }
      
      // Handle network errors
      if (fetchError.name === 'AbortError' || fetchError.code === 'ETIMEDOUT') {
        logger.error(`Request timeout for ${url}:`, fetchError);
        throw new ApiError(
          `Request to ${url} timed out. The website may be slow or unreachable. Please try again.`,
          httpStatus.REQUEST_TIMEOUT
        );
      }
      
      // Handle other fetch errors
      if (fetchError.type === 'system' || fetchError.code) {
        logger.error(`Network error fetching ${url}:`, fetchError);
        throw new ApiError(
          `Unable to fetch the website at ${url}. Please verify the URL is correct and the website is accessible.`,
          httpStatus.BAD_REQUEST
        );
      }
      
      throw fetchError;
    }

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch page: HTTP ${response.status} ${response.statusText}`,
        httpStatus.BAD_REQUEST
      );
    }
    
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
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }
    
    logger.error("Error converting page to markdown:", error);
    
    // Wrap unknown errors
    if (error instanceof Error) {
      throw new ApiError(
        `Error fetching website content: ${error.message}`,
        httpStatus.INTERNAL_SERVER_ERROR
      );
    }
    
    throw new ApiError(
      'An unexpected error occurred while fetching the website',
      httpStatus.INTERNAL_SERVER_ERROR
    );
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let response: any;
    try {
      response = await fetch(websiteUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)',
        },
      } as any);
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      // If fetch fails, fall back to default favicon
      logger.warn(`Failed to fetch homepage for logo detection: ${fetchError.message}`);
      const origin = new URL(websiteUrl).origin;
      return `${origin}/favicon.ico`;
    }

    if (!response.ok) {
      const origin = new URL(websiteUrl).origin;
      return `${origin}/favicon.ico`;
    }
    
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
  } catch (error) {
    // Always fall back to default favicon on any error
    logger.warn(`Error detecting logo URL, using default favicon:`, error);
    try {
      const origin = new URL(websiteUrl).origin;
      return `${origin}/favicon.ico`;
    } catch {
      // If URL parsing fails, return a generic placeholder
      return '';
    }
  }
}

export async function inferBrandFromMarkdown(
  websiteUrl: string,
  markdown: string,
  useCase?: string,
): Promise<{ systemPrompt: string; name: string; description: string; logoUrl?: string }> {
  const systemInstruction = `You analyze a brand's public website content and propose defaults for a customer-facing AI chatbot. Return ONLY strict JSON with keys: systemPrompt, name, description, logoUrl. Do not include code fences or extra text.`;
  const prompt = `Website: ${websiteUrl}\nUse case: ${useCase || 'AI Assistant'}\n\nContent (markdown):\n${markdown}`;

  const keyManager = getGeminiKeyManager();
  const maxRetries = 3; // Try up to 3 different keys
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = keyManager.getCurrentKey();
    if (!apiKey) {
      logger.error('No Gemini API keys available');
      throw new ApiError('Gemini API key is not configured', httpStatus.INTERNAL_SERVER_ERROR);
    }

    let response;
    try {
      response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        },
        { 
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          timeout: 30000, // 30 second timeout
        }
      );

      // Success - report it and process response
      keyManager.reportSuccess(apiKey);

      const textOut = response.data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
      if (!textOut) {
        logger.error('Gemini API returned empty response:', response.data);
        throw new ApiError('Failed to infer brand details: Empty response from Gemini API', httpStatus.INTERNAL_SERVER_ERROR);
      }
      let parsed: any;
      try {
        parsed = JSON.parse(textOut);
      } catch (parseError) {
        logger.error('Failed to parse Gemini API response as JSON:', { textOut, error: parseError });
        throw new ApiError('Model returned non-JSON output', httpStatus.INTERNAL_SERVER_ERROR);
      }

      const systemPrompt: string = parsed.systemPrompt || parsed.system_prompt;
      const name: string = parsed.name || '';
      const description: string = parsed.description || '';
      const logoUrl: string | undefined = parsed.logoUrl || parsed.logo_url || undefined;

      if (!systemPrompt) {
        logger.error('Missing systemPrompt in Gemini API response:', parsed);
        throw new ApiError('Missing systemPrompt in model output', httpStatus.INTERNAL_SERVER_ERROR);
      }

      return { systemPrompt, name, description, logoUrl };
    } catch (axiosError: any) {
      lastError = axiosError;
      logger.error(`Error calling Gemini API for inferBrandFromMarkdown (attempt ${attempt + 1}/${maxRetries}):`, {
        message: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        code: axiosError.code,
      });

      // Rotate to next key and try again (unless this was the last attempt)
      if (attempt < maxRetries - 1) {
        keyManager.rotateKey(apiKey, axiosError);
        logger.info(`Rotating to next API key and retrying...`);
        continue;
      }
    }
  }

  // All retries exhausted
  if (lastError?.response) {
    const errorData = lastError.response.data;
    const errorMessage = errorData?.error?.message || errorData?.message || 'Gemini API error';
    throw new ApiError(`Gemini API error: ${errorMessage}`, httpStatus.INTERNAL_SERVER_ERROR);
  } else if (lastError?.request) {
    throw new ApiError('No response from Gemini API. Please check your network connection.', httpStatus.INTERNAL_SERVER_ERROR);
  } else {
    throw new ApiError(`Error calling Gemini API: ${lastError?.message || 'Unknown error'}`, httpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function generateTopicsFromContent(
  websiteUrl: string,
  markdown: string,
  useCase?: string,
): Promise<string[]> {
  const systemInstruction = `You create a concise taxonomy of user question topics for a chatbot.
Return ONLY a strict JSON array of 10 short topic names (strings), each <= 3 words.
Do not include code fences or any extra text.`;
  const prompt = `Website: ${websiteUrl}
Use case: ${useCase || 'AI Assistant'}

Public content (markdown excerpt):
${markdown}`;

  const keyManager = getGeminiKeyManager();
  const maxRetries = 3; // Try up to 3 different keys
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = keyManager.getCurrentKey();
    if (!apiKey) {
      logger.error('No Gemini API keys available');
      throw new ApiError('Gemini API key is not configured', httpStatus.INTERNAL_SERVER_ERROR);
    }

    let response;
    try {
      response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        },
        { 
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          timeout: 30000, // 30 second timeout
        }
      );

      // Success - report it and process response
      keyManager.reportSuccess(apiKey);

      const textOut = response.data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
      if (!textOut) {
        logger.error('Gemini API returned empty response for topics:', response.data);
        throw new ApiError('Failed to generate topics: Empty response from Gemini API', httpStatus.INTERNAL_SERVER_ERROR);
      }
      let parsed: any;
      try {
        parsed = JSON.parse(textOut);
      } catch (parseError) {
        logger.error('Failed to parse Gemini API response as JSON for topics:', { textOut, error: parseError });
        throw new ApiError('Model returned non-JSON output for topics', httpStatus.INTERNAL_SERVER_ERROR);
      }
      if (!Array.isArray(parsed)) {
        logger.error('Gemini API did not return an array for topics:', parsed);
        throw new ApiError('Model did not return an array of topics', httpStatus.INTERNAL_SERVER_ERROR);
      }
      const cleaned = parsed
        .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
        .filter((t: string) => t.length > 0)
        .slice(0, 10);
      return Array.from(new Set(cleaned));
    } catch (axiosError: any) {
      lastError = axiosError;
      logger.error(`Error calling Gemini API for generateTopicsFromContent (attempt ${attempt + 1}/${maxRetries}):`, {
        message: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        code: axiosError.code,
      });

      // Rotate to next key and try again (unless this was the last attempt)
      if (attempt < maxRetries - 1) {
        keyManager.rotateKey(apiKey, axiosError);
        logger.info(`Rotating to next API key and retrying...`);
        continue;
      }
    }
  }

  // All retries exhausted
  if (lastError?.response) {
    const errorData = lastError.response.data;
    const errorMessage = errorData?.error?.message || errorData?.message || 'Gemini API error';
    throw new ApiError(`Gemini API error: ${errorMessage}`, httpStatus.INTERNAL_SERVER_ERROR);
  } else if (lastError?.request) {
    throw new ApiError('No response from Gemini API. Please check your network connection.', httpStatus.INTERNAL_SERVER_ERROR);
  } else {
    throw new ApiError(`Error calling Gemini API: ${lastError?.message || 'Unknown error'}`, httpStatus.INTERNAL_SERVER_ERROR);
  }
}
