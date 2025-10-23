export interface CreateChatbotInput {
  name: string;
  description: string;
  systemPrompt: string;
}

export interface ChatbotResponse {
  id: number;
  userId: string;
  name: string;
  description: string;
  systemPrompt: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  apiKey: string | null;
}

export interface GetInstructionsInput {
  topic: string;
}

export interface GetInstructionsResponse {
  prompt: string;
}
