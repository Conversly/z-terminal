import logger from '../loaders/logger';
import env from '../config';

interface KeyUsage {
  lastUsed: number;
  failureCount: number;
  isBlocked: boolean;
  blockUntil?: number;
  consecutiveFailures: number;
}

class GeminiKeyRotationManager {
  private apiKeys: string[] = [];
  private currentKeyIndex = 0;
  private keyUsage: Map<string, KeyUsage> = new Map();
  private permanentlyFailedKeys: Set<string> = new Set();
  private rotationLock = false;

  private readonly BLOCK_DURATIONS = [
    1 * 60 * 1000,      // 1 minute (first failure)
    5 * 60 * 1000,      // 5 minutes (second failure)
    15 * 60 * 1000,     // 15 minutes (third failure)
    30 * 60 * 1000      // 30 minutes (fourth+ failure)
  ];
  private readonly MAX_CONSECUTIVE_FAILURES = 5; // Permanent block after this many consecutive failures

  constructor() {
    this.loadApiKeys();
  }

  /**
   * Load API keys from environment variables
   */
  private loadApiKeys(): void {
    const apiKeysString = process.env.GEMINI_API_KEYS || env.GEMINI_API_KEY;

    logger.info(`Loading Gemini API keys from environment`);

    if (!apiKeysString) {
      throw new Error('No Gemini API keys found. Set GEMINI_API_KEYS or GEMINI_API_KEY environment variable');
    }

    // Parse and clean keys
    this.apiKeys = apiKeysString
      .split(',')
      .map(key => key.trim())
      .filter(key => key.length > 0);

    // Remove duplicates
    this.apiKeys = [...new Set(this.apiKeys)];

    if (this.apiKeys.length === 0) {
      throw new Error('No valid API keys found after parsing');
    }

    // Initialize tracking for each key
    this.apiKeys.forEach((key, index) => {
      this.keyUsage.set(key, {
        lastUsed: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        isBlocked: false
      });
      logger.debug(`Initialized API key #${index + 1}`);
    });

    logger.info(`✓ Loaded ${this.apiKeys.length} Gemini API key(s) for rotation`);
  }

  /**
   * Get the current API key for use
   * Thread-safe with simple locking mechanism
   */
  getCurrentKey(): string | null {
    if (this.apiKeys.length === 0) {
      logger.error('No API keys available');
      return null;
    }

    // Simple lock to prevent race conditions
    // In high-concurrency scenarios, some requests might wait, but that's acceptable
    let attempts = 0;
    while (this.rotationLock && attempts < 10) {
      // Wait a bit if locked (simple spin lock)
      attempts++;
      if (attempts === 10) {
        logger.warn('Rotation lock timeout, proceeding anyway');
      }
    }

    this.rotationLock = true;

    try {

      // Find next available key
      let searchAttempts = 0;
      while (searchAttempts < this.apiKeys.length) {
        const key = this.apiKeys[this.currentKeyIndex];
        const usage = this.keyUsage.get(key);

        if (usage && !usage.isBlocked && !this.permanentlyFailedKeys.has(key)) {
          // Update last used time
          usage.lastUsed = Date.now();
          this.keyUsage.set(key, usage);

          logger.debug(`Using API key #${this.currentKeyIndex + 1}`);
          return key;
        }

        // Move to next key
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        searchAttempts++;
      }

      // All keys are unavailable - critical situation
      logger.error('CRITICAL: All API keys are blocked or failed!');
      
      // Try to find the least-bad key
      const leastBadKey = this.findLeastFailedKey();
      if (leastBadKey) {
        logger.warn(`Using least-failed key as last resort`);
        return leastBadKey;
      }

      return null;
    } finally {
      this.rotationLock = false;
    }
  }

