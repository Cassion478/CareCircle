// CareCircle Phase 8A: Retry & Backoff Controller
// Implements exponential backoff, hard retry ceilings, and permanent failure classification.

export interface RetryEvaluation {
  shouldRetry: boolean;
  isTerminal: boolean;
  nextRetryAt?: Date;
  reason: string;
}

const PERMANENT_ERROR_PATTERNS = [
  /invalid[_\s]recipient/i,
  /invalid[_\s]phone/i,
  /invalid[_\s]email/i,
  /unsubscribed/i,
  /blacklisted/i,
  /consent[_\s]revoked/i,
  /not[_\s]found/i,
  /unauthorized/i,
  /forbidden/i,
];

/**
 * Evaluates whether a failed notification delivery attempt should be retried.
 * - Permanent errors (e.g. invalid phone/email, unsubscribed) fail immediately with 0 retries.
 * - Transient errors (e.g. network timeout, rate limit 429) back off exponentially.
 */
export function evaluateNotificationRetry(
  currentRetryCount: number,
  maxRetries: number = 3,
  errorCodeOrMessage?: string,
  baseDelaySec: number = 60,
  maxDelaySec: number = 3600
): RetryEvaluation {
  const errorText = errorCodeOrMessage || "";

  // 1. Check for permanent error signatures
  const isPermanent = PERMANENT_ERROR_PATTERNS.some((pattern) =>
    pattern.test(errorText)
  );

  if (isPermanent) {
    return {
      shouldRetry: false,
      isTerminal: true,
      reason: `Permanent delivery error detected: "${errorText}". Job will not be retried.`,
    };
  }

  // 2. Check retry ceiling
  if (currentRetryCount >= maxRetries) {
    return {
      shouldRetry: false,
      isTerminal: true,
      reason: `Exceeded maximum retry limit (${maxRetries}). Terminating job.`,
    };
  }

  // 3. Calculate exponential backoff delay: baseDelay * 2^(retryCount) capped at maxDelay
  const delaySec = Math.min(
    baseDelaySec * Math.pow(2, currentRetryCount),
    maxDelaySec
  );
  const nextRetry = new Date(Date.now() + delaySec * 1000);

  return {
    shouldRetry: true,
    isTerminal: false,
    nextRetryAt: nextRetry,
    reason: `Transient error. Retrying in ${delaySec}s (attempt ${
      currentRetryCount + 1
    } of ${maxRetries}).`,
  };
}
