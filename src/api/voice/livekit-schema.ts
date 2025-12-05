import * as yup from 'yup';

/**
 * Validation schema for voice token generation request
 * Matches frontend POC structure with room_config and agent_config
 */
export const voiceTokenRequestSchema = yup.object({
    room_config: yup.object({
        agents: yup.array().of(
            yup.object({
                agent_name: yup.string(),
            })
        ),
    }).optional(),
    agent_config: yup.object({
        instructions: yup.string().default('You are a helpful voice assistant.'),
        tts_voice: yup.string().default('21m00Tcm4TlvDq8ikWAM'),
        stt_language: yup.string().default('en'),
        tts_language: yup.string().default('en'),
    }).optional(),
});

export type VoiceTokenRequestBody = yup.InferType<typeof voiceTokenRequestSchema>;

