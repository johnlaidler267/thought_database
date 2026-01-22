/**
 * Base class for LLM providers
 * All providers must implement this interface
 */
export class BaseProvider {
  constructor(config = {}) {
    this.config = config
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 30000
  }

  /**
   * Make an API call with timeout protection
   * @param {Promise} promise - The API call promise
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise} - The result or timeout error
   */
  async withTimeout(promise, timeoutMs = null) {
    const timeout = timeoutMs || this.timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timed out after ${timeout}ms`))
      }, timeout)
    })

    return Promise.race([promise, timeoutPromise])
  }

  /**
   * Validate API key is present
   * @throws {Error} If API key is missing
   */
  validateApiKey() {
    if (!this.apiKey) {
      throw new Error(`${this.constructor.name} API key is not configured`)
    }
  }
}
