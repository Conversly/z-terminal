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

// Normalize incoming apiConfig/config keys (camelCase -> snake_case) before validation
function normalizeApiConfigMiddleware(req: any, res: any, next: any) {
  try {
    const raw = req.body?.apiConfig || req.body?.config;
    if (!raw) return next();

    const normalized = {
      method: raw.method,
      base_url: raw.base_url || raw.baseUrl || raw.baseURL,
      endpoint: raw.endpoint,
      headers: raw.headers || {},
      query_params: raw.query_params || raw.queryParams || {},
      body_template: raw.body_template || raw.bodyTemplate || raw.body,
      response_mapping: raw.response_mapping || raw.responseMapping,
      success_codes: raw.success_codes || raw.successCodes,
      timeout_seconds: raw.timeout_seconds || raw.timeoutSeconds,
      retry_count: raw.retry_count || raw.retryCount,
      auth_type: raw.auth_type || raw.authType,
      auth_value: raw.auth_value || raw.authValue,
      follow_redirects: raw.follow_redirects ?? raw.followRedirects ?? true,
      verify_ssl: raw.verify_ssl ?? raw.verifySsl ?? true,
    };

    // set both keys so validation for either schema works
    req.body.apiConfig = normalized;
    req.body.config = normalized;
  } catch (e) {
    // ignore and continue — validation will catch issues
  }
  return next();
}
/**
 * Create a new custom action
 * POST /api/v1/actions/create
 */
router.post(
  '/create',
  auth,
  normalizeApiConfigMiddleware,
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
  normalizeApiConfigMiddleware,
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
  normalizeApiConfigMiddleware,
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
