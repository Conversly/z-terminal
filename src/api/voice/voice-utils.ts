/**
 * Maps voice names to ElevenLabs voice IDs
 * This is needed because the database stores friendly names like "rachel"
 * but ElevenLabs API requires actual voice IDs
 */
const VOICE_NAME_TO_ID_MAP: Record<string, string> = {
    // ElevenLabs voices
    'rachel': '21m00Tcm4TlvDq8ikWAM', // Rachel (Female, Calm) - default
    'bella': 'EXAVITQu4vr4xnSDxMaL', // Bella (Female, American)
    'domi': 'AZnzlk1XvdvUeBnXmlld', // Domi (Female, American)
    'adam': 'pNInz6obpgDQGcFmaJgB', // Adam (Male, American)
    'sam': 'yoZ06aMxZJJ28mfd3POQ', // Sam (Male, Narration)
    'emily': 'MF3mGyEYCl7XYWbV9V6O', // Emily (Female, British)
    'charlie': 'IKne3meq5aSn9XLyUdCD', // Charlie (Male, Australian)
    'alice': '21m00Tcm4TlvDq8ikWAM', // Default to Rachel if Alice not found
};

/**
 * Converts a voice name (like "rachel") to an ElevenLabs voice ID
 * If the input is already a voice ID (contains alphanumeric pattern), returns it as-is
 * Otherwise looks up the name in the mapping
 * 
 * @param voiceIdentifier - Voice name (e.g., "rachel") or voice ID (e.g., "21m00Tcm4TlvDq8ikWAM")
 * @returns ElevenLabs voice ID
 */
export function getElevenLabsVoiceId(voiceIdentifier: string): string {
    // If it looks like a voice ID (long alphanumeric string), return as-is
    if (/^[a-zA-Z0-9]{20,}$/.test(voiceIdentifier)) {
        return voiceIdentifier;
    }
    
    // Otherwise, look up the name in the mapping
    const voiceId = VOICE_NAME_TO_ID_MAP[voiceIdentifier.toLowerCase()];
    
    if (!voiceId) {
        console.warn(`[Voice Utils] Unknown voice name "${voiceIdentifier}", defaulting to Rachel`);
        return VOICE_NAME_TO_ID_MAP['rachel']; // Default fallback
    }
    
    return voiceId;
}

