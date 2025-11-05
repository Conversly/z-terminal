import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import {
  chatBots as chatBotsTable,
} from '../../drizzle/schema';
import { CreateChatbotInput, ChatbotResponse, GenerateInstructionsInput, InstructionResponse, GetChatbotsResponse, DeleteChatbotInput, DeleteChatbotResponse} from './types';
import axios from 'axios';
import env from '../../config';
import { eq } from 'drizzle-orm';

export const handleCreateChatbot = async (
  userId: string,
  input: CreateChatbotInput
): Promise<ChatbotResponse> => {
  try {
    const [chatbot] = await db
      .insert(chatBotsTable)
      .values({
        userId,
        name: input.name,
        description: input.description,
        systemPrompt: input.systemPrompt,
        status: input.status as 'DRAFT' | 'TRAINING' | 'ACTIVE' | 'INACTIVE',
        apiKey: null,
      })
      .returning();

    return chatbot;
  } catch (error) {
    logger.error('Error creating chatbot:', error);
    throw new ApiError('Error creating chatbot', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleGenerateInstruction = async (
  input: GenerateInstructionsInput
): Promise<InstructionResponse> => {
  try {
    const systemPrompt = `
        You are an AI assistant that helps users craft effective prompts for their AI chatbot, designed for customer support, website documentation assistance, technical support, and more. Your goal is to refine and enhance their input by making it clear, structured, and optimized for high-quality responses.
        
        # Guidelines for Improvement:
        - Ensure the prompt provides enough context about the chatbot's purpose and target users.
        - Encourage specifying tone, style, and preferred response format (e.g., concise vs. detailed).
        - Suggest adding example queries to guide the chatbot's behavior.
        - Include fallback instructions for handling unknown questions or uncertain topics.
        - Recommend when the chatbot should say, 'I do not know,' versus when to attempt an answer.
        
        # Example Prompt Enhancement:
        **User Input:** "Write a prompt for a customer support bot."
        
        **Optimized Prompt:**
        "Assist customers by providing clear, helpful, and empathetic responses to their inquiries or issues. Aim to resolve their concerns efficiently while ensuring customer satisfaction.
        
        ## Steps
        1. **Understand the Inquiry**: Carefully read the customer's question or issue to grasp their main concern.
        2. **Research and Gather Information**: Use the provided context or relevant information to address the customer's needs accurately.
        3. **Craft a Response**: Formulate a thoughtful and concise response, ensuring it addresses all aspects of the customer's inquiry.
        4. **Provide Solutions**: Offer practical solutions or next steps for the customer, including links to resources if necessary.
        5. **Empathy and Assurance**: Include empathetic language to reassure the customer and express an understanding of their situation.
        6. **Verify Satisfaction**: Suggest the customer contact again if they need further assistance or confirmation.
        
        ## Output Format
        Respond in a concise and customer-friendly paragraph. The response should be clear and include empathetic language, solutions, and an invitation for further contact if needed.
        
        ## Examples
        **Example 1**
        - Input: "I haven't received my order that was supposed to arrive last week."
        - Output: "I'm sorry to hear that your order hasn't arrived. I understand how frustrating that can be. Let me check the status of your order for you. In the meantime, please ensure your shipping address is correct. Feel free to reach out again if you have any more questions or need further assistance."
        
        **Example 2**
        - Input: "How do I reset my password?"
        - Output: "To reset your password, please go to the login page and click on 'Forgot Password?' Follow the instructions to reset it. If you encounter any issues, please let us know so we can assist you further."
        
        ## Notes
        - Always maintain a polite and professional tone.
        - Ensure solutions are accurate and actionable.
        - Tailor responses to be specific to the customer's needs and context.
    `;

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        system_instruction: {
          parts: [
            {
              text: systemPrompt
            }
          ]
        },
        contents: [
          {
            parts: [
              {
                text: input.topic
              }
            ]
          }
        ]
      },
      {
        headers: {
          'x-goog-api-key': env.GEMINI_API_KEY,
          'Content-Type': 'application/json',
        }
      }
    );

    const generatedPrompt = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedPrompt) {
      throw new ApiError('Failed to generate prompt from Gemini API', httpStatus.INTERNAL_SERVER_ERROR);
    }

    return {
      chatbotId : '',  // Placeholder, as chatbotId is not generated yet 
      systemPrompt: generatedPrompt
    };
  } catch (error) {
    logger.error('Error getting instructions from Gemini:', error);
    if (axios.isAxiosError(error)) {
      throw new ApiError(
        `Gemini API error: ${error.response?.data?.error?.message || error.message}`,
        error.response?.status || httpStatus.INTERNAL_SERVER_ERROR
      );
    }
    throw new ApiError('Error getting instructions', httpStatus.INTERNAL_SERVER_ERROR);
  }
};


