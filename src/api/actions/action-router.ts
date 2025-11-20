import express from 'express';
import { auth, validate } from '../../shared/middleware';
import {
  createCustomAction,
  getCustomActions,
  getCustomAction,
  updateCustomAction,
  deleteCustomAction,
  toggleCustomAction,
  testCustomAction,
  getActionTemplates,
  createActionTemplate,
} from './action-controller';
import {
  createCustomActionSchema,
  updateCustomActionSchema,
  toggleActionSchema,
  testActionSchema,
  getCustomActionSchema,
  getCustomActionsSchema,
  deleteCustomActionSchema,
  getTemplatesQuerySchema,
  createTemplateSchema,
} from './action-schema';

const router = express.Router();

/**
 * Create a new custom action
 * POST /api/v1/actions/create
 */
router.post(
  '/create',
  auth,
  validate('body', createCustomActionSchema),
  createCustomAction
);

/**
 * Get all custom actions for a chatbot
 * POST /api/v1/actions/list
 */
router.post(
  '/list',
  auth,
  validate('body', getCustomActionsSchema),
  getCustomActions
);

/**
 * Get a single custom action
 * POST /api/v1/actions/get
 */
router.post(
  '/get',
  auth,
  validate('body', getCustomActionSchema),
  getCustomAction
);

/**
 * Update a custom action
 * POST /api/v1/actions/update
 */
router.post(
  '/update',
  auth,
  validate('body', updateCustomActionSchema),
  updateCustomAction
);

/**
 * Delete a custom action
 * POST /api/v1/actions/delete
 */
router.post(
  '/delete',
  auth,
  validate('body', deleteCustomActionSchema),
  deleteCustomAction
);

/**
 * Toggle action enabled/disabled
 * POST /api/v1/actions/toggle
 */
router.post(
  '/toggle',
  auth,
  validate('body', toggleActionSchema),
  toggleCustomAction
);

/**
 * Test a custom action configuration (before saving)
 * POST /api/v1/actions/test
 */
router.post(
  '/test',
  auth,
  validate('body', testActionSchema),
  testCustomAction
);

// ============================================
// ACTION TEMPLATES ROUTES
// ============================================

/**
 * Get all action templates
 * GET /api/v1/actions/templates
 */
router.get(
  '/templates',
  auth,
  validate('query', getTemplatesQuerySchema),
  getActionTemplates
);

/**
 * Create an action template (admin only)
 * POST /api/v1/actions/templates/create
 */
router.post(
  '/templates/create',
  auth,
  // TODO: Add admin-only middleware here
  validate('body', createTemplateSchema),
  createActionTemplate
);

export default router;
