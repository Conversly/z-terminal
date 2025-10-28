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

// Defaults for DB styles structure
const defaultDbStyles: DbWidgetStyles = {
	theme: 'light',
	headerColor: '#0e4b75',
	userMessageColor: '#0e4b75',
	buttonColor: '#0e4b75',
	displayName: 'Support Bot',
	profilePictureFile: null,
	chatIcon: 'chat',
	autoOpenChatWindowAfter: 0,
	alignChatButton: 'right',
	messagePlaceholder: 'Message...',
		footerText: 'Powered by Conversly',
	collectUserFeedback: true,
	regenerateMessages: true,
	continueShowingSuggestedMessages: false,
		dismissableNoticeText: '',
	hiddenPaths: [],
};

function toDbStyles(incoming?: Partial<WidgetStyles>): DbWidgetStyles {
	const styles = incoming || {};
	return {
		...defaultDbStyles,
		...(styles.theme !== undefined ? { theme: styles.theme } : {}),
		...(styles.headerColor !== undefined ? { headerColor: styles.headerColor } : {}),
		...(styles.userMessageColor !== undefined ? { userMessageColor: styles.userMessageColor } : {}),
		...(styles.buttonColor !== undefined ? { buttonColor: styles.buttonColor } : {}),
		...(styles.displayName !== undefined ? { displayName: styles.displayName } : {}),
		...(styles.profilePictureFile !== undefined ? { profilePictureFile: styles.profilePictureFile } : {}),
		...(styles.chatIcon !== undefined ? { chatIcon: styles.chatIcon } : {}),
		...(styles.autoOpenChatWindowAfter !== undefined ? { autoOpenChatWindowAfter: styles.autoOpenChatWindowAfter } : {}),
		...(styles.alignChatButton !== undefined ? { alignChatButton: styles.alignChatButton } : {}),
		...(styles.messagePlaceholder !== undefined ? { messagePlaceholder: styles.messagePlaceholder } : {}),
		...(styles.footerText !== undefined ? { footerText: styles.footerText } : {}),
		...(styles.collectUserFeedback !== undefined ? { collectUserFeedback: styles.collectUserFeedback } : {}),
		...(styles.regenerateMessages !== undefined ? { regenerateMessages: styles.regenerateMessages } : {}),
		...(styles.continueShowingSuggestedMessages !== undefined ? { continueShowingSuggestedMessages: styles.continueShowingSuggestedMessages } : {}),
		...(styles.dismissableNoticeText !== undefined ? { dismissableNoticeText: styles.dismissableNoticeText } : {}),
		...(styles.hiddenPaths !== undefined ? { hiddenPaths: styles.hiddenPaths } : {}),
	} as DbWidgetStyles;
}

function fromDbToCustomization(row: {
	styles: DbWidgetStyles;
	onlyAllowOnAddedDomains: boolean;
	initialMessage: string;
	suggestedMessages: string[];
	allowedDomains: string[];
}): ChatbotCustomization {
	return {
		styles: {
			theme: row.styles.theme,
			headerColor: row.styles.headerColor,
			userMessageColor: row.styles.userMessageColor,
			buttonColor: row.styles.buttonColor,
			displayName: row.styles.displayName,
			profilePictureFile: row.styles.profilePictureFile ?? null,
			chatIcon: row.styles.chatIcon ?? null,
			autoOpenChatWindowAfter: row.styles.autoOpenChatWindowAfter,
			alignChatButton: row.styles.alignChatButton,
			messagePlaceholder: row.styles.messagePlaceholder,
			footerText: row.styles.footerText,
			collectUserFeedback: row.styles.collectUserFeedback,
			regenerateMessages: row.styles.regenerateMessages,
			continueShowingSuggestedMessages: row.styles.continueShowingSuggestedMessages,
			dismissableNoticeText: row.styles.dismissableNoticeText,
			hiddenPaths: row.styles.hiddenPaths || [],
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

	const row = await db
		.select()
		.from(widgetConfigTable)
		.where(eq(widgetConfigTable.chatbotId, chatbotId))
		.limit(1)
		.then((r) => r[0]);

	if (!row) {
		// If no config exists, return defaults as partial
		const defaults: ChatbotCustomization = {
			styles: {
				theme: defaultDbStyles.theme,
				headerColor: defaultDbStyles.headerColor,
				userMessageColor: defaultDbStyles.userMessageColor,
				buttonColor: defaultDbStyles.buttonColor,
				displayName: defaultDbStyles.displayName,
				profilePictureFile: defaultDbStyles.profilePictureFile,
				chatIcon: defaultDbStyles.chatIcon,
				autoOpenChatWindowAfter: defaultDbStyles.autoOpenChatWindowAfter,
				alignChatButton: defaultDbStyles.alignChatButton,
				messagePlaceholder: defaultDbStyles.messagePlaceholder,
				footerText: defaultDbStyles.footerText,
				collectUserFeedback: defaultDbStyles.collectUserFeedback,
				regenerateMessages: defaultDbStyles.regenerateMessages,
				continueShowingSuggestedMessages: defaultDbStyles.continueShowingSuggestedMessages,
				dismissableNoticeText: defaultDbStyles.dismissableNoticeText,
				hiddenPaths: defaultDbStyles.hiddenPaths,
			},
			onlyAllowOnAddedDomains: false,
			initialMessage: 'Hi! How can I help you today? 👋',
			suggestedMessages: [],
			allowedDomains: [],
		};

		return { chatbotId: String(chatbotId), partial: defaults };
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

