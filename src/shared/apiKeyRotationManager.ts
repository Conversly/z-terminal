/**
 * API Key Rotation Manager for handling multiple Gemini API keys.
 * Rotates keys when rate limits are hit.
 */
import logger from '../loaders/logger';
import env from '../config';

interface KeyUsage {
  lastUsed: number;
  failureCount: number;
  isBlocked: boolean;
  blockUntil?: number;
}

class APIKeyRotationManager {
  private apiKeys: string[] = [];
  private currentKeyIndex = 0;
  private keyUsage: Map<string, KeyUsage> = new Map();
  private failedKeys: Set<string> = new Set();
  private readonly BLOCK_DURATION = 60 * 1000; // 1 minute block time
  private readonly MAX_FAILURES = 3; // Max failures before temporary block

  constructor() {
    this.loadApiKeys();
  }

  private loadApiKeys(): void {
    // Load from GEMINI_API_KEYS (comma-separated) or fallback to single GEMINI_API_KEY
    const apiKeysString = process.env.GEMINI_API_KEYS || env.GEMINI_API_KEY;
    
    logger.info(`Loading API keys from environment: GEMINI_API_KEYS=${process.env.GEMINI_API_KEYS ? 'found' : 'not found'}, GEMINI_API_KEY=${env.GEMINI_API_KEY ? 'found' : 'not found'}`);
    
    if (!apiKeysString) {
      throw new Error('No Gemini API keys found in environment variables');
    }

    // Split by comma and clean up
    this.apiKeys = apiKeysString
      .split(',')
      .map(key => key.trim())
      .filter(key => key.length > 0);

    // Remove duplicates
    this.apiKeys = [...new Set(this.apiKeys)];

    // Initialize usage tracking for each key
    this.apiKeys.forEach((key, index) => {
      this.keyUsage.set(key, {
        lastUsed: 0,
        failureCount: 0,
        isBlocked: false
      });
      logger.debug(`Initialized API key ${index + 1}: ${key.substring(0, 20)}...`);
    });

    logger.info(`Loaded ${this.apiKeys.length} Gemini API keys for rotation`);
  }

  getCurrentKey(): string | null {
    if (this.apiKeys.length === 0) {
      logger.error('No API keys available in getCurrentKey()');
      return null;
    }

    // Clean up expired blocks
    this.cleanExpiredBlocks();

    // Find next available key starting from current index
    let attempts = 0;
    while (attempts < this.apiKeys.length) {
      const key = this.apiKeys[this.currentKeyIndex];
      const usage = this.keyUsage.get(key);

      logger.debug(`Checking key ${this.currentKeyIndex}: blocked=${usage?.isBlocked}, failed=${this.failedKeys.has(key)}, failureCount=${usage?.failureCount}`);

      if (usage && !usage.isBlocked && !this.failedKeys.has(key)) {
        // Update last used time
        usage.lastUsed = Date.now();
        this.keyUsage.set(key, usage);
        
        logger.info(`Using API key index ${this.currentKeyIndex} (${key.substring(0, 20)}...)`);
        return key;
      }

      // Move to next key
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      attempts++;
    }

    // If all keys are blocked/failed, reset and try again
    logger.warn('All API keys are blocked or failed, resetting...');
    this.resetFailedKeys();
    const resetKey = this.apiKeys[this.currentKeyIndex];
    logger.info(`After reset, using key index ${this.currentKeyIndex} (${resetKey.substring(0, 20)}...)`);
    return resetKey;
  }

  rotateKey(failedKey?: string, error?: any): string | null {
    if (failedKey) {
      this.handleKeyFailure(failedKey, error);
    }

    // Move to next key
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    
    logger.info(`Rotated to API key index ${this.currentKeyIndex}`);
    return this.getCurrentKey();
  }

  private handleKeyFailure(failedKey: string, error?: any): void {
    const usage = this.keyUsage.get(failedKey);
    if (!usage) return;

    usage.failureCount += 1;
    
    if (this.isRateLimitError(error)) {
      logger.warn(`API key hit rate limit, marking as temporarily blocked`);
      usage.isBlocked = true;
      usage.blockUntil = Date.now() + this.BLOCK_DURATION;
    }

    // If too many failures, add to failed keys
    if (usage.failureCount >= this.MAX_FAILURES) {
      this.failedKeys.add(failedKey);
      logger.warn(`API key marked as failed after ${usage.failureCount} failures`);
    }

    this.keyUsage.set(failedKey, usage);
  }

  private isRateLimitError(error: any): boolean {
    if (!error) return false;

    const errorString = JSON.stringify(error).toLowerCase();
    const rateLimitIndicators = [
      'quota',
      'rate limit',
      '429',
      '503',
      'resource exhausted',
      'too many requests',
      'quota exceeded',
      'resource_exhausted',
      'service unavailable'
    ];

    const isRateLimit = rateLimitIndicators.some(indicator => 
      errorString.includes(indicator)
    );

    logger.debug(`isRateLimitError check: ${isRateLimit} for error: ${errorString.substring(0, 200)}`);
    return isRateLimit;
  }

  private cleanExpiredBlocks(): void {
    const now = Date.now();
    
    this.keyUsage.forEach((usage, key) => {
      if (usage.isBlocked && usage.blockUntil && now > usage.blockUntil) {
        usage.isBlocked = false;
        usage.blockUntil = undefined;
        usage.failureCount = Math.max(0, usage.failureCount - 1); // Reduce failure count
        this.keyUsage.set(key, usage);
        logger.info(`API key block expired, key is available again`);
      }
    });
  }

  private resetFailedKeys(): void {
    this.failedKeys.clear();
    
    // Reset all usage stats
    this.keyUsage.forEach((usage, key) => {
      usage.failureCount = 0;
      usage.isBlocked = false;
      usage.blockUntil = undefined;
      this.keyUsage.set(key, usage);
    });
    
    logger.info('Reset all failed API keys');
  }

  getAvailableKeyCount(): number {
    this.cleanExpiredBlocks();
    
    let availableCount = 0;
    this.keyUsage.forEach((usage, key) => {
      if (!usage.isBlocked && !this.failedKeys.has(key)) {
        availableCount++;
      }
    });
    
    return availableCount;
  }

  getStats(): { total: number; available: number; blocked: number; failed: number } {
    this.cleanExpiredBlocks();
    
    let blocked = 0;
    let available = 0;
    
    this.keyUsage.forEach((usage, key) => {
      if (this.failedKeys.has(key)) {
        // Already counted in failed
      } else if (usage.isBlocked) {
        blocked++;
      } else {
        available++;
      }
    });

    return {
      total: this.apiKeys.length,
      available,
      blocked,
      failed: this.failedKeys.size
    };
  }
}

// Global instance
let keyRotationManager: APIKeyRotationManager | null = null;

export function getKeyRotationManager(): APIKeyRotationManager {
  if (!keyRotationManager) {
    keyRotationManager = new APIKeyRotationManager();
  }
  return keyRotationManager;
}

export { APIKeyRotationManager };
