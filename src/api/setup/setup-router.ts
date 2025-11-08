
import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
    analyzeImage,
    inferPrompt,
    searchSources,
    generateTopics,
} from './setup-controller';
import {
    analyzeImageRequestSchema,
    inferPromptRequestSchema,
    fetchSitemapRequestSchema,
    generateTopicsRequestSchema,
} from './setup-schema';

const app = express.Router();

app.post('/analyze-image', auth, validate('body', analyzeImageRequestSchema), analyzeImage);
app.post('/infer-prompt', auth, validate('body', inferPromptRequestSchema), inferPrompt);
app.post('/search-sources', auth, validate('body', fetchSitemapRequestSchema), searchSources);
app.post('/topic', auth, validate('body', generateTopicsRequestSchema), generateTopics);


export default app;