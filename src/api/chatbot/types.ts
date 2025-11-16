export interface CreateChatbotInput {
  name: string;
  description: string;
  systemPrompt: string;
  status: string;
}

export interface ChatbotResponse {
  id: string;
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
  id: string;
  name: string;
  description: string;
  createdAt: Date | null;
  status: string;
  userId: string;
}

export interface DeleteChatbotInput {
  id: string;
}

export interface DeleteChatbotResponse {
  success: boolean;
  message?: string;
}

// Topic types
export interface CreateTopicInput {
  chatbotId: string;
  name: string;
}

export interface TopicResponse {
  id: string;
  chatbotId: string;
  name: string;
  color: string | null;
  createdAt: Date | null;
}

export interface UpdateTopicInput {
  id: string;
  name?: string;
}

export interface DeleteTopicInput {
  id: string;
}

export interface DeleteTopicResponse {
  success: boolean;
  message?: string;
}