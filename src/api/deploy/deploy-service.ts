import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import { and, eq } from 'drizzle-orm';
import {
	chatBots as chatBotsTable,
	widgetConfig as widgetConfigTable,
	originDomains as originDomainsTable,
	WidgetStyles as DbWidgetStyles,
} from '../../drizzle/schema';
import { 
	ChatbotWidget, 
	ChatbotCustomization,
	ApiKeyResponse,
	ApiKeyGetResponse,
	AllowedDomainsResponse,
	AddDomainResponse
} from './types';
import {
	fromDbToCustomization,
	toDbStyles,
	defaultDbStyles,
	verifyChatbotOwnership,
	generateApiKey,
	generateUniqueClientId,
} from './deploy-helper'

export const handleGetWidget = async (
	userId: string,
	chatbotId: string
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
		const defaultStyles = {
			...defaultDbStyles,
			...(typeof chatbot.name === 'string' && chatbot.name.trim() !== ''
				? { displayName: chatbot.name }
				: {}),
			...(typeof chatbot.primaryColor === 'string' && chatbot.primaryColor.trim() !== ''
				? { primaryColor: chatbot.primaryColor, widgetBubbleColour: chatbot.primaryColor }
				: {}),
			...(typeof chatbot.logoUrl === 'string' && chatbot.logoUrl.trim() !== ''
				? { PrimaryIcon: chatbot.logoUrl, widgeticon: chatbot.logoUrl }
				: {}),
		};
		const defaultValues = {
			chatbotId: chatbotId,
			styles: defaultStyles, 
			onlyAllowOnAddedDomains: false,
			initialMessage: 'Hi there! 👋 How can I help you today?',
			suggestedMessages: [
				'What can you help me with?',
				'Tell me about your features',
				'How do I get started?',
				'Show me some examples',
			],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		[row] = await db
			.insert(widgetConfigTable)
			.values(defaultValues)
			.returning();
	}

	const customization = fromDbToCustomization(row);

	if (typeof chatbot.name === 'string' && chatbot.name.trim() !== '') {
		customization.styles.displayName = chatbot.name;
	}
	if (typeof chatbot.primaryColor === 'string' && chatbot.primaryColor.trim() !== '') {
		customization.styles.primaryColor = chatbot.primaryColor;
		customization.styles.widgetBubbleColour = chatbot.primaryColor;
	}
	if (typeof chatbot.logoUrl === 'string' && chatbot.logoUrl.trim() !== '') {
		customization.styles.PrimaryIcon = chatbot.logoUrl;
		customization.styles.widgeticon = chatbot.logoUrl;
	}

	return {
		chatbotId: String(chatbotId),
		partial: customization,
	};
};

// External version does not verify ownership
// Returns widget config with API key and unique client ID
export const handleGetWidgetExternal = async (
	chatbotId: string
): Promise<any> => {
	// Get chatbot without ownership check
	const chatbot = await db
		.select()
		.from(chatBotsTable)
		.where(eq(chatBotsTable.id, chatbotId))
		.limit(1)
		.then((r) => r[0]);

	if (!chatbot) {
		throw new ApiError('Chatbot not found', httpStatus.NOT_FOUND);
	}

	// Check if API key exists
	if (!chatbot.apiKey) {
		throw new ApiError('Chatbot API key not configured', httpStatus.BAD_REQUEST);
	}

	let row = await db
		.select()
		.from(widgetConfigTable)
		.where(eq(widgetConfigTable.chatbotId, chatbotId))
		.limit(1)
		.then((r) => r[0]);

	if (!row) {
		const defaultValues = {
			chatbotId: chatbotId,
			styles: defaultDbStyles,
			onlyAllowOnAddedDomains: false,
			initialMessage: 'Hi there! 👋 How can I help you today?',
			suggestedMessages: [
				'What can you help me with?',
				'Tell me about your features',
				'How do I get started?',
				'Show me some examples',
			],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		[row] = await db
			.insert(widgetConfigTable)
			.values(defaultValues)
			.returning();
	}

	const customization = fromDbToCustomization(row);
	const uniqueClientId = generateUniqueClientId();

	return {
		chatbotId: String(chatbotId),
		partial: {
			...customization,
			converslyWebId: chatbot.apiKey,
			uniqueClientId: uniqueClientId,
		},
	};
};


export const handleUpsertWidget = async (
	userId: string,
	input: ChatbotWidget
): Promise<ChatbotWidget> => {
	try {
		if (!input.chatbotId) {
			throw new ApiError('Invalid chatbot ID', httpStatus.BAD_REQUEST);
		}

		// Verify chatbot ownership
		const chatbot = await db
			.select()
			.from(chatBotsTable)
			.where(and(eq(chatBotsTable.id, input.chatbotId), eq(chatBotsTable.userId, userId)))
			.limit(1)
			.then((r) => r[0]);

		if (!chatbot) {
			throw new ApiError('Chatbot not found or does not belong to user', httpStatus.NOT_FOUND);
		}

		const existing = await db
			.select()
			.from(widgetConfigTable)
			.where(eq(widgetConfigTable.chatbotId, input.chatbotId))
			.limit(1)
			.then((r) => r[0]);

		const incoming = input.partial || ({} as ChatbotCustomization);

		const nextDbValues = {
			chatbotId: input.chatbotId,
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
				chatbotId: input.chatbotId,
				partial: fromDbToCustomization(created),
			};
		}

		const [updated] = await db
			.update(widgetConfigTable)
			.set(nextDbValues)
			.where(eq(widgetConfigTable.chatbotId, input.chatbotId))
			.returning();

		return {
			chatbotId: input.chatbotId,
			partial: fromDbToCustomization(updated),
		};
	} catch (error) {
		logger.error('Error upserting widget config:', error);
		if (error instanceof ApiError) throw error;
		throw new ApiError('Error saving widget config', httpStatus.INTERNAL_SERVER_ERROR);
	}
};

