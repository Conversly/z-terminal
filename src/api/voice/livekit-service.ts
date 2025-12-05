import type { VoiceAgentConfig, VoiceTokenResponse } from './livekit-types';
import env from '../../config/index';
import ApiError from '../../utils/apiError';
import httpStatus from 'http-status';

/**
 * Generates a LiveKit access token for voice room participation
 * The token includes room configuration that dispatches the Python agent
 * with the provided agent configuration metadata
 * 
 * @param chatbotId - The chatbot ID to associate with the room
 * @param userId - The user ID (or null for anonymous)
 * @param agentConfig - Configuration passed to the Python agent
 * @param agentNameOverride - Optional agent name override (from room_config)
 */
export async function generateLivekitVoiceToken(
    chatbotId: string,
    userId: string | null,
    agentConfig: VoiceAgentConfig,
    agentNameOverride?: string
): Promise<VoiceTokenResponse> {
    // Validate environment variables
    if (!env.LIVEKIT_URL) {
        throw new ApiError('LIVEKIT_URL is not configured', httpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!env.LIVEKIT_API_KEY) {
        throw new ApiError('LIVEKIT_API_KEY is not configured', httpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!env.LIVEKIT_API_SECRET) {
        throw new ApiError('LIVEKIT_API_SECRET is not configured', httpStatus.INTERNAL_SERVER_ERROR);
    }

    // Dynamic imports to avoid protobuf initialization side-effects in Bun
    const { AccessToken } = await import('livekit-server-sdk');
    const { RoomConfiguration } = await import('@livekit/protocol');

    // Generate unique identifiers matching POC format
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    // Create access token with 15 minute TTL
    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: participantIdentity,
        name: 'user',
        ttl: '15m',
    });

    // Grant room permissions
    at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
    });

    // Use agent name from request, env, or default
    // If agentNameOverride is explicitly provided (even if empty string ""), use it
    // Empty string "" matches Python agent registration: {"agent_name": ""}
    // Only fall back to env/default if agentNameOverride is undefined (not provided)
    const agentName = agentNameOverride !== undefined 
        ? agentNameOverride  // This includes empty string "" which is valid
        : (env.LIVEKIT_AGENT_NAME || 'voice-assistant');

    // Configure agent dispatch with metadata
    // The Python agent reads this metadata from ctx.job.metadata to configure STT/TTS/LLM
    at.roomConfig = new RoomConfiguration({
        agents: [{
            agentName: agentName,
            metadata: JSON.stringify(agentConfig),
        }],
    });

    console.log(`[LiveKit] Dispatching agent "${agentName}" (empty=${agentName === ''}) to room "${roomName}"`);
    console.log(`[LiveKit] Agent metadata:`, JSON.stringify(agentConfig, null, 2));

    const participantToken = await at.toJwt();

    return {
        serverUrl: env.LIVEKIT_URL,
        participantToken,
        roomName,
        participantName: 'user',
    };
}

