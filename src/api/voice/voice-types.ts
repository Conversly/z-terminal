export interface VoiceProviderSettings {
    // ElevenLabs
    stability?: number;           // 0-1
    similarityBoost?: number;     // 0-1
    style?: number;               // 0-1
    useSpeakerBoost?: boolean;

    // Cartesia & OpenAI TTS & Google
    speed?: number;               // Cartesia: -1 to 1, OpenAI/Google: 0.25 to 4.0
    emotion?: string[];           // Cartesia e.g., ["positivity:high", "curiosity"]

    // Google & Azure
    pitch?: number | string;      // Google: number (-20.0 to 20.0), Azure: string (e.g., "+5Hz", "-2st")
    volumeGainDb?: number;        // Google: -96.0 to 16.0

    // Azure
    rate?: string;                // e.g., "+10%", "-5%"
}

export interface VoiceWidgetStyles {
    // Position & Style
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    widgetStyle: 'floating-button' | 'embedded' | 'full-screen-overlay';

    // Colors
    primaryColor: string;
    backgroundColor: string;
    activeCallColor: string;
    mutedColor: string;

    // Icons (URLs or icon identifiers)
    callButtonIcon: string;
    endCallIcon: string;
    muteIcon: string;

    // Dimensions
    buttonSize: string;           // e.g., '64px'
    expandedWidth: string;        // e.g., '320px'
    expandedHeight: string;       // e.g., '400px'

    // Button Configuration
    showButtonText: boolean;
    buttonText: string;           // e.g., "Talk to us"

    // Visual Feedback
    showWaveform: boolean;
    showCallTimer: boolean;
    showTranscription: boolean;

    // Branding
    showPoweredBy: boolean;
    avatarUrl?: string;
    displayName: string;
}

export interface ConversationTranscript {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
}

export interface CallMetrics {
    // Define metrics properties here
    [key: string]: any;
}

export interface UpdateVoiceConfigInput {
    status?: 'ACTIVE' | 'INACTIVE' | 'TESTING';
    turnDetection?: 'stt' | 'vad' | 'realtime_llm' | 'manual';
    sttModel?: string;
    ttsModel?: string;
    llmModel?: string;
    voiceId?: string;
    voiceSettings?: Record<string, any>;
    systemPrompt?: string;
    initialGreeting?: string;
    closingMessage?: string;
}