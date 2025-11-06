import ApiError from "../utils/apiError";
import httpStatus from "http-status";
import { db } from "../loaders/postgres";
import { chatBots as chatBotsTable } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

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
