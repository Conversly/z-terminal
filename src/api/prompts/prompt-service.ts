import axios from 'axios';
import httpStatus from 'http-status';
import { eq, and } from 'drizzle-orm';
import { db } from '../../loaders/postgres';
import { chatBots, chatbotChannelPrompts } from '../../drizzle/schema';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { getGeminiKeyManager } from '../../shared/apikey-manager';
import {
  UpdateBasePromptInput,
  GenerateBasePromptInput,
  UpsertChannelPromptInput,
  GenerateChannelPromptInput,
  DeleteChannelPromptInput,
  BasePromptResponse,
  ChannelPromptResponse,
  AllPromptsResponse,
  GeneratedPromptResponse,
  DeletePromptResponse,
  ChannelType,
} from './types';

// ============================================
// SYSTEM PROMPTS FOR AI GENERATION
// ============================================

const BASE_PROMPT_GENERATOR = `
You are an expert at crafting system prompts for AI chatbots. Your task is to create a comprehensive base prompt that defines the chatbot's identity, knowledge, and behavior based on the business description provided.

## Guidelines:
- Create a clear identity for the chatbot based on the business context
- Define the scope of knowledge and expertise
- Set appropriate boundaries (what the bot should/shouldn't do)
- Include handling for unknown questions
- Incorporate the specified tone if provided
- Consider the target audience if specified

## Output Format:
Generate ONLY the system prompt text, no explanations or metadata. The prompt should be ready to use directly.

## Example Output:
"You are [Business Name]'s AI assistant, specialized in [domain]. Your role is to...

## Core Responsibilities:
- Help customers with [specific tasks]
- Provide accurate information about [topics]

## Guidelines:
- Always maintain a [tone] tone
- If unsure about something, acknowledge it honestly
- Never provide information outside your scope

## When You Don't Know:
Say: 'I don't have that specific information, but I can help you [alternative action].'
"
`;

const WIDGET_PROMPT_GENERATOR = `
You are an expert at crafting system prompts for AI chatbots specifically designed for WEBSITE WIDGET integration.

## Context:
Website widgets appear as chat bubbles on websites. Users expect quick, scannable responses that work well in a small chat interface.

## Guidelines for Widget Prompts:
- Keep responses concise and scannable (users are browsing)
- Use bullet points and short paragraphs
- Provide quick answers with options to learn more
- Include relevant links when helpful
- Be proactive about offering navigation help
- Support markdown formatting for better readability
- Handle common website visitor intents (pricing, features, contact, support)

## Output Format:
Generate ONLY the system prompt text that supplements the base prompt for widget-specific behavior. No explanations.

## Example additions for widgets:
"## Widget-Specific Behavior:
- Keep responses under 3-4 sentences when possible
- Use bullet points for lists
- Offer to elaborate if the user wants more detail
- Proactively suggest relevant pages or resources
- Use markdown formatting for clarity"
`;

const WHATSAPP_PROMPT_GENERATOR = `
You are an expert at crafting system prompts for AI chatbots specifically designed for WHATSAPP integration.

## Context:
WhatsApp is a mobile messaging app. Users expect conversational, mobile-friendly responses. Messages should feel natural and personal.

## Guidelines for WhatsApp Prompts:
- Use a more conversational, friendly tone
- Keep messages mobile-friendly (shorter paragraphs)
- Use emojis sparingly but appropriately 😊
- Break long responses into multiple messages mentally (but output as one)
- Be aware of WhatsApp's limitations (no complex markdown, limited formatting)
- Handle voice messages context (users might send audio)
- Support async conversation patterns (users may reply hours later)
- Use simple formatting: *bold*, _italic_, ~strikethrough~

## Output Format:
Generate ONLY the system prompt text that supplements the base prompt for WhatsApp-specific behavior. No explanations.

## Example additions for WhatsApp:
"## WhatsApp-Specific Behavior:
- Use a warm, conversational tone as if chatting with a friend
- Keep messages concise and mobile-friendly
- Use emojis occasionally to add warmth 👋
- Remember this is an async chat - be understanding of delays
- Use WhatsApp formatting: *bold* for emphasis, _italic_ for nuance"
`;

