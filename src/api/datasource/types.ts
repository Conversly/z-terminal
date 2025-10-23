
export interface QAPair {
  question: string;
  answer: string;
  citations?: string;
}

export interface DocumentData {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export interface ProcessRequest {
  chatbotId: string;
  websiteUrls?: string[];
  qandaData?: QAPair[];
  documents?: DocumentData[];
  textContent?: string[];
}


export interface DatasourceResponse {
  success: boolean;
  insertedCount: number;
  datasourceIds: number[];
}

export interface DeleteKnowledgeResponse {
  success: boolean;
  message: string;
}

export interface DataSourceItem {
  id: number;
  type: string;
  name: string;
  sourceDetails: any;
  createdAt: Date | null;
  citation: string | null;
}

export interface FetchDataSourcesResponse {
  success: boolean;
  data: DataSourceItem[];
}