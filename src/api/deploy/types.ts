export interface WidgetStyles {
    appearance: 'light' | 'dark';  // renamed from 'theme'
    displayStyle: 'corner' | 'overlay';  // NEW: corner or overlay
    displayName: string;  // keeping camelCase in DB
    
    // Colors
    primaryColor: string;  // replaces headerColor, buttonColor
    widgetBubbleColour: string;  // for message bubbles
    
    // Icons & Assets
    PrimaryIcon: string;  // renamed from profilePictureFile : url
    widgeticon: string;  // renamed from chatIcon (for the widget button icon) : url
    
    // Button Configuration
    alignChatButton: 'left' | 'right';  // maps to buttonAlignment in frontend
    showButtonText: boolean;  // boolean : true/false to show text on widget button
    buttonText: string;  // text shown on widget button
    
    // Messages & Placeholders
    messagePlaceholder: string;
    footerText: string;  // HTML
    dismissableNoticeText: string;  // maps to dismissibleNoticeText. HTML
    
    // Dimensions
    chatWidth: string;
    chatHeight: string;  
    
    // Behavior Flags
    autoShowInitial: boolean;  // replaces autoOpenChatWindowAfter > 0 check
    autoShowDelaySec: number;  // renamed from autoOpenChatWindowAfter
    collectUserFeedback: boolean;  // maps to collectFeedback
    regenerateMessages: boolean;  // maps to allowRegenerate
    continueShowingSuggestedMessages: boolean;  // maps to keepShowingSuggested
}

export interface ChatbotCustomization {
    styles: WidgetStyles;
    onlyAllowOnAddedDomains: boolean;
    initialMessage: string;
    suggestedMessages: string[];
}

export interface ChatbotCustomizationExternal {
    styles: WidgetStyles;
    converslyWebId: string;   // chatbot api key
    uniqueClientId: string;   // unique identifier for this conversation instance
    initialMessage: string;
    suggestedMessages: string[];
} 


export interface ChatbotWidget {
    chatbotId: string;
    partial: ChatbotCustomization;
}

export interface chatbotWidgetExternal {
    chatbotId : string;
    partial : ChatbotCustomizationExternal;
}

// API Key Response Types
export interface ApiKeyResponse {
    apiKey: string;
}

export interface ApiKeyGetResponse {
    apiKey: string | null;
}

// Domain Response Types
export interface DomainInfo {
    id: string;
    domain: string;
    createdAt: Date | null;
}

export interface AllowedDomainsResponse {
    domains: DomainInfo[];
}

export interface AddDomainResponse {
    id: string;
    domain: string;
    createdAt: Date | null;
}



