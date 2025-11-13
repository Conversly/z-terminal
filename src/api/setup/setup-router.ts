
import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
    analyzeImage,
    inferPrompt,
    searchSources,
    generateTopics,
    getApiKeyStats,
} from './setup-controller';
import { testApiKey, testAllApiKeys } from './debug-controller';
import {
    analyzeImageRequestSchema,
    inferPromptRequestSchema,
    fetchSitemapRequestSchema,
    generateTopicsRequestSchema,
} from './setup-schema';

const app = express.Router();

// API key status and debug endpoints
app.get('/api-key-stats', auth, getApiKeyStats);
app.post('/test-api-key', auth, testApiKey);
app.post('/test-all-api-keys', auth, testAllApiKeys);

app.post('/analyze-image', auth, validate('body', analyzeImageRequestSchema), analyzeImage);
app.post('/infer-prompt', auth, validate('body', inferPromptRequestSchema), inferPrompt);
app.post('/search-sources', auth, validate('body', fetchSitemapRequestSchema), searchSources);
app.post('/topic', auth, validate('body', generateTopicsRequestSchema), generateTopics);


export default app;