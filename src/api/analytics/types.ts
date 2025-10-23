
export interface CitationItem {
  source: string;
  count: number;
}

export interface AnalyticsData {
  responses: number;
  likes: number;
  dislikes: number;
  citations: CitationItem[];
}

export interface GetAnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
}
