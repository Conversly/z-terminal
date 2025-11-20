import httpStatus from 'http-status';
import ApiError from '../../utils/apiError';
import logger from '../../loaders/logger';
import { db } from '../../loaders/postgres';
import { customActions, actionTemplates, chatBots } from '../../drizzle/schema';
import {
  CreateCustomActionInput,
  UpdateCustomActionInput,
  CustomActionResponse,
  TestActionInput,
  TestActionResponse,
  ToolParameter,
  ToolSchema,
  ActionTemplate,
  CreateTemplateInput,
  CustomAction,
  CustomActionConfig,
} from './types';
import { eq, and, desc, sql } from 'drizzle-orm';
import axios, { AxiosRequestConfig } from 'axios';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate JSON Schema from parameters
 */
function generateToolSchema(parameters: ToolParameter[]): ToolSchema {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const param of parameters) {
    const propSchema: Record<string, any> = {
      type: param.type,
      description: param.description,
    };

    if (param.enum && param.enum.length > 0) {
      propSchema.enum = param.enum;
    }
    if (param.default) {
      propSchema.default = param.default;
    }
    if (param.pattern) {
      propSchema.pattern = param.pattern;
    }
    if (param.minimum !== undefined) {
      propSchema.minimum = param.minimum;
    }
    if (param.maximum !== undefined) {
      propSchema.maximum = param.maximum;
    }
    if (param.min_length !== undefined) {
      propSchema.minLength = param.min_length;
    }
    if (param.max_length !== undefined) {
      propSchema.maxLength = param.max_length;
    }

    properties[param.name] = propSchema;

    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: 'object',
    properties,
    required,
  };
}

/**
 * Parse tool schema back to parameters
 */
function parseToolSchemaToParameters(toolSchema: ToolSchema): ToolParameter[] {
  const parameters: ToolParameter[] = [];
  const { properties, required = [] } = toolSchema;

  for (const [name, prop] of Object.entries(properties)) {
    const parameter: ToolParameter = {
      name,
      type: prop.type,
      description: prop.description || '',
      required: required.includes(name),
    };

    if (prop.default !== undefined) {
      parameter.default = String(prop.default);
    }
    if (prop.enum) {
      parameter.enum = prop.enum;
    }
    if (prop.pattern) {
      parameter.pattern = prop.pattern;
    }
    if (prop.minimum !== undefined) {
      parameter.minimum = prop.minimum;
    }
    if (prop.maximum !== undefined) {
      parameter.maximum = prop.maximum;
    }
    if (prop.minLength !== undefined) {
      parameter.min_length = prop.minLength;
    }
    if (prop.maxLength !== undefined) {
      parameter.max_length = prop.maxLength;
    }

    parameters.push(parameter);
  }

  return parameters;
}

/**
 * Validate chatbot ownership
 */
async function validateChatbotOwnership(userId: string, chatbotId: string): Promise<boolean> {
  try {
    const [chatbot] = await db
      .select({ userId: chatBots.userId })
      .from(chatBots)
      .where(eq(chatBots.id, chatbotId))
      .limit(1);

    return chatbot?.userId === userId;
  } catch (error) {
    logger.error('Error validating chatbot ownership:', error);
    return false;
  }
}

/**
 * Replace template variables in a string
 */
