import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import {
  handleCreateCustomAction,
  handleGetCustomActions,
  handleGetCustomAction,
  handleUpdateCustomAction,
  handleDeleteCustomAction,
  handleToggleCustomAction,
  handleTestAction,
  handleGetActionTemplates,
  handleCreateActionTemplate,
} from './action-service';
import {
  CreateCustomActionInput,
  UpdateCustomActionInput,
  TestActionInput,
  CreateTemplateInput,
} from './types';

// ============================================
// CUSTOM ACTIONS CONTROLLERS
// ============================================

/**
 * Create a new custom action
 * POST /api/v1/actions/create
 */
export const createCustomAction = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const input: CreateCustomActionInput = {
      chatbotId: req.body.chatbotId,
      name: req.body.name,
      displayName: req.body.displayName,
      description: req.body.description,
      apiConfig: req.body.apiConfig,
      parameters: req.body.parameters,
    };

    const action = await handleCreateCustomAction(req.user.userId as string, input);

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Custom action created successfully',
      data: action,
    });
  }
);

/**
 * Get all custom actions for a chatbot
 * POST /api/v1/actions/list
 */
export const getCustomActions = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const { chatbotId, enabled } = req.body;

    const actions = await handleGetCustomActions(
      req.user.userId as string,
      chatbotId,
      enabled === true
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Custom actions fetched successfully',
      data: actions,
      count: actions.length,
    });
  }
);

/**
 * Get a single custom action
 * POST /api/v1/actions/get
 */
export const getCustomAction = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const { chatbotId, actionId } = req.body;

    const action = await handleGetCustomAction(
      req.user.userId as string,
      chatbotId,
      actionId
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Custom action fetched successfully',
      data: action,
    });
  }
);

/**
 * Update a custom action
 * POST /api/v1/actions/update
 */
export const updateCustomAction = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const { chatbotId, actionId, ...updates } = req.body;

    const input: UpdateCustomActionInput = {
      name: updates.name,
      displayName: updates.displayName,
      description: updates.description,
      apiConfig: updates.apiConfig,
      parameters: updates.parameters,
    };

    const action = await handleUpdateCustomAction(
      req.user.userId as string,
      chatbotId,
      actionId,
      input
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Custom action updated successfully',
      data: action,
    });
  }
);

/**
 * Delete a custom action
 * POST /api/v1/actions/delete
 */
export const deleteCustomAction = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const { chatbotId, actionId } = req.body;

    await handleDeleteCustomAction(req.user.userId as string, chatbotId, actionId);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Custom action deleted successfully',
    });
  }
);

/**
 * Toggle action enabled/disabled
 * POST /api/v1/actions/toggle
 */
export const toggleCustomAction = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const { chatbotId, actionId, isEnabled } = req.body;

    await handleToggleCustomAction(
      req.user.userId as string,
      chatbotId,
      actionId,
      isEnabled
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: `Custom action ${isEnabled ? 'enabled' : 'disabled'} successfully`,
      data: { isEnabled },
    });
  }
);

/**
 * Test a custom action configuration
 * POST /api/v1/actions/test
 */
export const testCustomAction = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const { chatbotId, config, testParameters } = req.body;

    const input: TestActionInput = {
      config,
      testParameters,
    };

    const result = await handleTestAction(req.user.userId as string, chatbotId, input);

    const status = result.success ? httpStatus.OK : httpStatus.BAD_REQUEST;

    res.status(status).json({
      success: result.success,
      message: result.success ? 'Action test successful' : 'Action test failed',
      data: result,
    });
  }
);

// ============================================
// ACTION TEMPLATES CONTROLLERS
// ============================================

/**
 * Get all action templates
 * GET /api/v1/action-templates
 */
export const getActionTemplates = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const category = req.query.category as string | undefined;

    const templates = await handleGetActionTemplates(category);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Action templates fetched successfully',
      data: templates,
      count: templates.length,
    });
  }
);

/**
 * Create an action template (admin only)
 * POST /api/v1/action-templates
 */
export const createActionTemplate = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const input: CreateTemplateInput = {
      name: req.body.name,
      category: req.body.category,
      displayName: req.body.displayName,
      description: req.body.description,
      iconUrl: req.body.iconUrl,
      templateConfig: req.body.templateConfig,
      requiredFields: req.body.requiredFields,
      isPublic: req.body.isPublic,
    };

    const template = await handleCreateActionTemplate(input);

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Action template created successfully',
      data: template,
    });
  }
);