const VOICE_PROMPT_GENERATOR = `
You are an expert at crafting system prompts for AI chatbots specifically designed for VOICE CALL integration.

## Context:
Voice calls require completely different communication patterns. Users are LISTENING, not reading. Responses must be spoken aloud naturally.

## Guidelines for Voice Prompts:
- Write responses meant to be SPOKEN, not read
- Avoid bullet points, markdown, links, or any visual formatting
- Use natural speech patterns and transitions
- Keep responses concise (people can't "re-read" audio)
- Use verbal signposting ("First... Second... Finally...")
- Avoid spelling out URLs or complex information
- Handle interruptions gracefully
- Confirm understanding before proceeding with complex info
- Use filler phrases naturally ("Let me check that for you...")
- Provide clear call-to-action at the end of responses

## Output Format:
Generate ONLY the system prompt text that supplements the base prompt for voice-specific behavior. No explanations.

## Example additions for voice:
"## Voice Call-Specific Behavior:
- Speak naturally as if on a phone call
- Never use bullet points, markdown, or visual formatting
- Keep responses brief - people are listening, not reading
- Use transitions like 'First,' 'Also,' 'One more thing'
- For complex info, offer to send details via email/text instead
- Pause briefly between topics for clarity
- Always end with a clear next step or question"
`;

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Get all prompts for a chatbot (base + channel-specific)
 */
export const handleGetAllPrompts = async (chatbotId: string): Promise<AllPromptsResponse> => {
  const chatbot = await db
    .select({
      systemPrompt: chatBots.systemPrompt,
      updatedAt: chatBots.updatedAt,
    })
    .from(chatBots)
    .where(eq(chatBots.id, chatbotId))
    .limit(1);

  if (!chatbot.length) {
    throw new ApiError('Chatbot not found', httpStatus.NOT_FOUND);
  }

  const channelPrompts = await db
    .select()
    .from(chatbotChannelPrompts)
    .where(eq(chatbotChannelPrompts.chatbotId, chatbotId));

  return {
    basePrompt: {
      systemPrompt: chatbot[0].systemPrompt,
      updatedAt: chatbot[0].updatedAt,
    },
    channelPrompts: channelPrompts.map((cp) => ({
      id: cp.id,
      chatbotId: cp.chatbotId,
      channel: cp.channel as ChannelType,
      systemPrompt: cp.systemPrompt,
      createdAt: cp.createdAt,
      updatedAt: cp.updatedAt,
    })),
  };
};

/**
 * Update base prompt
 */
export const handleUpdateBasePrompt = async (
  input: UpdateBasePromptInput
): Promise<BasePromptResponse> => {
  const result = await db
    .update(chatBots)
    .set({
      systemPrompt: input.systemPrompt,
      updatedAt: new Date(),
    })
    .where(eq(chatBots.id, input.chatbotId))
    .returning({
      systemPrompt: chatBots.systemPrompt,
      updatedAt: chatBots.updatedAt,
    });

  if (!result.length) {
    throw new ApiError('Chatbot not found', httpStatus.NOT_FOUND);
  }

  return {
    chatbotId: input.chatbotId,
    systemPrompt: result[0].systemPrompt,
    updatedAt: result[0].updatedAt,
  };
};

/**
 * Upsert channel prompt (create or update)
 */
