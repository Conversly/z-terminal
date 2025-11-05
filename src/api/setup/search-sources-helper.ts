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

import { JSDOM } from "jsdom";


const DOC_MIME_PREFIXES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
  ];

const ASSET_EXTENSIONS = [
    '.js', '.css', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp',
    '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.wav', '.ogg', '.webm',
    '.woff', '.woff2', '.ttf', '.eot', '.otf'
  ];
  
const DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf', '.md'];
  


export const saveDatasources = async (
  userId: string,
  chatbotId: number,
  WebsiteURLs?: string[],
  Documents?: DocumentData[]
): Promise<DatasourceResponse> => {
  try {
    const datasourcesToInsert = [];
    
    if (WebsiteURLs && WebsiteURLs.length > 0) {
      for (const url of WebsiteURLs) {
        const urlName = url
          .replace(/^https?:\/\//, '') // remove protocol
          .replace(/^www\./, '') // remove www
          .replace(/\.(com|org|net|edu|gov|io|co|uk|ca|au|de|fr|jp|cn|in|br|ru|es|it|nl|se|no|dk|fi|pl|be|ch|at|cz|gr|pt|ie|nz|za|kr|mx|ar|cl|sg|my|th|id|ph|vn|tr|ua|ro|hu|bg|hr|sk|si|ee|lv|lt|lu|mt|cy|is).*$/, '') // remove common TLDs and everything after
          .replace(/\/$/, ''); // remove trailing slash
        
        datasourcesToInsert.push({
          chatbotId: chatbotId,
          type: 'URL' as const,
          sourceDetails: {},
          status: 'DRAFT' as const,
          name: urlName || url,
          citation: url,
        });
      }
    }

    if (Documents && Documents.length > 0) {
      for (const doc of Documents) {
        const filename = doc.pathname.split('/').pop() || doc.pathname;
        
        datasourcesToInsert.push({
          chatbotId: chatbotId,
          type: 'DOCUMENT' as const,
          sourceDetails: doc,
          status: 'DRAFT' as const,
          name: filename,
          citation: '', // no citation for document upload
        });
      }
    }

    await db
      .insert(dataSourcesTable)
      .values(datasourcesToInsert as any[])
      .onConflictDoNothing();
    if (datasourcesToInsert.length > 0) {
      return {
        success: true,
        message: 'Datasources saved successfully',
      };
    } else {
      return {
        success: false,
        message: 'No datasources to save',
      };
    }
  } catch (error) {
    logger.error('Error processing datasources:', error);
    throw new ApiError('Error processing datasources', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

function normalizeAbsoluteUrl(base: string, href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    const u = new URL(href, base);
    u.hash = '';
    u.search = '';
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal } as any);
    return res as any;
  } finally {
    clearTimeout(t);
  }
}

function getRootOrigin(websiteUrl: string): string {
  try {
    return new URL(websiteUrl).origin;
  } catch {
    return websiteUrl.replace(/\/$/, '');
  }
}

function getSitemapCandidates(websiteUrl: string): string[] {
  const origin = getRootOrigin(websiteUrl);
  const paths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap1.xml',
    '/sitemap-index.xml',
  ];
  return paths.map((p) => `${origin}${p}`);
}

async function collectSitemapUrlsBfs(startSitemapUrl: string, limit: number, timeoutMs = 5000): Promise<string[]> {
  const urls: string[] = [];
  const queue: string[] = [startSitemapUrl];
  const visited = new Set<string>();

  while (queue.length && urls.length < limit) {
    const current = queue.shift() as string;
    if (visited.has(current)) continue;
    visited.add(current);
    try {
      const res = await fetchWithTimeout(current, timeoutMs);
      if (!res.ok) continue;
      const xml = await res.text();
      const json: any = await parseStringPromise(xml);

      if (json?.urlset?.url) {
        for (const u of json.urlset.url) {
          const loc = u?.loc?.[0];
          if (typeof loc === 'string') {
            urls.push(loc);
            if (urls.length >= limit) break;
          }
        }
      } else if (json?.sitemapindex?.sitemap) {
        for (const s of json.sitemapindex.sitemap) {
          const loc = s?.loc?.[0];
          if (typeof loc === 'string') queue.push(loc);
        }
      }
    } catch {
      // ignore failures
    }
  }

  return Array.from(new Set(urls)).slice(0, limit);
}

