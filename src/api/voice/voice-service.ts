import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import { db } from '../../loaders/postgres';
import { voiceConfig, voiceWidgetConfig, voiceCallSession } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { verifyChatbotOwnership } from '../../shared/helper-queries';
import { UpdateVoiceConfigInput } from './voice-types';

export type VoiceConfigResponse = typeof voiceConfig.$inferSelect;
export type VoiceWidgetConfigResponse = typeof voiceWidgetConfig.$inferSelect;
export type VoiceCallSessionResponse = typeof voiceCallSession.$inferSelect;

export const handleGetVoiceConfig = async (
    chatbotId: string,
    userId: string
): Promise<VoiceConfigResponse> => {
    await verifyChatbotOwnership(chatbotId, userId);

    let config = await db.query.voiceConfig.findFirst({
        where: eq(voiceConfig.chatbotId, chatbotId),
    });

    if (!config) {
        const [newConfig] = await db.insert(voiceConfig).values({
            chatbotId,
            voiceId: 'rachel',
            voiceSettings: {},
        }).returning();
        config = newConfig;
    }

    return config;
};

export const handleUpdateVoiceConfig = async (
    chatbotId: string,
    userId: string,
    updates: UpdateVoiceConfigInput
): Promise<VoiceConfigResponse> => {
    await verifyChatbotOwnership(chatbotId, userId);

    let config = await db.query.voiceConfig.findFirst({
        where: eq(voiceConfig.chatbotId, chatbotId),
    });

    if (!config) {
        const [newConfig] = await db.insert(voiceConfig).values({
            chatbotId,
            voiceId: 'rachel',
            voiceSettings: {},
            ...(updates as any)
        }).returning();
        config = newConfig;
    } else {
        const [updatedConfig] = await db.update(voiceConfig)
            .set({ ...(updates as any), updatedAt: new Date() })
            .where(eq(voiceConfig.chatbotId, chatbotId))
            .returning();
        config = updatedConfig;
    }

    return config;
};

export const handleDeleteVoiceConfig = async (
    chatbotId: string,
    userId: string
): Promise<void> => {
    await verifyChatbotOwnership(chatbotId, userId);
    await db.delete(voiceConfig).where(eq(voiceConfig.chatbotId, chatbotId));
};

export const handleGetVoiceWidgetConfig = async (
    chatbotId: string,
    userId: string
): Promise<VoiceWidgetConfigResponse> => {
    await verifyChatbotOwnership(chatbotId, userId);

    let vConfig = await db.query.voiceConfig.findFirst({
        where: eq(voiceConfig.chatbotId, chatbotId),
    });

    if (!vConfig) {
        const [newConfig] = await db.insert(voiceConfig).values({
            chatbotId,
            voiceId: 'rachel',
            voiceSettings: {},
        }).returning();
        vConfig = newConfig;
    }

    let widgetConf = await db.query.voiceWidgetConfig.findFirst({
        where: eq(voiceWidgetConfig.voiceConfigId, vConfig.id),
    });

    if (!widgetConf) {
        const [newWidgetConfig] = await db.insert(voiceWidgetConfig).values({
            voiceConfigId: vConfig.id,
            styles: {
                position: 'bottom-right',
                widgetStyle: 'floating-button',
                primaryColor: '#000000',
                backgroundColor: '#ffffff',
                activeCallColor: '#ff0000',
                mutedColor: '#808080',
                callButtonIcon: '',
                endCallIcon: '',
                muteIcon: '',
                buttonSize: '64px',
                expandedWidth: '320px',
                expandedHeight: '400px',
                showButtonText: false,
                buttonText: 'Call us',
                showWaveform: true,
                showCallTimer: true,
                showTranscription: true,
                showPoweredBy: true,
                displayName: 'Voice Assistant',
            },
        }).returning();
        widgetConf = newWidgetConfig;
    }

    return widgetConf;
};

export const handleGetVoiceCallSessions = async (
    chatbotId: string,
    userId: string
): Promise<VoiceCallSessionResponse[]> => {
    await verifyChatbotOwnership(chatbotId, userId);

    const vConfig = await db.query.voiceConfig.findFirst({
        where: eq(voiceConfig.chatbotId, chatbotId),
    });

    if (!vConfig) {
        return [];
    }

    const sessions = await db.query.voiceCallSession.findMany({
        where: eq(voiceCallSession.voiceConfigId, vConfig.id),
        orderBy: [desc(voiceCallSession.startedAt)],
    });

    return sessions;
};
