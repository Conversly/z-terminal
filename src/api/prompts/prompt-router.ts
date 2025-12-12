import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  getAllPrompts,
  updateBasePrompt,
  upsertChannelPrompt,
  deleteChannelPrompt,
  getChannelPrompt,
  generateBasePrompt,
  generateChannelPrompt,
} from './prompt-controller';
import {
  getChatbotPromptsSchema,
  updateBasePromptSchema,
  upsertChannelPromptSchema,
  deleteChannelPromptSchema,
  getChannelPromptSchema,
  generateBasePromptSchema,
  generateChannelPromptSchema,
} from './prompt-schema';

const router = express.Router();

// ============================================
// AI GENERATION (must come before parameterized routes)
// ============================================

// Generate base prompt using AI
router.get(
  '/generate/base',
  auth,
  validate('query', generateBasePromptSchema),
  generateBasePrompt
);

// Generate channel-specific prompt using AI
router.get(
  '/generate/channel',
  auth,
  validate('query', generateChannelPromptSchema),
  generateChannelPrompt
);

// ============================================
// UPDATE/CREATE PROMPTS
// ============================================

// Update base prompt
router.put(
  '/base',
  auth,
  validate('body', updateBasePromptSchema),
  updateBasePrompt
);

// Upsert channel prompt (create or update)
router.post(
  '/channel',
  auth,
  validate('body', upsertChannelPromptSchema),
  upsertChannelPrompt
);

// ============================================
// DELETE PROMPTS
// ============================================

// Delete channel prompt
router.delete(
  '/channel/:id',
  auth,
  validate('params', deleteChannelPromptSchema),
  deleteChannelPrompt
);

// ============================================
// GET PROMPTS (parameterized routes last)
// ============================================

// Get all prompts for a chatbot (base + all channel prompts)
router.get(
  '/:chatbotId',
  auth,
  validate('params', getChatbotPromptsSchema),
  getAllPrompts
);

// Get specific channel prompt
router.get(
  '/:chatbotId/channel/:channel',
  auth,
  validate('params', getChannelPromptSchema),
  getChannelPrompt
);

export default router;

