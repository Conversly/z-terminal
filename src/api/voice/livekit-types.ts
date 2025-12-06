/**
 * LiveKit Voice Agent Types
 * Types for voice token generation and agent configuration
 */

/**
 * Configuration passed to the Python voice agent via room metadata
 */
export interface VoiceAgentConfig {
    instructions: string;
    tts_voice: string;
    stt_language: string;
    tts_language: string;
}

/**
 * Room configuration for agent dispatch
 */
export interface RoomConfigRequest {
    agents?: Array<{
        agent_name: string;
    }>;
}

/**
 * Request body for voice token generation (matches frontend POC)
 */
export interface VoiceTokenRequest {
    room_config?: RoomConfigRequest;
    agent_config?: VoiceAgentConfig;
}

/**
 * Response from voice token generation
 */
export interface VoiceTokenResponse {
    serverUrl: string;
    participantToken: string;
    roomName: string;
    participantName: string;
}

