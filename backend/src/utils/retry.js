export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn` until it succeeds or the attempts are exhausted.
 * @param {(attempt: number) => Promise<T>} fn
 * @param {{retries: number, delayMs: number, onRetry?: (err: Error, attempt: number) => void}} options
 * @returns {Promise<T>}
 * @template T
 */
export async function withRetry(fn, { retries, delayMs, onRetry }) {
  let attempt = 0;

  for (;;) {
    attempt += 1;
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries) throw err;
      if (onRetry) onRetry(err, attempt);
      await sleep(delayMs);
    }
  }
}
