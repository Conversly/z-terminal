import * as yup from 'yup';

// ============================================
// API Configuration Schema
// ============================================
const apiConfigSchema = yup.object().shape({
  method: yup.string()
    .oneOf(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    .required('HTTP method is required'),
  base_url: yup.string()
    .url('Base URL must be a valid URL')
    .required('Base URL is required'),
  endpoint: yup.string()
    .required('Endpoint is required')
    .min(1, 'Endpoint must not be empty'),
  headers: yup.object()
    .optional()
    .default({}),
  query_params: yup.object()
    .optional()
    .default({}),
  body_template: yup.string()
    .optional(),
  response_mapping: yup.string()
    .optional(),
  success_codes: yup.array()
    .of(yup.number())
    .optional()
    .default([200, 201]),
  timeout_seconds: yup.number()
    .min(1, 'Timeout must be at least 1 second')
    .max(300, 'Timeout cannot exceed 300 seconds')
    .optional()
    .default(30),
  retry_count: yup.number()
    .min(0)
    .max(5, 'Retry count cannot exceed 5')
    .optional()
    .default(0),
  auth_type: yup.string()
    .oneOf(['none', 'bearer', 'api_key', 'basic'])
    .optional()
    .default('none'),
  auth_value: yup.string()
    .optional(),
  follow_redirects: yup.boolean()
    .optional()
    .default(true),
  verify_ssl: yup.boolean()
    .optional()
    .default(true),
});

// ============================================
// Tool Parameter Schema
// ============================================
const toolParameterSchema = yup.object().shape({
  name: yup.string()
    .required('Parameter name is required')
    .matches(/^[a-z0-9_]+$/, 'Parameter name must contain only lowercase letters, numbers, and underscores'),
  type: yup.string()
    .oneOf(['string', 'number', 'integer', 'boolean', 'array', 'object'])
    .required('Parameter type is required'),
  description: yup.string()
    .required('Parameter description is required')
    .min(10, 'Description must be at least 10 characters'),
  required: yup.boolean()
    .optional()
    .default(false),
  default: yup.string()
    .optional(),
  enum: yup.array()
    .of(yup.string())
    .optional(),
  pattern: yup.string()
    .optional(),
  minimum: yup.number()
    .optional(),
  maximum: yup.number()
    .optional(),
  min_length: yup.number()
    .optional(),
  max_length: yup.number()
    .optional(),
});

// ============================================
// Create Custom Action Schema
// ============================================
export const createCustomActionSchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
  name: yup.string()
    .required('Action name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .matches(/^[a-z0-9_]+$/, 'Name must contain only lowercase letters, numbers, and underscores'),
  displayName: yup.string()
    .required('Display name is required')
    .min(3, 'Display name must be at least 3 characters')
    .max(200, 'Display name cannot exceed 200 characters'),
  description: yup.string()
    .required('Description is required')
    .min(20, 'Description must be at least 20 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  apiConfig: apiConfigSchema.required('API configuration is required'),
  parameters: yup.array()
    .of(toolParameterSchema)
    .min(1, 'At least one parameter is required')
    .required('Parameters are required'),
});

// ============================================
// Get Custom Actions Schema
// ============================================
export const getCustomActionsSchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
  enabled: yup.boolean()
    .optional(),
});

// ============================================
// Get Custom Action Schema
// ============================================
export const getCustomActionSchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
  actionId: yup.string()
    .required('Action ID is required'),
});

// ============================================
// Update Custom Action Schema
// ============================================
export const updateCustomActionSchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
  actionId: yup.string()
    .required('Action ID is required'),
  name: yup.string()
    .optional()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .matches(/^[a-z0-9_]+$/, 'Name must contain only lowercase letters, numbers, and underscores'),
  displayName: yup.string()
    .optional()
    .min(3, 'Display name must be at least 3 characters')
    .max(200, 'Display name cannot exceed 200 characters'),
  description: yup.string()
    .optional()
    .min(20, 'Description must be at least 20 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  apiConfig: apiConfigSchema.optional(),
  parameters: yup.array()
    .of(toolParameterSchema)
    .optional(),
});

// ============================================
// Delete Custom Action Schema
// ============================================
export const deleteCustomActionSchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
  actionId: yup.string()
    .required('Action ID is required'),
});

// ============================================
// Toggle Action Schema
// ============================================
export const toggleActionSchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
  actionId: yup.string()
    .required('Action ID is required'),
  isEnabled: yup.boolean()
    .required('isEnabled is required'),
});

// ============================================
// Test Action Schema
// ============================================
export const testActionSchema = yup.object().shape({
  chatbotId: yup.string()
    .required('Chatbot ID is required'),
  config: apiConfigSchema.required('API configuration is required'),
  testParameters: yup.object()
    .optional()
    .default({}),
});

// ============================================
// Query Parameter Schemas
// ============================================
export const getTemplatesQuerySchema = yup.object().shape({
  category: yup.string()
    .optional(),
});

// ============================================
// Action Template Schema
// ============================================
export const createTemplateSchema = yup.object().shape({
  name: yup.string()
    .required('Template name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  category: yup.string()
    .required('Category is required')
    .max(50, 'Category cannot exceed 50 characters'),
  displayName: yup.string()
    .required('Display name is required')
    .min(3, 'Display name must be at least 3 characters')
    .max(200, 'Display name cannot exceed 200 characters'),
  description: yup.string()
    .required('Description is required')
    .min(20, 'Description must be at least 20 characters'),
  iconUrl: yup.string()
    .url('Icon URL must be a valid URL')
    .optional(),
  templateConfig: yup.object()
    .required('Template configuration is required'),
  requiredFields: yup.array()
    .of(yup.string())
    .required('Required fields are required'),
  isPublic: yup.boolean()
    .optional()
    .default(true),
});
