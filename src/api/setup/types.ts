import { DataSourceItem } from "../datasource/types";

export interface AnalyzeImageInput {
  chatbotId: string;
  imageUrl: string;
}

export interface InferPromptInput {
  chatbotId: string;
  websiteUrl: string;
  useCase: string;
}

export interface AnalyzeImageResponse {
    primaryColor: string;   
}

export interface InferPromptResponse {
  systemPrompt: string;
  name : string;
  description: string;
  logoUrl: string;
}


export interface DatasourceResponse {
    success: boolean;
    message : string;   // request received or error message
  }

export interface DocumentData {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}


export interface SearchSourcesResponse {
  success: boolean;
  data: DataSourceItem[];
  totalUrls: number;
  totalPages: number;
  totalFiles: number;
  insertedCount: number;
  source: 'sitemap' | 'crawl';
}

export interface FetchSitemapResponse {
  urls: string[];
  pages: string[];
  files: string[];
  source: 'sitemap' | 'crawl';
  totalCount: number;
}






// zustand + tanstack query = god setup for react