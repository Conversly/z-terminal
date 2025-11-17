export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  webhookSecret?: string; // Facebook App Secret for webhook verification
  businessAccountId?: string;
  webhookUrl?: string;
}

export interface CreateWhatsAppIntegrationInput {
  chatbotId: string; // UUID
  phoneNumberId: string;
  phoneNumber?: string; // Optional, defaults to phoneNumberId if not provided
  accessToken: string;
  verifyToken: string;
  webhookSecret?: string; // Facebook App Secret for webhook verification
  businessAccountId?: string;
  webhookUrl?: string;
}

export interface UpdateWhatsAppIntegrationInput {
  phoneNumberId?: string;
  accessToken?: string;
  verifyToken?: string;
  webhookSecret?: string; // Facebook App Secret for webhook verification
  businessAccountId?: string;
  webhookUrl?: string;
}

export interface WhatsAppIntegrationResponse {
  id: string;
  chatbotId: string; // UUID
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  webhookSecret?: string | null; // Facebook App Secret for webhook verification
  businessAccountId?: string | null;
  webhookUrl?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface WhatsAppWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts' | 'button' | 'interactive';
  text?: {
    body: string;
  };
  image?: {
    caption?: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
  video?: {
    caption?: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
  audio?: {
    mime_type: string;
    sha256: string;
    id: string;
    voice?: boolean;
  };
  document?: {
    caption?: string;
    filename: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  button?: {
    text: string;
    payload: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: WhatsAppWebhookMessage[];
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
        errors?: Array<{
          code: number;
          title: string;
          message?: string;
        }>;
      }>;
    };
    field: string;
  }>;
}

export interface WhatsAppTemplateStatusUpdate {
  event: string;
  message_template_id: string;
  message_template_name: string;
  message_template_language: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

export interface SendWhatsAppMessageInput {
  to: string;
  message: string;
}

export interface SendWhatsAppMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface CreateWhatsAppContactInput {
  phoneNumber: string; // E.164 format (e.g., +1234567890)
  displayName?: string;
}

export interface WhatsAppContactResponse {
  id: string;
  chatbotId: string;
  phoneNumber: string;
  displayName?: string | null;
  userMetadata: any;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface WhatsAppAnalyticsResponse {
  totalMessages: number;
  totalContacts: number;
  activeConversations: number;
  userMessages: number;
  aiResponses: number;
  agentResponses: number;
  uniqueWhatsappConversations: number;
  uniqueContacts: number;
}

export interface WhatsAppAnalyticsPerDayItem {
  date: string;
  userMessages: number;
  aiResponses: number;
  agentResponses: number;
  uniqueWhatsappConversations: number;
  uniqueContacts: number;
}

export interface WhatsAppAnalyticsPerDayResponse {
  success: boolean;
  data: WhatsAppAnalyticsPerDayItem[];
}

