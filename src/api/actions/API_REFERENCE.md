# Custom Actions API - Quick Reference

## 🎯 Simplified Routes

All routes use **POST** requests with data in the **request body** for easier debugging and consistency.

Base URL: `/api/v1/actions`

---

## 📝 Custom Actions

### 1. Create Action
```http
POST /api/v1/actions/create
```

**Request Body:**
```json
{
  "chatbotId": "clxxx...",
  "name": "get_product_price",
  "displayName": "Get Product Price",
  "description": "Fetches the current price for a product by its ID",
  "apiConfig": {
    "method": "GET",
    "base_url": "https://api.example.com",
    "endpoint": "/products/{{product_id}}/price",
    "headers": {
      "Authorization": "Bearer sk_xxx"
    }
  },
  "parameters": [
    {
      "name": "product_id",
      "type": "string",
      "description": "Product identifier",
      "required": true
    }
  ]
}
```

---

### 2. List Actions
```http
POST /api/v1/actions/list
```

**Request Body:**
```json
{
  "chatbotId": "clxxx...",
  "enabled": true  // optional: filter by enabled status
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom actions fetched successfully",
  "data": [ /* array of actions */ ],
  "count": 5
}
```

---

### 3. Get Single Action
```http
POST /api/v1/actions/get
```

**Request Body:**
```json
{
  "chatbotId": "clxxx...",
  "actionId": "clyyy..."
}
```

---

### 4. Update Action
```http
POST /api/v1/actions/update
```

**Request Body:**
```json
{
  "chatbotId": "clxxx...",
  "actionId": "clyyy...",
  "displayName": "Updated Display Name",  // optional
  "description": "Updated description",    // optional
  "apiConfig": { /* updated config */ },   // optional
  "parameters": [ /* updated params */ ]   // optional
}
```

**Note:** Only include fields you want to update. Omitted fields remain unchanged.

---

### 5. Delete Action
```http
POST /api/v1/actions/delete
```

**Request Body:**
```json
{
  "chatbotId": "clxxx...",
  "actionId": "clyyy..."
}
```

---

### 6. Toggle Action (Enable/Disable)
```http
POST /api/v1/actions/toggle
```

**Request Body:**
```json
{
  "chatbotId": "clxxx...",
  "actionId": "clyyy...",
  "isEnabled": false
}
```

---

### 7. Test Action
```http
POST /api/v1/actions/test
```

**Request Body:**
```json
{
  "chatbotId": "clxxx...",
  "config": {
    "method": "GET",
    "base_url": "https://api.example.com",
    "endpoint": "/products/{{product_id}}/price",
    "headers": {
      "Authorization": "Bearer sk_xxx"
    }
  },
  "testParameters": {
    "product_id": "PROD-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Action test successful",
  "data": {
    "success": true,
    "statusCode": 200,
    "responseBody": "{\"price\": 99.99}",
    "responseTime": 245,
    "requestUrl": "https://api.example.com/products/PROD-123/price"
  }
}
```

---

## 📋 Action Templates

### 8. Get Templates
```http
GET /api/v1/actions/templates?category=ecommerce
```

**Query Parameters:**
- `category` (optional): Filter by category

---

### 9. Create Template (Admin)
```http
POST /api/v1/actions/templates/create
```

**Request Body:**
```json
{
  "name": "shopify_get_product",
  "category": "ecommerce",
  "displayName": "Shopify: Get Product",
  "description": "Fetch product details from Shopify",
  "templateConfig": {
    "method": "GET",
    "base_url": "https://{store_name}.myshopify.com",
    "endpoint": "/admin/api/2024-01/products/{{product_id}}.json"
  },
  "requiredFields": ["store_name", "api_token"]
}
```

---

## 🔑 Authentication

All endpoints require JWT authentication:

```http
Authorization: Bearer <your-jwt-token>
```

---

## ✅ Benefits of This Approach

1. **Consistent** - All mutations use POST
2. **Debuggable** - Easy to copy/paste request bodies
3. **Simple URLs** - No complex nested paths
4. **Flexible** - Easy to add new fields without route changes
5. **Safe** - No ID exposure in URLs (better security)
6. **Testable** - Easier to test with tools like Postman

---

## 🚀 Example with cURL

### Create Action
```bash
curl -X POST http://localhost:3000/api/v1/actions/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatbotId": "clxxx",
    "name": "get_weather",
    "displayName": "Get Weather",
    "description": "Fetches weather data for a given city",
    "apiConfig": {
      "method": "GET",
      "base_url": "https://api.weather.com",
      "endpoint": "/v1/weather/{{city}}"
    },
    "parameters": [{
      "name": "city",
      "type": "string",
      "description": "City name",
      "required": true
    }]
  }'
```

### List Actions
```bash
curl -X POST http://localhost:3000/api/v1/actions/list \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatbotId": "clxxx",
    "enabled": true
  }'
```

### Delete Action
```bash
curl -X POST http://localhost:3000/api/v1/actions/delete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatbotId": "clxxx",
    "actionId": "clyyy"
  }'
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* result data */ }
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## 🎨 Frontend Example (JavaScript/TypeScript)

```typescript
// actions-api.ts
const API_BASE = '/api/v1/actions';

export const actionsAPI = {
  // Create action
  create: async (data: CreateActionData) => {
    const res = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // List actions
  list: async (chatbotId: string, enabledOnly = false) => {
    const res = await fetch(`${API_BASE}/list`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatbotId, enabled: enabledOnly })
    });
    return res.json();
  },

  // Get single action
  get: async (chatbotId: string, actionId: string) => {
    const res = await fetch(`${API_BASE}/get`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatbotId, actionId })
    });
    return res.json();
  },

  // Update action
  update: async (chatbotId: string, actionId: string, updates: Partial<ActionData>) => {
    const res = await fetch(`${API_BASE}/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatbotId, actionId, ...updates })
    });
    return res.json();
  },

  // Delete action
  delete: async (chatbotId: string, actionId: string) => {
    const res = await fetch(`${API_BASE}/delete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatbotId, actionId })
    });
    return res.json();
  },

  // Toggle action
  toggle: async (chatbotId: string, actionId: string, isEnabled: boolean) => {
    const res = await fetch(`${API_BASE}/toggle`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatbotId, actionId, isEnabled })
    });
    return res.json();
  },

  // Test action
  test: async (chatbotId: string, config: ApiConfig, testParams: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        chatbotId, 
        config, 
        testParameters: testParams 
      })
    });
    return res.json();
  }
};
```

---

## 🎯 Summary

All routes are now **simple and consistent**:
- ✅ All use POST (except GET /templates)
- ✅ All IDs in request body
- ✅ No complex nested URLs
- ✅ Easy to debug and test
- ✅ Consistent error handling