export const handleUpdateInstruction = async (
  systemPrompt: string,
  chatbotId: string,
): Promise<InstructionResponse> => {
  try {
    const [updatedChatbot] = await db
      .update(chatBotsTable)
      .set({
        systemPrompt: systemPrompt,
        updatedAt: new Date(),
      })
      .where(eq(chatBotsTable.id, parseInt(chatbotId)))
      .returning();

    if (!updatedChatbot) {
      throw new ApiError('Chatbot not found', httpStatus.NOT_FOUND);
    }

    return {
      chatbotId: chatbotId,
      systemPrompt: updatedChatbot.systemPrompt,
    };
  } catch (error) {
    logger.error('Error updating instructions:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Error updating instructions', httpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const handleGetChatbots = async (
  userId: string
): Promise<GetChatbotsResponse[]> => {
  try {
    // Get all chatbots associated with the user
    const chatbots = await db
      .select({
        id: chatBotsTable.id,
        name: chatBotsTable.name,
        description: chatBotsTable.description,
        createdAt: chatBotsTable.createdAt,
        userId: chatBotsTable.userId,
        status: chatBotsTable.status,
      })
      .from(chatBotsTable)
      .where(eq(chatBotsTable.userId, userId));

    return chatbots;
  } catch (error) {
    logger.error('Error fetching chatbots:', error);
    throw new ApiError('Error fetching chatbots', httpStatus.INTERNAL_SERVER_ERROR);
  }
};



export const handleGetChatbot = async (
  chatbotId: number
): Promise<ChatbotResponse | null> => {
  try {
    const chatbot = await db
      .select({
        id: chatBotsTable.id,
        name: chatBotsTable.name,
        description: chatBotsTable.description,
        systemPrompt: chatBotsTable.systemPrompt,
        createdAt: chatBotsTable.createdAt,
        updatedAt: chatBotsTable.updatedAt,
        userId: chatBotsTable.userId,
        status: chatBotsTable.status,
      })
      .from(chatBotsTable)
      .where(eq(chatBotsTable.id, chatbotId))
      .limit(1)
      .then((res) => res[0]);

    return chatbot;
  } catch (error) {
    logger.error('Error fetching chatbot:', error);
    throw new ApiError('Error fetching chatbot', httpStatus.INTERNAL_SERVER_ERROR);
  }
};


export const handleDeleteChatbot = async (
  userId: string,
  input: DeleteChatbotInput
): Promise<DeleteChatbotResponse> => {
  try {
    // First, verify that the chatbot belongs to the user
    const [chatbot] = await db
      .select()
      .from(chatBotsTable)
      .where(eq(chatBotsTable.id, input.id));

    if (!chatbot) {
      throw new ApiError('Chatbot not found', httpStatus.NOT_FOUND);
    }

    if (chatbot.userId !== userId) {
      throw new ApiError('Unauthorized: You do not have permission to delete this chatbot', httpStatus.FORBIDDEN);
    }
    await db
      .delete(chatBotsTable)
      .where(eq(chatBotsTable.id, input.id));

    return { 
      success: true,
      message: 'Chatbot deleted successfully'
    };
  } catch (error) {
    logger.error('Error deleting chatbot:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Error deleting chatbot', httpStatus.INTERNAL_SERVER_ERROR);
  }
};