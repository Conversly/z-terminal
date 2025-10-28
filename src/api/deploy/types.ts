export interface WidgetStyles {
    theme: 'light' | 'dark';

    headerColor: string;

    userMessageColor: string;

    buttonColor: string;

    displayName: string;

    profilePictureFile?: string | null;

    chatIcon?: string | null;

    autoOpenChatWindowAfter: number;

    alignChatButton: 'left' | 'right';

    messagePlaceholder: string;

    footerText: string;

    collectUserFeedback: boolean;

    regenerateMessages: boolean;

    continueShowingSuggestedMessages: boolean;

    dismissableNoticeText: string;

    hiddenPaths: string[];
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