// Handle generating/regenerating API key
export const handleGenerateApiKey = async (
	userId: string,
	chatbotId: string
): Promise<ApiKeyResponse> => {
	await verifyChatbotOwnership(chatbotId, userId);

	const apiKey = generateApiKey();

	// Update chatbot with new API key
	const [updated] = await db
		.update(chatBotsTable)
		.set({ apiKey, updatedAt: new Date() })
		.where(eq(chatBotsTable.id, chatbotId))
		.returning();

	if (!updated) {
		throw new ApiError('Failed to generate API key', httpStatus.INTERNAL_SERVER_ERROR);
	}

	return { apiKey: updated.apiKey! };
};

// Handle getting API key
export const handleGetApiKey = async (
	userId: string,
	chatbotId: string
): Promise<ApiKeyGetResponse> => {
	// Verify ownership
	const chatbot = await verifyChatbotOwnership(chatbotId, userId);

	return { apiKey: chatbot.apiKey || null };
};

// Handle getting all allowed domains
export const handleGetAllowedDomains = async (
	userId: string,
	chatbotId: string
): Promise<AllowedDomainsResponse> => {
	await verifyChatbotOwnership(chatbotId, userId);

	const domains = await db
		.select({
			id: originDomainsTable.id,
			domain: originDomainsTable.domain,
			createdAt: originDomainsTable.createdAt,
		})
		.from(originDomainsTable)
		.where(eq(originDomainsTable.chatbotId, chatbotId));

	return { domains };
};

// Handle adding a new allowed domain
export const handleAddAllowedDomain = async (
	userId: string,
	chatbotId: string,
	domain: string
): Promise<AddDomainResponse> => {
	// Verify ownership
	const chatbot = await verifyChatbotOwnership(chatbotId, userId);

	// Check if API key exists
	if (!chatbot.apiKey || chatbot.apiKey.trim() === '') {
		throw new ApiError('Create API key first', httpStatus.BAD_REQUEST);
	}

	// Check if domain already exists for this chatbot
	const existingDomain = await db
		.select()
		.from(originDomainsTable)
		.where(
			and(
				eq(originDomainsTable.chatbotId, chatbotId),
				eq(originDomainsTable.domain, domain)
			)
		)
		.limit(1)
		.then((r) => r[0]);

	if (existingDomain) {
		throw new ApiError('Domain already exists for this chatbot', httpStatus.CONFLICT);
	}

	// Add new domain
	const [newDomain] = await db
		.insert(originDomainsTable)
		.values({
			userId,
			chatbotId,
			apiKey: chatbot.apiKey,
			domain,
			createdAt: new Date(),
		})
		.returning();

	if (!newDomain) {
		throw new ApiError('Failed to add domain', httpStatus.INTERNAL_SERVER_ERROR);
	}

	return {
		id: newDomain.id,
		domain: newDomain.domain,
		createdAt: newDomain.createdAt,
	};
};