export async function collectSitemapUrls(sitemapUrl: string, limit: number): Promise<string[]> {
  return collectSitemapUrlsBfs(sitemapUrl, limit, 5000);
}

async function tryCollectFromAnySitemap(websiteUrl: string, limit: number): Promise<string[]> {
  const candidates = getSitemapCandidates(websiteUrl);
  for (const candidate of candidates) {
    try {
      const res = await fetchWithTimeout(candidate, 4000);
      if (res.ok) {
        return await collectSitemapUrlsBfs(candidate, limit, 4000);
      }
    } catch {
      // try next
    }
  }
  return [];
}

function hasAnyExtension(url: string, exts: string[]): boolean {
  const lower = url.toLowerCase();
  return exts.some((ext) => lower.includes('?') ? lower.split('?')[0].endsWith(ext) : lower.endsWith(ext));
}

function isSameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function isDisallowedPath(pathname: string): boolean {
  const lowered = pathname.toLowerCase();
  return ['/login', '/signin', '/signup', '/register', '/cart', '/checkout', '/account', '/auth'].some((p) => lowered.includes(p));
}

async function crawlSite(websiteUrl: string, limit = 50, maxDepth = 2): Promise<{ pages: string[]; files: string[]; all: string[]; }> {
  const origin = getRootOrigin(websiteUrl);
  const start = normalizeAbsoluteUrl(origin, '/');
  const queue: Array<{ url: string; depth: number; }> = [];
  if (start) queue.push({ url: origin, depth: 0 });

  const visitedPages = new Set<string>();
  const pageSet = new Set<string>();
  const fileSet: Set<string> = new Set();

  while (queue.length && (pageSet.size + fileSet.size) < limit) {
    const { url, depth } = queue.shift() as { url: string; depth: number; };
    if (visitedPages.has(url)) continue;
    visitedPages.add(url);

    try {
      const res = await fetchWithTimeout(url, 6000);
      if (!res.ok) continue;
      const html = await res.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const anchors = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];

      const discovered: string[] = [];
      for (const a of anchors) {
        const href = a.getAttribute('href');
        const abs = normalizeAbsoluteUrl(url, href);
        if (!abs) continue;
        if (!isSameOrigin(abs, origin)) continue;

        // classify files immediately
        if (hasAnyExtension(abs, DOC_EXTENSIONS)) {
          fileSet.add(abs);
          continue;
        }

        if (hasAnyExtension(abs, ASSET_EXTENSIONS)) continue; // skip static assets
        const u = new URL(abs);
        if (isDisallowedPath(u.pathname)) continue;

        // drop query/fragment via normalizeAbsoluteUrl already
        discovered.push(u.toString());
      }

      // unique and cap fan-out per page
      const uniqueDiscovered = Array.from(new Set(discovered));
      for (const link of uniqueDiscovered.slice(0, 15)) { // limit breadth per page
        if ((pageSet.size + fileSet.size) >= limit) break;
        pageSet.add(link);
        if (depth + 1 <= maxDepth) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    } catch {
      // ignore
    }
  }

  const pages = Array.from(pageSet).slice(0, limit);
  const files = Array.from(fileSet).slice(0, Math.max(0, limit - pages.length));
  const all = Array.from(new Set([...pages, ...files]));
  return { pages, files, all };
}

