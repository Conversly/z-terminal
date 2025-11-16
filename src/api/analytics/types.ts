
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

export interface SummaryMetricsData {
  totalMessagesThisMonth: number;
  avgMessagesPerConversation: number;
  likeRatePercent: number;
  activeConversationsToday: number;
}

export interface GetSummaryResponse {
  success: boolean;
  data: SummaryMetricsData;
}

export interface ChartsDataPoint {
  date: string; // ISO date (YYYY-MM-DD)
  count: number;
}

export interface FeedbackDistributionData {
  likes: number;
  dislikes: number;
  none: number;
}

export interface ChartsData {
  messagesPerDay: ChartsDataPoint[];
  conversationsPerDay: ChartsDataPoint[];
  feedbackDistribution: FeedbackDistributionData;
}

export interface GetChartsResponse {
  success: boolean;
  data: ChartsData;
}

export interface FeedbackItem {
  convId: string | null;
  content: string;
  feedback: 'like' | 'dislike';
  feedbackComment: string | null;
  createdAt: Date;
}

export interface GetFeedbacksResponse {
  success: boolean;
  data: FeedbackItem[];
}

export interface TopicSeriesPoint {
  date: string; // ISO date (YYYY-MM-DD)
  messages: number;
  likes: number;
  dislikes: number;
}

export interface TopicSeries {
  topicId: string;
  topicName: string;
  color: string | null;
  series: TopicSeriesPoint[];
}

export interface TopicBarChartData {
  topics: TopicSeries[];
  dateRange: { startDate: string; endDate: string }; // ISO dates
}

export interface GetTopicBarChartResponse {
  success: boolean;
  data: TopicBarChartData;
}

export interface TopicAggregate {
  topicId: string;
  topicName: string;
  color: string | null;
  messages: number;
  likes: number;
  dislikes: number;
}

export interface TopicPieChartData {
  topics: TopicAggregate[];
  dateRange: { startDate: string; endDate: string };
}

export interface GetTopicPieChartResponse {
  success: boolean;
  data: TopicPieChartData;
}
