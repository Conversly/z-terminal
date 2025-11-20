# Custom Actions API Documentation

## Overview

The Custom Actions feature allows users to create dynamic, configurable API integrations for their chatbots. These actions can be called by the LLM during conversations to fetch or send data to external services.

## Architecture

```
User (Frontend) 
    ↓ (Create/Edit Action)
API Layer (Router → Controller → Service)
    ↓ (Validate & Store)
Database (PostgreSQL with Drizzle ORM)
    ↓ (Load at Runtime)
Tool Factory
    ↓ (Convert to Executable Tool)
Graph Engine (LangGraph)
    ↓ (LLM decides when to call)
Tool Execution
    ↓ (HTTP Request)
External API
```

## Key Features

- ✅ **Dynamic Tool Creation**: Actions are loaded at runtime and converted to tools
- ✅ **LLM-Driven**: The AI decides when to use each tool based on descriptions
- ✅ **Type Safety**: Strong validation at every layer using Yup schemas
- ✅ **Auto-Testing**: Actions are tested before saving
- ✅ **Version Control**: Actions are versioned on updates
- ✅ **Template System**: Pre-built templates for common integrations
- ✅ **Security**: Input validation, chatbot ownership checks, encrypted secrets

## Database Schema

### Custom Actions Table
```typescript
{
  id: string;                    // Primary key (CUID)
  chatbotId: string;             // Foreign key to chatbots table
  name: string;                  // Unique action name (lowercase, underscores)
  displayName: string;           // Human-readable name
  description: string;           // When and why to use this action
  isEnabled: boolean;            // Can be disabled without deletion
  apiConfig: JSON;               // API configuration (see below)
  toolSchema: JSON;              // JSON Schema for parameters
  version: number;               // Version counter
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;             // User ID who created it
  lastTestedAt: Date;            // Last test timestamp
  testStatus: 'passed' | 'failed' | 'not_tested';
  testResult: JSON;              // Results from last test
}
```

### API Config Structure
```typescript
{
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  base_url: string;              // e.g., "https://api.example.com"
  endpoint: string;              // e.g., "/v1/products/{{product_id}}"
  headers?: {                    // Optional headers
    "Authorization": "Bearer {{api_token}}",
    "Content-Type": "application/json"
  };
  query_params?: {               // Optional query parameters
    "include": "details"
  };
  body_template?: string;        // For POST/PUT/PATCH
  response_mapping?: string;     // JSONPath to extract data
  success_codes?: number[];      // Default: [200, 201]
  timeout_seconds?: number;      // Default: 30
  retry_count?: number;          // Default: 0
  auth_type?: 'none' | 'bearer' | 'api_key' | 'basic';
  auth_value?: string;           // Encrypted token/key
  follow_redirects?: boolean;    // Default: true
  verify_ssl?: boolean;          // Default: true
}
```

### Tool Schema (Parameters)
```typescript
{
  type: 'object',
  properties: {
    product_id: {
      type: 'string',
      description: 'The unique identifier of the product',
      pattern: '^[A-Z0-9-]+$'
    },
    quantity: {
      type: 'integer',
      description: 'Number of items',
      minimum: 1,
      maximum: 1000,
      default: 1
    }
  },
  required: ['product_id']
}
```

## API Endpoints

### Base URL
All endpoints are prefixed with `/api/v1/actions`

### Custom Actions

#### 1. Create Custom Action
```http
POST /chatbots/:chatbotId/actions
Authorization: Bearer <token>
Content-Type: application/json

{
  "chatbotId": "clxxx...",
  "name": "get_product_price",
  "displayName": "Get Product Price",
  "description": "Fetches the current price for a product by its ID. Use this when a customer asks about product pricing.",
  "apiConfig": {
    "method": "GET",
    "base_url": "https://api.example.com",
    "endpoint": "/v1/products/{{product_id}}/price",
    "headers": {
      "Authorization": "Bearer sk_test_xxx"
    },
    "success_codes": [200],
    "timeout_seconds": 30
  },
  "parameters": [
    {
      "name": "product_id",
      "type": "string",
      "description": "The unique identifier of the product",
      "required": true
    }
  ]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Custom action created successfully",
  "data": {
    "id": "clyyy...",
    "chatbotId": "clxxx...",
    "name": "get_product_price",
    "displayName": "Get Product Price",
    "description": "Fetches the current price...",
    "isEnabled": true,
    "apiConfig": { ... },
    "parameters": [ ... ],
    "version": 1,
    "testStatus": "passed",
    "createdAt": "2025-11-20T10:30:00.000Z"
  }
}
```

