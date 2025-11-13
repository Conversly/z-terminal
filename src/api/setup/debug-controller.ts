import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import { jwtReq } from '../../types';
import { getKeyRotationManager } from '../../shared/apiKeyRotationManager';

export const getKeyRotationStats = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const keyManager = getKeyRotationManager();
    const stats = keyManager.getStats();

    res.status(httpStatus.OK).json({
      success: true,
      message: 'API key rotation stats',
      data: {
        stats,
        availableKeys: keyManager.getAvailableKeyCount(),
        currentKey: keyManager.getCurrentKey()?.substring(0, 20) + '...',
      },
    });
  }
);

export const testApiKey = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const keyManager = getKeyRotationManager();
    const currentKey = keyManager.getCurrentKey();

    if (!currentKey) {
      return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'No API keys available',
      });
    }

    try {
      // Make a simple test call to Gemini API
      const axios = require('axios');
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          contents: [{ parts: [{ text: 'Say "API key is working"' }] }],
          generationConfig: { response_mime_type: 'text/plain' },
        },
        { 
          headers: { 'x-goog-api-key': currentKey, 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      const textOut = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      res.status(httpStatus.OK).json({
        success: true,
        message: 'API key test successful',
        data: {
          keyUsed: currentKey.substring(0, 20) + '...',
          response: textOut,
          stats: keyManager.getStats(),
        },
      });
    } catch (error: any) {
      // Log detailed error information
      console.error('API key test failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        keyUsed: currentKey.substring(0, 20) + '...',
      });

      // Try to rotate key if error suggests it
      if (error.response?.status === 503 || error.response?.status === 429 || error.response?.status === 403) {
        keyManager.rotateKey(currentKey, error);
      }

      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'API key test failed',
        error: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          responseData: error.response?.data,
          keyUsed: currentKey.substring(0, 20) + '...',
          stats: keyManager.getStats(),
        },
      });
    }
  }
);

export const testAllApiKeys = catchAsync(
  async (req: jwtReq, res: Response, next: NextFunction) => {
    const keyManager = getKeyRotationManager();
    const stats = keyManager.getStats();
    const results = [];
    
    // Test each key individually
    for (let i = 0; i < stats.total; i++) {
      try {
        keyManager.rotateKey(); // Move to next key
        const currentKey = keyManager.getCurrentKey();
        
        if (!currentKey) continue;

        const axios = require('axios');
        const response = await axios.post(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          {
            contents: [{ parts: [{ text: `Test key ${i + 1}` }] }],
          },
          { 
            headers: { 'x-goog-api-key': currentKey, 'Content-Type': 'application/json' },
            timeout: 5000
          }
        );

        results.push({
          keyIndex: i,
          keyPreview: currentKey.substring(0, 20) + '...',
          status: 'working',
          response: response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Success'
        });
      } catch (error: any) {
        results.push({
          keyIndex: i,
          keyPreview: keyManager.getCurrentKey()?.substring(0, 20) + '...',
          status: 'failed',
          error: {
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
          }
        });
      }
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'API key test completed',
      data: {
        results,
        finalStats: keyManager.getStats(),
      },
    });
  }
);
