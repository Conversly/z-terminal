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
    allowedDomains: string[];
}

export interface ChatbotWidget {
    chatbotId: string;
    partial: ChatbotCustomization;
}