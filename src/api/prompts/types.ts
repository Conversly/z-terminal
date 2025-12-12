export type ChannelType = 'WIDGET' | 'WHATSAPP' | 'VOICE';

// Base prompt types
export interface UpdateBasePromptInput {
  chatbotId: string;
  systemPrompt: string;
}

export interface GenerateBasePromptInput {
  businessDescription: string;
  tone?: string; // e.g., 'professional', 'friendly', 'casual'
  targetAudience?: string;
}

// Channel prompt types
export interface UpsertChannelPromptInput {
  chatbotId: string;
  channel: ChannelType;
  systemPrompt: string;
}

export interface GenerateChannelPromptInput {
  chatbotId: string;
  channel: ChannelType;
  baseContext?: string; // Optional: pass existing base prompt for context
}

export interface DeleteChannelPromptInput {
  id: string;
}

// Response types
export interface BasePromptResponse {
  chatbotId: string;
  systemPrompt: string;
  updatedAt: Date | null;
}

export interface ChannelPromptResponse {
  id: string;
  chatbotId: string;
  channel: ChannelType;
  systemPrompt: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface AllPromptsResponse {
  basePrompt: {
    systemPrompt: string;
    updatedAt: Date | null;
  };
  channelPrompts: ChannelPromptResponse[];
}

export interface GeneratedPromptResponse {
  systemPrompt: string;
  channel?: ChannelType;
}

export interface DeletePromptResponse {
  success: boolean;
  message?: string;
}