#### 2. Get All Actions for a Chatbot
```http
GET /chatbots/:chatbotId/actions?enabled=true
Authorization: Bearer <token>
```

**Query Parameters**:
- `enabled` (optional): Filter by enabled status (`true` or `false`)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Custom actions fetched successfully",
  "data": [
    {
      "id": "clyyy...",
      "name": "get_product_price",
      "displayName": "Get Product Price",
      "isEnabled": true,
      ...
    }
  ],
  "count": 1
}
```

#### 3. Get Single Action
```http
GET /chatbots/:chatbotId/actions/:actionId
Authorization: Bearer <token>
```

**Response (200 OK)**: Same structure as create response

#### 4. Update Action
```http
PUT /chatbots/:chatbotId/actions/:actionId
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "Get Product Price (Updated)",
  "description": "Updated description",
  "apiConfig": { ... },
  "parameters": [ ... ]
}
```

**Note**: Any field can be omitted to keep existing value. Version is auto-incremented.

#### 5. Delete Action
```http
DELETE /chatbots/:chatbotId/actions/:actionId
Authorization: Bearer <token>
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Custom action deleted successfully"
}
```

#### 6. Toggle Action (Enable/Disable)
```http
PATCH /chatbots/:chatbotId/actions/:actionId/toggle
Authorization: Bearer <token>
Content-Type: application/json

{
  "isEnabled": false
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Custom action disabled successfully",
  "data": {
    "isEnabled": false
  }
}
```

#### 7. Test Action
```http
POST /chatbots/:chatbotId/actions/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "config": {
    "method": "GET",
    "base_url": "https://api.example.com",
    "endpoint": "/v1/products/{{product_id}}/price",
    "headers": {
      "Authorization": "Bearer sk_test_xxx"
    }
  },
  "testParameters": {
    "product_id": "PROD-123"
  }
}
```

**Response (200 OK / 400 Bad Request)**:
```json
{
  "success": true,
  "message": "Action test successful",
  "data": {
    "success": true,
    "statusCode": 200,
    "responseBody": "{\"price\": 99.99, \"currency\": \"USD\"}",
    "responseTime": 245,
    "requestUrl": "https://api.example.com/v1/products/PROD-123/price",
    "extractedData": {
      "price": 99.99,
      "currency": "USD"
    }
  }
}
```

### Action Templates

#### 8. Get Action Templates
```http
GET /action-templates?category=ecommerce
Authorization: Bearer <token>
```

**Query Parameters**:
- `category` (optional): Filter by category

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Action templates fetched successfully",
  "data": [
    {
      "id": "clzzz...",
      "name": "shopify_get_product",
      "category": "ecommerce",
      "displayName": "Shopify: Get Product",
      "description": "Fetch product details from Shopify store",
      "iconUrl": "https://...",
      "templateConfig": {
        "method": "GET",
        "base_url": "https://{store_name}.myshopify.com",
        "endpoint": "/admin/api/2024-01/products/{{product_id}}.json"
      },
      "requiredFields": ["store_name", "api_token"],
      "usageCount": 42
    }
  ],
  "count": 1
}
```

#### 9. Create Action Template (Admin Only)
```http
POST /action-templates
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "stripe_create_payment",
  "category": "payments",
  "displayName": "Stripe: Create Payment Intent",
  "description": "Create a payment intent in Stripe",
  "templateConfig": {
    "method": "POST",
    "base_url": "https://api.stripe.com",
    "endpoint": "/v1/payment_intents"
  },
  "requiredFields": ["api_key"],
  "isPublic": true
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request format",
  "details": "name must contain only lowercase letters, numbers, and underscores"
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to modify this chatbot"
}
```

### 404 Not Found
```json
{
  "error": "Action not found"
}
```

### 409 Conflict
```json
{
  "error": "Action with name \"get_product_price\" already exists for this chatbot"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create custom action"
}
```

## Validation Rules

### Action Name
- Required
- 3-100 characters
- Only lowercase letters, numbers, and underscores
- Must be unique per chatbot

### Display Name
- Required
- 3-200 characters

### Description
- Required
- 20-1000 characters
- Should describe when and why to use the action

