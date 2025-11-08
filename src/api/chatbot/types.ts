export interface CreateChatbotInput {
  name: string;
  description: string;
  systemPrompt: string;
  status: string;
}

export interface ChatbotResponse {
  id: number;
  userId: string;
  name: string;
  description: string;
  systemPrompt: string;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  apiKey?: string | null;
}

export interface GenerateInstructionsInput {
  topic: string;
}

export interface InstructionResponse {
  chatbotId: string;
  systemPrompt: string;
}

export interface GetChatbotsResponse {
  id: number;
  name: string;
  description: string;
  createdAt: Date | null;
  status: string;
  userId: string;
}

export interface DeleteChatbotInput {
  id: number;
}

export interface DeleteChatbotResponse {
  success: boolean;
  message?: string;
}

// Topic types
export interface CreateTopicInput {
  chatbotId: number;
  name: string;
}

export interface TopicResponse {
  id: number;
  chatbotId: number;
  name: string;
  color: string | null;
  createdAt: Date | null;
}

export interface UpdateTopicInput {
  id: number;
  name?: string;
}

export interface DeleteTopicInput {
  id: number;
}

export interface DeleteTopicResponse {
  success: boolean;
  message?: string;
}