  /**
   * Rotate to the next key, optionally handling a failed key
   */
  rotateKey(failedKey?: string, error?: any): string | null {
    if (failedKey) {
      this.handleKeyFailure(failedKey, error);
    }

    // Move to next key
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    logger.info(`Rotated to API key index ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);

    return this.getCurrentKey();
  }

  /**
   * Find the key with the least failures (used as last resort)
   */
  private findLeastFailedKey(): string | null {
    let leastFailedKey: string | null = null;
    let minFailures = Infinity;

    for (const key of this.apiKeys) {
      if (this.permanentlyFailedKeys.has(key)) {
        continue;
      }

      const usage = this.keyUsage.get(key);
      if (usage && usage.failureCount < minFailures) {
        minFailures = usage.failureCount;
        leastFailedKey = key;
      }
    }

    return leastFailedKey;
  }

  /**
   * Report a successful API call (resets consecutive failures)
   */
  reportSuccess(successfulKey: string): void {
    const usage = this.keyUsage.get(successfulKey);
    if (usage) {
      usage.consecutiveFailures = 0;
      this.keyUsage.set(successfulKey, usage);
      logger.debug(`API key success reported`);
    }
  }

  /**
   * Handle a failed API key with smart error detection
   */
  private handleKeyFailure(failedKey: string, error?: any): void {
    const usage = this.keyUsage.get(failedKey);
    if (!usage) {
      logger.warn(`Attempted to mark unknown key as failed`);
      return;
    }

    usage.failureCount += 1;
    usage.consecutiveFailures += 1;

    const errorType = this.classifyError(error);

    logger.warn(`API key failure - Type: ${errorType}, Consecutive: ${usage.consecutiveFailures}`);

    // Handle different error types
    switch (errorType) {
      case 'AUTH_ERROR':
        // Invalid/expired key - permanently failed
        this.permanentlyFailedKeys.add(failedKey);
        logger.error(`API key PERMANENTLY FAILED (invalid/unauthorized)`);
        break;

      case 'RATE_LIMIT':
        // Temporary block with exponential backoff
        const blockIndex = Math.min(
          usage.consecutiveFailures - 1,
          this.BLOCK_DURATIONS.length - 1
        );
        const blockDuration = this.BLOCK_DURATIONS[blockIndex];

        usage.isBlocked = true;
        usage.blockUntil = Date.now() + blockDuration;

        logger.warn(
          `API key RATE LIMITED - ` +
          `Blocked for ${blockDuration / 1000}s (attempt ${usage.consecutiveFailures})`
        );
        break;

      case 'QUOTA_EXCEEDED':
        // Quota exceeded - block for longer period
        usage.isBlocked = true;
        usage.blockUntil = Date.now() + (60 * 60 * 1000); // 1 hour
        logger.warn(`API key QUOTA EXCEEDED - Blocked for 1 hour`);
        break;

      case 'SERVER_ERROR':
      case 'NETWORK_ERROR':
      case 'UNKNOWN':
        // Generic failure - short block
        usage.isBlocked = true;
        usage.blockUntil = Date.now() + this.BLOCK_DURATIONS[0];
        logger.warn(`API key temporary failure - Blocked for 1 minute`);
        break;
    }

    // If too many consecutive failures, permanently fail the key
    if (usage.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES && errorType !== 'AUTH_ERROR') {
      this.permanentlyFailedKeys.add(failedKey);
      logger.error(
        `API key PERMANENTLY FAILED after ${usage.consecutiveFailures} consecutive failures`
      );
    }

    this.keyUsage.set(failedKey, usage);
  }

  /**
   * Classify error type for smart handling
   */
  private classifyError(error: any): 'AUTH_ERROR' | 'RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN' {
    if (!error) return 'UNKNOWN';

    const errorString = JSON.stringify(error).toLowerCase();
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || error?.status || error?.statusCode;

    // Authentication errors (permanent)
    if (
      errorCode === 401 ||
      errorCode === 403 ||
      errorString.includes('invalid api key') ||
      errorString.includes('api_key_invalid') ||
      errorString.includes('unauthorized') ||
      errorString.includes('permission denied') ||
      errorMessage.includes('invalid api key')
    ) {
      return 'AUTH_ERROR';
    }

    // Rate limit errors (temporary)
    if (
      errorCode === 429 ||
      errorString.includes('rate limit') ||
      errorString.includes('too many requests') ||
      errorString.includes('resource_exhausted') ||
      errorMessage.includes('rate limit')
    ) {
      return 'RATE_LIMIT';
    }

    // Quota exceeded (longer block)
    if (
      errorString.includes('quota exceeded') ||
      errorString.includes('quota_exceeded') ||
      errorString.includes('billing') ||
      errorMessage.includes('quota')
    ) {
      return 'QUOTA_EXCEEDED';
    }

    // Server errors
    if (
      errorCode === 500 ||
      errorCode === 502 ||
      errorCode === 503 ||
      errorCode === 504 ||
      errorString.includes('service unavailable') ||
      errorString.includes('internal server error')
    ) {
      return 'SERVER_ERROR';
    }

    // Network errors
    if (
      errorString.includes('network') ||
      errorString.includes('timeout') ||
      errorString.includes('econnrefused') ||
      errorString.includes('enotfound')
    ) {
      return 'NETWORK_ERROR';
    }

    return 'UNKNOWN';
  }

}

// Singleton instance
let keyRotationManager: GeminiKeyRotationManager | null = null;

/**
 * Get or create the global key rotation manager instance
 */
export function getGeminiKeyManager(): GeminiKeyRotationManager {
  if (!keyRotationManager) {
    keyRotationManager = new GeminiKeyRotationManager();
  }
  return keyRotationManager;
}

export { GeminiKeyRotationManager };
export default getGeminiKeyManager;