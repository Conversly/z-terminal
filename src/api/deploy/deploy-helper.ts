import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import { db } from '../../loaders/postgres';
import { and, eq } from 'drizzle-orm';
import { WidgetStyles, ChatbotCustomization } from './types';
import {
	chatBots as chatBotsTable,
    widgetConfig as widgetConfigTable,
	originDomains as originDomainsTable,
	WidgetStyles as DbWidgetStyles,
} from '../../drizzle/schema';
import { randomBytes } from 'crypto';


// Helper function to verify chatbot ownership
export const verifyChatbotOwnership = async (
	chatbotId: number,
	userId: string
): Promise<typeof chatBotsTable.$inferSelect> => {
	const chatbot = await db
		.select()
		.from(chatBotsTable)
		.where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
		.limit(1)
		.then((r) => r[0]);

	if (!chatbot) {
		throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
	}

	return chatbot;
};

// Generate a random API key
export const generateApiKey = (): string => {
	return `wt_${randomBytes(32).toString('hex')}`;
};

export const defaultDbStyles: DbWidgetStyles = {
    appearance: 'light',  // renamed from 'theme'
    displayStyle: 'corner',  // NEW: default to corner
    displayName: 'Support Bot',
    
    // Colors
    primaryColor: '#0e4b75',  // replaces headerColor, buttonColor
    widgetBubbleColour: '#0e4b75',  // NEW: for message bubbles
    
    // Icons & Assets
    PrimaryIcon: '',  // renamed from profilePictureFile
    widgeticon: 'chat',  // renamed from chatIcon
    
    // Button Configuration
    alignChatButton: 'right',
    showButtonText: false,  // NEW
    buttonText: 'Chat',  // NEW
    
    // Messages & Placeholders
    messagePlaceholder: 'Message...',
    footerText: 'Powered by Conversly',  // HTML
    dismissableNoticeText: '',  // HTML
    
    // Dimensions
    chatWidth: '400px',  // NEW
    chatHeight: '600px',  // NEW
    
    // Behavior Flags
    autoShowInitial: false,  // NEW
    autoShowDelaySec: 0,  // renamed from autoOpenChatWindowAfter
    collectUserFeedback: true,
    regenerateMessages: true,
    continueShowingSuggestedMessages: false,
    
    // REMOVED: hiddenPaths
    // REMOVED: userMessageColor (now using primaryColor)
};

// please do not remove comments from widget config. mai confuse ho jata hun
export function toDbStyles(incoming?: Partial<WidgetStyles>): DbWidgetStyles {
    const styles = incoming || {};
    return {
        ...defaultDbStyles,
        // Appearance & Display
        ...(styles.appearance !== undefined ? { appearance: styles.appearance } : {}),
        ...(styles.displayStyle !== undefined ? { displayStyle: styles.displayStyle } : {}),
        ...(styles.displayName !== undefined ? { displayName: styles.displayName } : {}),
        
        // Colors
        ...(styles.primaryColor !== undefined ? { primaryColor: styles.primaryColor } : {}),
        ...(styles.widgetBubbleColour !== undefined ? { widgetBubbleColour: styles.widgetBubbleColour } : {}),
        
        // Icons & Assets
        ...(styles.PrimaryIcon !== undefined ? { PrimaryIcon: styles.PrimaryIcon } : {}),
        ...(styles.widgeticon !== undefined ? { widgeticon: styles.widgeticon } : {}),
        
        // Button Configuration
        ...(styles.alignChatButton !== undefined ? { alignChatButton: styles.alignChatButton } : {}),
        ...(styles.showButtonText !== undefined ? { showButtonText: styles.showButtonText } : {}),
        ...(styles.buttonText !== undefined ? { buttonText: styles.buttonText } : {}),
        
        // Messages & Placeholders
        ...(styles.messagePlaceholder !== undefined ? { messagePlaceholder: styles.messagePlaceholder } : {}),
        ...(styles.footerText !== undefined ? { footerText: styles.footerText } : {}),
        ...(styles.dismissableNoticeText !== undefined ? { dismissableNoticeText: styles.dismissableNoticeText } : {}),
        
        // Dimensions
        ...(styles.chatWidth !== undefined ? { chatWidth: styles.chatWidth } : {}),
        ...(styles.chatHeight !== undefined ? { chatHeight: styles.chatHeight } : {}),
        
        // Behavior Flags
        ...(styles.autoShowInitial !== undefined ? { autoShowInitial: styles.autoShowInitial } : {}),
        ...(styles.autoShowDelaySec !== undefined ? { autoShowDelaySec: styles.autoShowDelaySec } : {}),
        ...(styles.collectUserFeedback !== undefined ? { collectUserFeedback: styles.collectUserFeedback } : {}),
        ...(styles.regenerateMessages !== undefined ? { regenerateMessages: styles.regenerateMessages } : {}),
        ...(styles.continueShowingSuggestedMessages !== undefined ? { continueShowingSuggestedMessages: styles.continueShowingSuggestedMessages } : {}),
    } as DbWidgetStyles;
}

// please do not remove comments from widget config. mai confuse ho jata hun
export function fromDbToCustomization(row: {
    styles: DbWidgetStyles;
    onlyAllowOnAddedDomains: boolean;
    initialMessage: string;
    suggestedMessages: string[];
}): ChatbotCustomization {
    return {
        styles: {
            appearance: row.styles.appearance,  // renamed from 'theme'
            displayStyle: row.styles.displayStyle,  // NEW
            displayName: row.styles.displayName,
            
            // Colors
            primaryColor: row.styles.primaryColor,  // replaces headerColor, buttonColor
            widgetBubbleColour: row.styles.widgetBubbleColour,  // NEW
            
            // Icons & Assets
            PrimaryIcon: row.styles.PrimaryIcon,  // renamed from profilePictureFile
            widgeticon: row.styles.widgeticon,  // renamed from chatIcon
            
            // Button Configuration
            alignChatButton: row.styles.alignChatButton,
            showButtonText: row.styles.showButtonText,  // NEW
            buttonText: row.styles.buttonText,  // NEW
            
            // Messages & Placeholders
            messagePlaceholder: row.styles.messagePlaceholder,
            footerText: row.styles.footerText,  // HTML
            dismissableNoticeText: row.styles.dismissableNoticeText,  // HTML
            
            // Dimensions
            chatWidth: row.styles.chatWidth,  // NEW
            chatHeight: row.styles.chatHeight,  // NEW
            
            // Behavior Flags
            autoShowInitial: row.styles.autoShowInitial,  // NEW
            autoShowDelaySec: row.styles.autoShowDelaySec,  // renamed from autoOpenChatWindowAfter
            collectUserFeedback: row.styles.collectUserFeedback,
            regenerateMessages: row.styles.regenerateMessages,
            continueShowingSuggestedMessages: row.styles.continueShowingSuggestedMessages,
        },
        onlyAllowOnAddedDomains: row.onlyAllowOnAddedDomains,
        initialMessage: row.initialMessage || '',
        suggestedMessages: row.suggestedMessages || [],
    };
}