### Parameters
- At least 1 parameter required
- Parameter names must be lowercase with underscores
- Description must be at least 10 characters

### API Config
- `method`: Must be GET, POST, PUT, DELETE, or PATCH
- `base_url`: Must be a valid URL
- `endpoint`: Required, can contain {{variables}}
- `timeout_seconds`: 1-300 seconds
- `retry_count`: 0-5 retries

## Template Variables

Use `{{variable_name}}` in the following fields:
- `endpoint`
- `headers` values
- `query_params` values
- `body_template`

Example:
```json
{
  "endpoint": "/users/{{user_id}}/orders/{{order_id}}",
  "headers": {
    "Authorization": "Bearer {{api_token}}"
  },
  "body_template": "{\"quantity\": {{quantity}}, \"user_id\": \"{{user_id}}\"}"
}
```

## Security Considerations

1. **Authentication**: All endpoints require JWT authentication
2. **Authorization**: Users can only access actions for chatbots they own
3. **Validation**: Comprehensive input validation using Yup schemas
4. **Secrets**: API tokens should be encrypted before storage (TODO: implement encryption)
5. **Rate Limiting**: Implement rate limiting to prevent abuse (TODO)
6. **SSL Verification**: Enabled by default, can be disabled for testing

## Frontend Integration Examples

### Create Action Form
```typescript
const createAction = async (chatbotId: string, data: CreateActionData) => {
  const response = await fetch(`/api/v1/actions/chatbots/${chatbotId}/actions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  return response.json();
};
```

### Test Before Save
```typescript
const testAction = async (chatbotId: string, config: ApiConfig, params: Record<string, any>) => {
  const response = await fetch(`/api/v1/actions/chatbots/${chatbotId}/actions/test`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      config,
      testParameters: params
    })
  });
  
  return response.json();
};
```

## Example Use Cases

### 1. E-commerce: Get Product Price
```json
{
  "name": "get_product_price",
  "displayName": "Get Product Price",
  "description": "Fetches current price for a product. Use when customer asks about pricing.",
  "apiConfig": {
    "method": "GET",
    "base_url": "https://api.store.com",
    "endpoint": "/products/{{product_id}}/price",
    "response_mapping": "$.data.price"
  },
  "parameters": [
    {
      "name": "product_id",
      "type": "string",
      "description": "Product SKU or ID",
      "required": true
    }
  ]
}
```

### 2. CRM: Create Lead
```json
{
  "name": "create_lead",
  "displayName": "Create CRM Lead",
  "description": "Creates a new lead in the CRM system when a customer shows interest.",
  "apiConfig": {
    "method": "POST",
    "base_url": "https://api.crm.com",
    "endpoint": "/v1/leads",
    "headers": {
      "Authorization": "Bearer {{api_key}}",
      "Content-Type": "application/json"
    },
    "body_template": "{\"name\": \"{{name}}\", \"email\": \"{{email}}\", \"source\": \"chatbot\"}"
  },
  "parameters": [
    {
      "name": "name",
      "type": "string",
      "description": "Customer's full name",
      "required": true
    },
    {
      "name": "email",
      "type": "string",
      "description": "Customer's email address",
      "required": true
    }
  ]
}
```

### 3. Support: Get Ticket Status
```json
{
  "name": "get_ticket_status",
  "displayName": "Get Support Ticket Status",
  "description": "Retrieves the current status of a support ticket by ticket number.",
  "apiConfig": {
    "method": "GET",
    "base_url": "https://support.example.com",
    "endpoint": "/api/tickets/{{ticket_id}}",
    "headers": {
      "X-API-Key": "{{api_key}}"
    },
    "response_mapping": "$.ticket.status"
  },
  "parameters": [
    {
      "name": "ticket_id",
      "type": "string",
      "description": "The support ticket ID or number",
      "required": true,
      "pattern": "^TICK-[0-9]+$"
    }
  ]
}
```

## Testing

Run tests with:
```bash
npm test src/api/actions
```

## TODO / Future Enhancements

- [ ] Implement secret encryption for API tokens
- [ ] Add rate limiting per action
- [ ] Add action execution logs endpoint
- [ ] Add analytics for action usage
- [ ] Support for OAuth2 authentication flow
- [ ] Add webhook support for async actions
- [ ] Support for batch operations
- [ ] Add action execution history/audit log
- [ ] Implement action marketplace
- [ ] Add action versioning with rollback capability