export function classifyUrls(urls: string[]): { pages: string[]; files: string[] } {
  const pages: string[] = [];
  const files: string[] = [];
  for (const u of Array.from(new Set(urls))) {
    if (hasAnyExtension(u.toLowerCase(), DOC_EXTENSIONS)) files.push(u);
    else {
      // page if ends with / or .html or no extension
      try {
        const { pathname } = new URL(u);
        if (pathname.endsWith('/') || pathname.endsWith('.html') || !pathname.includes('.')) pages.push(u);
        else pages.push(u); // default to page
      } catch {
        pages.push(u);
      }
    }
  }
  return { pages, files };
}

export async function discoverWebsiteUrls(websiteUrl: string, sitemapLimit = 100, crawlLimit = 50): Promise<{ urls: string[]; pages: string[]; files: string[]; source: 'sitemap' | 'crawl'; }> {
  // 1) Try sitemap discovery from common candidates
  const sitemapUrls = await tryCollectFromAnySitemap(websiteUrl, sitemapLimit);
  if (sitemapUrls.length > 0) {
    const unique = Array.from(new Set(sitemapUrls)).slice(0, sitemapLimit);
    const { pages, files } = classifyUrls(unique);
    return { urls: unique, pages, files, source: 'sitemap' };
  }

  // 2) Fallback crawl (1-2 levels, same origin)
  const crawled = await crawlSite(websiteUrl, crawlLimit, 2);
  const { pages, files } = classifyUrls(crawled.all);
  return { urls: crawled.all, pages, files, source: 'crawl' };
}

async function headOnce(url: string, timeoutMs = 7000): Promise<any | null> {
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    return res as any;
  } catch {
    return null;
  }
}

async function headWithRedirectCapture(url: string, timeoutMs = 7000): Promise<{ finalUrl: string; res: any | null; redirectedFrom: string | null; }> {
  // Try manual redirect first to capture Location
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: controller.signal } as any);
    clearTimeout(t);
    const status = res.status;
    if (status >= 300 && status < 400) {
      const location = res.headers.get('location');
      if (location) {
        const nextUrl = normalizeAbsoluteUrl(url, location) || location;
        const res2 = await headOnce(nextUrl, timeoutMs);
        return { finalUrl: nextUrl, res: res2, redirectedFrom: url };
      }
    }
    return { finalUrl: url, res, redirectedFrom: null };
  } catch {
    // fallback simple head
    const res = await headOnce(url, timeoutMs);
    return { finalUrl: url, res, redirectedFrom: null };
  }
}

function isLikelyDownloadable(contentType: string | null, contentDisposition: string | null, url: string): boolean {
  const cd = (contentDisposition || '').toLowerCase();
  if (cd.includes('attachment')) return true;
  const ct = (contentType || '').toLowerCase();
  if (DOC_MIME_PREFIXES.some((p) => ct.startsWith(p))) return true;
  // fallback to extension check
  return hasAnyExtension(url, DOC_EXTENSIONS);
}

export async function buildPublicDocuments(fileUrls: string[], timeoutMs = 7000): Promise<import('./types').DocumentData[]> {
  const results: import('./types').DocumentData[] = [];
  const seen = new Set<string>();
  for (const fileUrl of fileUrls) {
    if (!fileUrl || seen.has(fileUrl)) continue;
    seen.add(fileUrl);
    try {
      const { finalUrl, res } = await headWithRedirectCapture(fileUrl, timeoutMs);
      if (!res) continue;
      // reject obvious unauthorized
      if (res.status === 401 || res.status === 403) continue;
      const contentType = res.headers.get('content-type') || 'unknown';
      const contentDisposition = res.headers.get('content-disposition');
      const location = res.headers.get('location');
      const downloadUrl = location ? (normalizeAbsoluteUrl(fileUrl, location) || location) : finalUrl;
      if (!isLikelyDownloadable(contentType, contentDisposition, fileUrl)) continue;
      const pathname = new URL(fileUrl).pathname;
      results.push({
        url: fileUrl,
        downloadUrl,
        pathname,
        contentType,
        contentDisposition: contentDisposition || null as any,
      } as any);
    } catch {
      // skip
    }
  }
  return results;
}