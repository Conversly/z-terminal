import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import { and, eq } from 'drizzle-orm';
import {
	chatBots as chatBotsTable,
	widgetConfig as widgetConfigTable,
	WidgetStyles as DbWidgetStyles,
} from '../../drizzle/schema';
import { ChatbotWidget, ChatbotCustomization, WidgetStyles } from './types';


const defaultDbStyles: DbWidgetStyles = {
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
function toDbStyles(incoming?: Partial<WidgetStyles>): DbWidgetStyles {
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
function fromDbToCustomization(row: {
	styles: DbWidgetStyles;
	onlyAllowOnAddedDomains: boolean;
	initialMessage: string;
	suggestedMessages: string[];
	allowedDomains: string[];
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
		allowedDomains: row.allowedDomains || [],
	};
}

export const handleGetWidget = async (
	userId: string,
	chatbotId: number
): Promise<ChatbotWidget> => {
	// Verify chatbot ownership
	const chatbot = await db
		.select()
		.from(chatBotsTable)
		.where(and(eq(chatBotsTable.id, chatbotId), eq(chatBotsTable.userId, userId)))
		.limit(1)
		.then((r) => r[0]);

	if (!chatbot) {
		throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
	}

	let row = await db
		.select()
		.from(widgetConfigTable)
		.where(eq(widgetConfigTable.chatbotId, chatbotId))
		.limit(1)
		.then((r) => r[0]);

	if (!row) {
		// If no config exists, create it with defaults
		const defaultValues = {
			chatbotId: chatbotId,
			styles: defaultDbStyles,
			onlyAllowOnAddedDomains: false,
			initialMessage: 'Hi! How can I help you today? 👋',
			suggestedMessages: [],
			allowedDomains: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		[row] = await db
			.insert(widgetConfigTable)
			.values(defaultValues)
			.returning();
	}

	return {
		chatbotId: String(chatbotId),
		partial: fromDbToCustomization(row),
	};
};

export const handleUpsertWidget = async (
	userId: string,
	input: ChatbotWidget
): Promise<ChatbotWidget> => {
	try {
		const chatbotIdNum = parseInt(input.chatbotId);
		if (isNaN(chatbotIdNum)) {
			throw new ApiError('Invalid chatbot ID', httpStatus.BAD_REQUEST);
		}

		// Verify chatbot ownership
		const chatbot = await db
			.select()
			.from(chatBotsTable)
			.where(and(eq(chatBotsTable.id, chatbotIdNum), eq(chatBotsTable.userId, userId)))
			.limit(1)
			.then((r) => r[0]);

		if (!chatbot) {
			throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
		}

		const existing = await db
			.select()
			.from(widgetConfigTable)
			.where(eq(widgetConfigTable.chatbotId, chatbotIdNum))
			.limit(1)
			.then((r) => r[0]);

		const incoming = input.partial || ({} as ChatbotCustomization);

		const nextDbValues = {
			chatbotId: chatbotIdNum,
			styles: existing
				? { ...(existing.styles as DbWidgetStyles), ...toDbStyles(incoming.styles) }
				: toDbStyles(incoming.styles),
			onlyAllowOnAddedDomains:
				incoming.onlyAllowOnAddedDomains ?? existing?.onlyAllowOnAddedDomains ?? false,
					initialMessage:
						typeof incoming.initialMessage === 'string'
							? incoming.initialMessage
							: existing?.initialMessage ?? 'Hi! How can I help you today? 👋',
			suggestedMessages:
				Array.isArray(incoming.suggestedMessages)
					? incoming.suggestedMessages
					: existing?.suggestedMessages ?? [],
			allowedDomains:
				Array.isArray(incoming.allowedDomains)
					? incoming.allowedDomains
					: existing?.allowedDomains ?? [],
			updatedAt: new Date(),
		} as any;

		if (!existing) {
			const [created] = await db
				.insert(widgetConfigTable)
				.values({
					...nextDbValues,
					createdAt: new Date(),
				})
				.returning();

			return {
				chatbotId: String(chatbotIdNum),
				partial: fromDbToCustomization(created),
			};
		}

		const [updated] = await db
			.update(widgetConfigTable)
			.set(nextDbValues)
			.where(eq(widgetConfigTable.chatbotId, chatbotIdNum))
			.returning();

		return {
			chatbotId: String(chatbotIdNum),
			partial: fromDbToCustomization(updated),
		};
	} catch (error) {
		logger.error('Error upserting widget config:', error);
		if (error instanceof ApiError) throw error;
		throw new ApiError('Error saving widget config', httpStatus.INTERNAL_SERVER_ERROR);
	}
};

