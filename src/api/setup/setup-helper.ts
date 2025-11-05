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
  const systemInstruction = `You analyze a brand's public website content and propose defaults for a customer-facing AI chatbot. Return ONLY strict JSON with keys: systemPrompt, name, description, logoUrl. Do not include code fences or extra text.`;
  const prompt = `Website: ${websiteUrl}\nUse case: ${useCase || 'AI Assistant'}\n\nContent (markdown):\n${markdown}`;

  const response = await axios.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: 'application/json' },
    },
    { headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' } }
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

  return { systemPrompt, name, description, logoUrl };
}
