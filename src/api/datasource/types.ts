
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