export const handleUpsertChannelPrompt = async (
  input: UpsertChannelPromptInput
): Promise<ChannelPromptResponse> => {
  // Check if chatbot exists
  const chatbot = await db
    .select({ id: chatBots.id })
    .from(chatBots)
    .where(eq(chatBots.id, input.chatbotId))
    .limit(1);

  if (!chatbot.length) {
    throw new ApiError('Chatbot not found', httpStatus.NOT_FOUND);
  }

  // Upsert: insert or update on conflict
  const result = await db
    .insert(chatbotChannelPrompts)
    .values({
      chatbotId: input.chatbotId,
      channel: input.channel,
      systemPrompt: input.systemPrompt,
    })
    .onConflictDoUpdate({
      target: [chatbotChannelPrompts.chatbotId, chatbotChannelPrompts.channel],
      set: {
        systemPrompt: input.systemPrompt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    id: result[0].id,
    chatbotId: result[0].chatbotId,
    channel: result[0].channel as ChannelType,
    systemPrompt: result[0].systemPrompt,
    createdAt: result[0].createdAt,
    updatedAt: result[0].updatedAt,
  };
};

/**
 * Delete channel prompt
 */
export const handleDeleteChannelPrompt = async (
  input: DeleteChannelPromptInput
): Promise<DeletePromptResponse> => {
  const result = await db
    .delete(chatbotChannelPrompts)
    .where(eq(chatbotChannelPrompts.id, input.id))
    .returning({ id: chatbotChannelPrompts.id });

  if (!result.length) {
    throw new ApiError('Channel prompt not found', httpStatus.NOT_FOUND);
  }

  return {
    success: true,
    message: 'Channel prompt deleted successfully',
  };
};

/**
 * Get single channel prompt
 */
export const handleGetChannelPrompt = async (
  chatbotId: string,
  channel: ChannelType
): Promise<ChannelPromptResponse | null> => {
  const result = await db
    .select()
    .from(chatbotChannelPrompts)
    .where(
      and(
        eq(chatbotChannelPrompts.chatbotId, chatbotId),
        eq(chatbotChannelPrompts.channel, channel)
      )
    )
    .limit(1);

  if (!result.length) {
    return null;
  }

  return {
    id: result[0].id,
    chatbotId: result[0].chatbotId,
    channel: result[0].channel as ChannelType,
    systemPrompt: result[0].systemPrompt,
    createdAt: result[0].createdAt,
    updatedAt: result[0].updatedAt,
  };
};

// ============================================
// AI GENERATION FUNCTIONS
// ============================================

/**
 * Call Gemini API with retry logic
 */
const callGeminiAPI = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const keyManager = getGeminiKeyManager();
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = keyManager.getCurrentKey();

    if (!apiKey) {
      throw new ApiError('No available API keys', httpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
        {
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              parts: [{ text: userPrompt }],
            },
          ],
        },
        {
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new ApiError('Failed to generate prompt from Gemini API', httpStatus.INTERNAL_SERVER_ERROR);
      }

      keyManager.reportSuccess(apiKey);
      return generatedText;
    } catch (error) {
      keyManager.rotateKey(apiKey, error);
      logger.warn(`Gemini API call failed (attempt ${attempt + 1}/${maxRetries}):`, error);

      if (attempt === maxRetries - 1) {
        logger.error('Error generating prompt after all retries:', error);
        if (axios.isAxiosError(error)) {
          throw new ApiError(
            `Gemini API error: ${error.response?.data?.error?.message || error.message}`,
            error.response?.status || httpStatus.INTERNAL_SERVER_ERROR
          );
        }
        throw new ApiError('Error generating prompt', httpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  throw new ApiError('Error generating prompt', httpStatus.INTERNAL_SERVER_ERROR);
};

/**
 * Generate base prompt using AI
 */
export const handleGenerateBasePrompt = async (
  input: GenerateBasePromptInput
): Promise<GeneratedPromptResponse> => {
  let userPrompt = `Create a system prompt for a chatbot with the following context:

Business/Purpose Description:
${input.businessDescription}`;

  if (input.tone) {
    userPrompt += `\n\nPreferred Tone: ${input.tone}`;
  }

  if (input.targetAudience) {
    userPrompt += `\n\nTarget Audience: ${input.targetAudience}`;
  }

  const generatedPrompt = await callGeminiAPI(BASE_PROMPT_GENERATOR, userPrompt);

  return {
    systemPrompt: generatedPrompt,
  };
};

/**
 * Generate channel-specific prompt using AI
 */
export const handleGenerateChannelPrompt = async (
  input: GenerateChannelPromptInput
): Promise<GeneratedPromptResponse> => {
  // Get base prompt for context
  const chatbot = await db
    .select({ systemPrompt: chatBots.systemPrompt, name: chatBots.name })
    .from(chatBots)
    .where(eq(chatBots.id, input.chatbotId))
    .limit(1);

  if (!chatbot.length) {
    throw new ApiError('Chatbot not found', httpStatus.NOT_FOUND);
  }

  const basePrompt = chatbot[0].systemPrompt;
  const chatbotName = chatbot[0].name;

  // Select appropriate generator based on channel
  let channelGenerator: string;
  let channelDescription: string;

  switch (input.channel) {
    case 'WIDGET':
      channelGenerator = WIDGET_PROMPT_GENERATOR;
      channelDescription = 'website chat widget';
      break;
    case 'WHATSAPP':
      channelGenerator = WHATSAPP_PROMPT_GENERATOR;
      channelDescription = 'WhatsApp messaging';
      break;
    case 'VOICE':
      channelGenerator = VOICE_PROMPT_GENERATOR;
      channelDescription = 'voice phone calls';
      break;
    default:
      throw new ApiError('Invalid channel', httpStatus.BAD_REQUEST);
  }

  const userPrompt = `Create channel-specific prompt additions for a ${channelDescription} integration.

Chatbot Name: ${chatbotName}

Base System Prompt (for context):
${basePrompt}

Generate prompt additions that supplement the base prompt specifically for ${channelDescription}. Focus on communication style, formatting, and channel-specific behaviors.`;

  const generatedPrompt = await callGeminiAPI(channelGenerator, userPrompt);

  return {
    systemPrompt: generatedPrompt,
    channel: input.channel,
  };
};

