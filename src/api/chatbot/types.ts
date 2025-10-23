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

export interface GenerateInstructionsInput {
  topic: string;
}

export interface InstructionResponse {
  chatbotId: string;
  systemPrompt: string;
}