function replaceTemplateVariables(template: string, params: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

/**
 * Test an action by making the HTTP request
 */
async function testActionExecution(
  config: CustomActionConfig,
  testParams: Record<string, any> = {}
): Promise<TestActionResponse> {
  const startTime = Date.now();

  try {
    // Build the request URL
    const endpoint = replaceTemplateVariables(config.endpoint, testParams);
    const requestUrl = `${config.base_url}${endpoint}`;

    // Build headers
    const headers: Record<string, string> = { ...config.headers };

    // Add authentication
    if (config.auth_type === 'bearer' && config.auth_value) {
      headers['Authorization'] = `Bearer ${config.auth_value}`;
    } else if (config.auth_type === 'api_key' && config.auth_value) {
      headers['X-API-Key'] = config.auth_value;
    } else if (config.auth_type === 'basic' && config.auth_value) {
      headers['Authorization'] = `Basic ${config.auth_value}`;
    }

    // Replace template variables in headers
    for (const [key, value] of Object.entries(headers)) {
      headers[key] = replaceTemplateVariables(value, testParams);
    }

    // Build query parameters
    const queryParams: Record<string, string> = {};
    if (config.query_params) {
      for (const [key, value] of Object.entries(config.query_params)) {
        queryParams[key] = replaceTemplateVariables(value, testParams);
      }
    }

    // Build request body
    let requestBody: any = undefined;
    if (config.body_template && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      const bodyString = replaceTemplateVariables(config.body_template, testParams);
      try {
        requestBody = JSON.parse(bodyString);
      } catch {
        requestBody = bodyString;
      }
    }

    // Make the HTTP request
    const axiosConfig: AxiosRequestConfig = {
      method: config.method,
      url: requestUrl,
      headers,
      params: queryParams,
      data: requestBody,
      timeout: (config.timeout_seconds || 30) * 1000,
      validateStatus: (status) => {
        const successCodes = config.success_codes || [200, 201];
        return successCodes.includes(status);
      },
      maxRedirects: config.follow_redirects ? 5 : 0,
    };

    const response = await axios(axiosConfig);
    const responseTime = Date.now() - startTime;

    // Extract data if response mapping is provided
    let extractedData = response.data;
    if (config.response_mapping && typeof response.data === 'object') {
      try {
        // Simple JSONPath-like extraction (e.g., "$.data.price")
        const path = config.response_mapping.replace(/^\$\./, '').split('.');
        extractedData = path.reduce((obj, key) => obj?.[key], response.data);
      } catch (error) {
        logger.warn('Failed to extract data using response_mapping:', error);
      }
    }

    return {
      success: true,
      statusCode: response.status,
      responseBody: JSON.stringify(response.data),
      responseTime,
      requestUrl,
      extractedData,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      statusCode: error.response?.status,
      responseBody: error.response?.data ? JSON.stringify(error.response.data) : undefined,
      responseTime,
      error: error.message,
      requestUrl: `${config.base_url}${config.endpoint}`,
    };
  }
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Create a custom action
 */
export async function handleCreateCustomAction(
  userId: string,
  input: CreateCustomActionInput
): Promise<CustomActionResponse> {
  try {
    // Validate chatbot ownership
    const hasAccess = await validateChatbotOwnership(userId, input.chatbotId);
    if (!hasAccess) {
      throw new ApiError('You do not have permission to modify this chatbot', httpStatus.FORBIDDEN);
    }

    // Check if action name already exists for this chatbot
    const existing = await db
      .select({ id: customActions.id })
      .from(customActions)
      .where(
        and(
          eq(customActions.chatbotId, input.chatbotId),
          eq(customActions.name, input.name)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ApiError(
        `Action with name "${input.name}" already exists for this chatbot`,
        httpStatus.CONFLICT
      );
    }

    // Test the action before saving
    const testResult = await testActionExecution(input.apiConfig, {});
    
    if (!testResult.success) {
      logger.warn('Action test failed during creation', {
        chatbotId: input.chatbotId,
        actionName: input.name,
        error: testResult.error,
      });
    }

    // Generate tool schema
    const toolSchema = generateToolSchema(input.parameters);

    // Create the action
    const [action] = await db
      .insert(customActions)
      .values({
        chatbotId: input.chatbotId,
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        apiConfig: input.apiConfig as any,
        toolSchema: toolSchema as any,
        createdBy: userId,
        lastTestedAt: new Date(),
        testStatus: testResult.success ? 'passed' : 'failed',
        testResult: testResult as any,
      })
      .returning();

    logger.info('Custom action created', {
      actionId: action.id,
      chatbotId: input.chatbotId,
      actionName: input.name,
      testStatus: action.testStatus,
    });

    return {
      id: action.id,
      chatbotId: action.chatbotId,
      name: action.name,
      displayName: action.displayName,
      description: action.description,
      isEnabled: action.isEnabled,
      apiConfig: action.apiConfig as CustomActionConfig,
      parameters: input.parameters,
      version: action.version,
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
      lastTestedAt: action.lastTestedAt,
      testStatus: action.testStatus,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error creating custom action:', error);
    throw new ApiError('Failed to create custom action', httpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Get all actions for a chatbot
 */
export async function handleGetCustomActions(
  userId: string,
  chatbotId: string,
  enabledOnly: boolean = false
): Promise<CustomActionResponse[]> {
  try {
    // Validate chatbot ownership
    const hasAccess = await validateChatbotOwnership(userId, chatbotId);
    if (!hasAccess) {
      throw new ApiError('You do not have permission to access this chatbot', httpStatus.FORBIDDEN);
    }

    const conditions = enabledOnly
      ? and(eq(customActions.chatbotId, chatbotId), eq(customActions.isEnabled, true))
      : eq(customActions.chatbotId, chatbotId);

    const actions = await db
      .select()
      .from(customActions)
      .where(conditions)
      .orderBy(desc(customActions.createdAt));

    return actions.map((action) => ({
      id: action.id,
      chatbotId: action.chatbotId,
      name: action.name,
      displayName: action.displayName,
      description: action.description,
      isEnabled: action.isEnabled,
      apiConfig: action.apiConfig as CustomActionConfig,
      parameters: parseToolSchemaToParameters(action.toolSchema as ToolSchema),
      version: action.version,
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
      lastTestedAt: action.lastTestedAt,
      testStatus: action.testStatus,
    }));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching custom actions:', error);
    throw new ApiError('Failed to fetch custom actions', httpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Get a single action
 */
export async function handleGetCustomAction(
  userId: string,
  chatbotId: string,
  actionId: string
): Promise<CustomActionResponse> {
  try {
    // Validate chatbot ownership
    const hasAccess = await validateChatbotOwnership(userId, chatbotId);
    if (!hasAccess) {
      throw new ApiError('You do not have permission to access this chatbot', httpStatus.FORBIDDEN);
    }

    const [action] = await db
      .select()
      .from(customActions)
      .where(
        and(eq(customActions.id, actionId), eq(customActions.chatbotId, chatbotId))
      )
      .limit(1);

    if (!action) {
      throw new ApiError('Action not found', httpStatus.NOT_FOUND);
    }

    return {
      id: action.id,
      chatbotId: action.chatbotId,
      name: action.name,
      displayName: action.displayName,
      description: action.description,
      isEnabled: action.isEnabled,
      apiConfig: action.apiConfig as CustomActionConfig,
      parameters: parseToolSchemaToParameters(action.toolSchema as ToolSchema),
      version: action.version,
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
      lastTestedAt: action.lastTestedAt,
      testStatus: action.testStatus,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching custom action:', error);
    throw new ApiError('Failed to fetch custom action', httpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Update a custom action
 */
export async function handleUpdateCustomAction(
  userId: string,
  chatbotId: string,
  actionId: string,
  input: UpdateCustomActionInput
): Promise<CustomActionResponse> {
  try {
    // Validate chatbot ownership
    const hasAccess = await validateChatbotOwnership(userId, chatbotId);
    if (!hasAccess) {
      throw new ApiError('You do not have permission to modify this chatbot', httpStatus.FORBIDDEN);
    }

    // Check if action exists
    const [existing] = await db
      .select()
      .from(customActions)
      .where(
        and(eq(customActions.id, actionId), eq(customActions.chatbotId, chatbotId))
      )
      .limit(1);

    if (!existing) {
      throw new ApiError('Action not found', httpStatus.NOT_FOUND);
    }

    // If name is being changed, check for conflicts
    if (input.name && input.name !== existing.name) {
      const [nameConflict] = await db
        .select({ id: customActions.id })
        .from(customActions)
        .where(
          and(
            eq(customActions.chatbotId, chatbotId),
            eq(customActions.name, input.name)
          )
        )
        .limit(1);

      if (nameConflict) {
        throw new ApiError(
          `Action with name "${input.name}" already exists for this chatbot`,
          httpStatus.CONFLICT
        );
      }
    }

    // Prepare update values
    const updateValues: any = {
      updatedAt: new Date(),
    };

    if (input.name) updateValues.name = input.name;
    if (input.displayName) updateValues.displayName = input.displayName;
    if (input.description) updateValues.description = input.description;

    // Test if API config or parameters are being updated
    let testResult: TestActionResponse | null = null;
    if (input.apiConfig || input.parameters) {
      const testConfig = input.apiConfig || (existing.apiConfig as CustomActionConfig);
      testResult = await testActionExecution(testConfig, {});

      if (input.apiConfig) {
        updateValues.apiConfig = input.apiConfig;
      }
      if (input.parameters) {
        updateValues.toolSchema = generateToolSchema(input.parameters);
      }

      updateValues.lastTestedAt = new Date();
      updateValues.testStatus = testResult.success ? 'passed' : 'failed';
      updateValues.testResult = testResult;
      updateValues.version = existing.version + 1;
    }

    // Update the action
    const [updated] = await db
      .update(customActions)
      .set(updateValues)
      .where(
        and(eq(customActions.id, actionId), eq(customActions.chatbotId, chatbotId))
      )
      .returning();

    logger.info('Custom action updated', {
      actionId,
      chatbotId,
      version: updated.version,
    });

    return {
      id: updated.id,
      chatbotId: updated.chatbotId,
      name: updated.name,
      displayName: updated.displayName,
      description: updated.description,
      isEnabled: updated.isEnabled,
      apiConfig: updated.apiConfig as CustomActionConfig,
      parameters: parseToolSchemaToParameters(updated.toolSchema as ToolSchema),
      version: updated.version,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      lastTestedAt: updated.lastTestedAt,
      testStatus: updated.testStatus,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error updating custom action:', error);
    throw new ApiError('Failed to update custom action', httpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Delete a custom action
 */
export async function handleDeleteCustomAction(
  userId: string,
  chatbotId: string,
  actionId: string
): Promise<void> {
  try {
    // Validate chatbot ownership
    const hasAccess = await validateChatbotOwnership(userId, chatbotId);
    if (!hasAccess) {
      throw new ApiError('You do not have permission to modify this chatbot', httpStatus.FORBIDDEN);
    }

    const result = await db
      .delete(customActions)
      .where(
        and(eq(customActions.id, actionId), eq(customActions.chatbotId, chatbotId))
      )
      .returning({ id: customActions.id });

    if (result.length === 0) {
      throw new ApiError('Action not found', httpStatus.NOT_FOUND);
    }

    logger.info('Custom action deleted', {
      actionId,
      chatbotId,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error deleting custom action:', error);
    throw new ApiError('Failed to delete custom action', httpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Toggle action enabled/disabled
 */
export async function handleToggleCustomAction(
  userId: string,
  chatbotId: string,
  actionId: string,
  isEnabled: boolean
): Promise<void> {
  try {
    // Validate chatbot ownership
    const hasAccess = await validateChatbotOwnership(userId, chatbotId);
    if (!hasAccess) {
      throw new ApiError('You do not have permission to modify this chatbot', httpStatus.FORBIDDEN);
    }

    const result = await db
      .update(customActions)
      .set({ isEnabled, updatedAt: new Date() })
      .where(
        and(eq(customActions.id, actionId), eq(customActions.chatbotId, chatbotId))
      )
      .returning({ id: customActions.id });

    if (result.length === 0) {
      throw new ApiError('Action not found', httpStatus.NOT_FOUND);
    }

    logger.info('Custom action toggled', {
      actionId,
      chatbotId,
      isEnabled,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error toggling custom action:', error);
    throw new ApiError('Failed to toggle custom action', httpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Test an action
 */
export async function handleTestAction(
  userId: string,
  chatbotId: string,
  input: TestActionInput
): Promise<TestActionResponse> {
  try {
    // Validate chatbot ownership
    const hasAccess = await validateChatbotOwnership(userId, chatbotId);
    if (!hasAccess) {
      throw new ApiError('You do not have permission to access this chatbot', httpStatus.FORBIDDEN);
    }

    return await testActionExecution(input.config, input.testParameters || {});
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error testing action:', error);
    throw new ApiError('Failed to test action', httpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Get action templates
 */
export async function handleGetActionTemplates(
  category?: string
): Promise<ActionTemplate[]> {
  try {
    const query = category
      ? db.select().from(actionTemplates).where(eq(actionTemplates.category, category))
      : db.select().from(actionTemplates);

    const templates = await query.orderBy(desc(actionTemplates.usageCount));

    return templates.map(t => ({
      ...t,
      templateConfig: t.templateConfig as Record<string, any>,
    }));
  } catch (error) {
    logger.error('Error fetching action templates:', error);
    throw new ApiError('Failed to fetch action templates', httpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Create action template (admin only)
 */
export async function handleCreateActionTemplate(
  input: CreateTemplateInput
): Promise<ActionTemplate> {
  try {
    const [template] = await db
      .insert(actionTemplates)
      .values({
        name: input.name,
        category: input.category,
        displayName: input.displayName,
        description: input.description,
        iconUrl: input.iconUrl || null,
        templateConfig: input.templateConfig as any,
        requiredFields: input.requiredFields,
        isPublic: input.isPublic ?? true,
      })
      .returning();

    logger.info('Action template created', {
      templateId: template.id,
      templateName: template.name,
    });

    return {
      ...template,
      templateConfig: template.templateConfig as Record<string, any>,
    };
  } catch (error) {
    logger.error('Error creating action template:', error);
    throw new ApiError('Failed to create action template', httpStatus.INTERNAL_SERVER_ERROR);
  }
}
