/**
 * Error Boundary Module
 * Provides error boundary utilities for the RDI Indirect Inventory application.
 * Handles graceful error recovery, user-friendly error messages,
 * and prevents uncaught exceptions from crashing the application.
 * 
 * MIT License - RDI Indirect Inventory v6.65+
 * 
 * Related Modules:
 * - utils/dom.js - XSS-safe DOM manipulation
 * - utils/validation.js - Input validation
 * - main.js - Main application entry point
 */

export const errorBoundary = {
  /**
   * Wrap an async function call with error handling.
   * Catches errors, shows user-friendly toast messages,
   * and logs to console for debugging.
   * 
   * @param {Function} asyncFn - The async function to wrap
   * @param {object} [options] - Optional configuration
   * @param {string} [options.errorMessage='Terjadi kesalahan'] - User-friendly error message
   * @param {string} [options.toastType='error'] - Toast type for error display
   * @param {number} [options.timeout] - Timeout in milliseconds (default: 30000)
   * @returns {Promise<any>} Promise result from the original function
   * 
   * @example
   * ```javascript
   * // Safe transaction execution with error handling
   * try {
   *   const result = await errorBoundary.wrapAsync(async () => {
   *     return await runTransaction(db, async (tx) => { /* ... */ });
   *   });
   *   return result;
   * } catch (e) {
   *   // Already handled by wrapAsync
   * }
   * ```
   */
  async wrapAsync(asyncFn: Function, options: {
    errorMessage?: string;
    toastType?: 'info' | 'success' | 'warning' | 'error';
    timeout?: number;
  } = {}): Promise<any> {
    /** @type {number} */
    const timeout = options.timeout || 30000;
    /** @type {string} */
    const errorMsg = options.errorMessage || 'Terjadi kesalahan';
    /** @type {string} */
    const toastType = options.toastType || 'error';

    /** @type {Promise<any>} */
    const promise = asyncFn();

    /** @type {NodeJS.Timeout} */
    const timeoutId = setTimeout(() => {
      window.showToast(`Operasi timeout setelah ${timeout / 1000} detik`, 'error');
      promise.cancel?.();
    }, timeout);

    try {
      /** @type {any} */
      const result = await promise;
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      /** @type {string} */
      const errorDetails = err.message || err.toString();
      console.error('ErrorBoundary error:', err);

      // Show user-friendly message
      window.showToast(errorMsg, toastType);

      // Re-throw for upper layers if needed
      throw err;
    }
  },

  /**
   * Wrap a synchronous function call with error handling.
   * Similar to wrapAsync but for synchronous functions.
   * 
   * @param {Function} syncFn - The synchronous function to wrap
   * @param {object} [options] - Optional configuration
   * @param {string} [errorMessage='Terjadi kesalahan'] - User-friendly error message
   * @returns {any} Return value from the original function
   * 
   * @example
   * ```javascript
   * // Safe DOM operation with error handling
   * try {
   *   const result = errorBoundary.wrapSync(() => {
   *     // DOM operation that might throw
   *     return dom.safeInnerHTML(element, html);
   *   });
   * } catch (e) {
   *   // Already handled
   * }
   * ```
   */
  wrapSync(syncFn: Function, options: { errorMessage?: string } = {}): any {
    /** @type {string} */
    const errorMsg = options.errorMessage || 'Terjadi kesalahan';

    try {
      return syncFn();
    } catch (err) {
      console.error('ErrorBoundary sync error:', err);
      window.showToast(options.errorMessage || 'Terjadi kesalahan', 'error');
      throw err;
    }
  },

  /**
   * Set up global error handler for uncaught promises and script errors.
   * Should be called once during app initialization.
   * Prevents unhandled promise rejections from silently failing.
   * 
   * @example
   * ```javascript
   * // Initialize global error handling on app startup
 * errorBoundary.setupGlobalHandler();
 * ```
   */
  setupGlobalHandler(): void {
    /** @type {(reason: string) => void} */
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      /** @type {string} */
      const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
      window.showToast(`Error terlu: ${message.substring(0, 50)}`, 'error');
    };

    /** @type {(message: string, source: string, lineno: number, colno: number, error: Error) => void} */
    const handleGlobalError = (message: string, source: string, lineno: number, colno: number, error: Error) => {
      console.error('Global Script Error:', { message, source, lineno, colno, error });
      /** @type {string} */
      const errorMsg = `Error: ${message.substring(0, 50)}`;
      window.showToast(errorMsg, 'error');
      // Return true to prevent the default error handler
      return true;
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);
  },

  /**
   * Clean up global error handlers.
   * Should be called during app shutdown or unload.
   */
  cleanupGlobalHandler(): void {
    window.removeEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
    });
    window.removeEventListener('error', (message: string, source: string, lineno: number, colno: number, error: Error) => {
      console.error('Global Script Error:', { message, source, lineno, colno, error });
    });
  }
};