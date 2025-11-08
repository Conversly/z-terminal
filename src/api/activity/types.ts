
export interface ChatlogItem {
  uniqueConvId: string;
  firstUserMessage: string | null;
  lastActivity: Date;
}

export interface GetChatlogsResponse {
  success: boolean;
  data: ChatlogItem[];
}

export type MessageType = 'user' | 'assistant';

export interface MessageItem {
  id: string;
  type: MessageType;
  content: string;
  createdAt: Date;
  citations: string[];
}

export interface GetMessagesResponse {
  success: boolean;
  data: MessageItem[];
}



export const Feedback = {
  None: 0,
  Like: 1,
  Dislike: 2,
  Neutral: 3,
} as const;

export type FeedbackType = (typeof Feedback)[keyof typeof Feedback];
