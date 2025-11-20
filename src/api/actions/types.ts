export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type AuthType = 'none' | 'bearer' | 'api_key' | 'basic';
export type TestStatus = 'passed' | 'failed' | 'not_tested';

export interface CustomActionConfig {
  method: HttpMethod;
  base_url: string;
  endpoint: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body_template?: string;
  response_mapping?: string;
  success_codes?: number[];
  timeout_seconds?: number;
  retry_count?: number;
  auth_type?: AuthType;
  auth_value?: string;
  follow_redirects?: boolean;
  verify_ssl?: boolean;
}

export type ParameterType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

export interface ToolParameter {
  name: string;
  type: ParameterType;
  description: string;
  required?: boolean;
  default?: string;
  enum?: string[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  min_length?: number;
  max_length?: number;
}

// ============================================
// Custom Action Types
// ============================================
export interface CustomAction {
  id: string;
  chatbotId: string;
  name: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
  apiConfig: CustomActionConfig;
  toolSchema: ToolSchema;
  version: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string | null;
  lastTestedAt: Date | null;
  testStatus: TestStatus | null;
  testResult?: Record<string, any> | null;
}

export interface ToolSchema {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
}

// ============================================
// Request/Response Types
// ============================================
export interface CreateCustomActionInput {
  chatbotId: string;
  name: string;
  displayName: string;
  description: string;
  apiConfig: CustomActionConfig;
  parameters: ToolParameter[];
}

export interface UpdateCustomActionInput {
  name?: string;
  displayName?: string;
  description?: string;
  apiConfig?: CustomActionConfig;
  parameters?: ToolParameter[];
}

export interface TestActionInput {
  config: CustomActionConfig;
  testParameters?: Record<string, any>;
}

export interface TestActionResponse {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  responseTime?: number;
  error?: string;
  requestUrl?: string;
  extractedData?: any;
}

export interface CustomActionResponse {
  id: string;
  chatbotId: string;
  name: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
  apiConfig: CustomActionConfig;
  parameters: ToolParameter[];
  version: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastTestedAt: Date | null;
  testStatus: TestStatus | null;
}

export interface ToggleActionInput {
  isEnabled: boolean;
}

// ============================================
// Action Template Types
// ============================================
export interface ActionTemplate {
  id: string;
  name: string;
  category: string;
  displayName: string;
  description: string;
  iconUrl: string | null;
  templateConfig: Record<string, any>;
  requiredFields: string[];
  isPublic: boolean;
  usageCount: number;
  createdAt: Date | null;
}

export interface CreateTemplateInput {
  name: string;
  category: string;
  displayName: string;
  description: string;
  iconUrl?: string;
  templateConfig: Record<string, any>;
  requiredFields: string[];
  isPublic?: boolean;
}

// ============================================
// Query Parameters
// ============================================
export interface GetActionsQuery {
  enabled?: boolean;
}

export interface GetLogsQuery {
  limit?: number;
  onlyFailed?: boolean;
}

export interface GetTemplatesQuery {
  category?: string;
}
