import * as yup from 'yup';

export const updateVoiceConfigSchema = yup.object().shape({
    status: yup.string().oneOf(['ACTIVE', 'INACTIVE', 'TESTING']).optional(),
    turnDetection: yup.string().oneOf(['stt', 'vad', 'realtime_llm', 'manual']).optional(),
    sttModel: yup.string().optional(),
    ttsModel: yup.string().optional(),
    llmModel: yup.string().optional(),
    voiceId: yup.string().optional(),
    voiceSettings: yup.object().optional(),
    systemPrompt: yup.string().optional(),
    initialGreeting: yup.string().optional(),
    closingMessage: yup.string().optional(),
});

export const chatbotIdParamsSchema = yup.object().shape({
    chatbotId: yup.string().required('Chatbot ID is required'),
});
