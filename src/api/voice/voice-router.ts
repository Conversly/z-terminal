import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
    getVoiceConfig,
    updateVoiceConfig,
    deleteVoiceConfig,
    getVoiceWidgetConfig,
    getVoiceCallSessions
} from './voice-controller';
import { updateVoiceConfigSchema, chatbotIdParamsSchema } from './voice-schema';

const router = express.Router();

router
    .route('/:chatbotId/config')
    .get(
        auth,
        validate('params', chatbotIdParamsSchema),
        getVoiceConfig
    )
    .patch(
        auth,
        validate('params', chatbotIdParamsSchema),
        validate('body', updateVoiceConfigSchema),
        updateVoiceConfig
    )
    .delete(
        auth,
        validate('params', chatbotIdParamsSchema),
        deleteVoiceConfig
    );

router.get(
    '/:chatbotId/widget-config',
    auth,
    validate('params', chatbotIdParamsSchema),
    getVoiceWidgetConfig
);

router.get(
    '/:chatbotId/sessions',
    auth,
    validate('params', chatbotIdParamsSchema),
    getVoiceCallSessions
);

export default router;
