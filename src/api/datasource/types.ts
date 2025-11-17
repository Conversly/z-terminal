
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
  datasourceIds: string[];
}

export interface DeleteKnowledgeResponse {
  success: boolean;
  message: string;
}

export interface DataSourceItem {
  id: string;
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

export interface AddCitationRequest {
  chatbotId: string;
  dataSourceId: string;
  citation: string;
}

export interface AddCitationResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    citation: string;
    updatedEmbeddingsCount: number;
  };
}

export interface EmbeddingItem {
  id: string;
  text: string;
}

export interface FetchEmbeddingsResponse {
  success: boolean;
  data: EmbeddingItem[];
}