/**
 * Performance Utility Module
 * Provides debounce, throttle, and other performance optimization helpers
 * for the RDI Indirect Inventory application.
 * 
 * MIT License - RDI Indirect Inventory v6.65+
 * 
 * Related Modules:
 * - utils/dom.js - XSS-safe DOM manipulation
 * - utils/validation.js - Input validation
 * - main.js - Main application entry point
 */

/**
 * Namespace for performance utilities.
 * @namespace performance
 */
export const performance = {
  /**
   * Debounce a function - only execute after stop_ms milliseconds since last call.
   * Useful for search inputs, resize events, and frequent UI handlers.
   * 
   * @param {Function} func - The function to debounce
   * @param {number} stop_ms - Milliseconds to wait after last call before executing
   * @param {boolean} [immediate] - If true, execute immediately on first call,
   *   then debounce subsequent calls
   * @returns {Function} Debounced function
   * 
   * @example
   * ```javascript
   * const debouncedSearch = performance.debounce(searchItems, 300);
   * inputElement.addEventListener('input', debouncedSearch);
   * ```
   */
  debounce(func: Function, stop_ms: number, immediate: boolean = false): Function {
    /** @type {number|undefined} */
    let timeoutId;
    
    /** @type {Function} */
    const debounced = function (...args: any[]) {
      /** @type {boolean} */
      const shouldCallNow = immediate && !timeoutId;
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = undefined;
        if (!immediate) func.apply(this, args);
      }, stop_ms);
      
      if (shouldCallNow) func.apply(this, args);
    };
    
    // Preserve function properties for debugging
    debounced.cancel = () => {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    };
    
    return debounced;
  },

  /**
   * Throttle a function - only execute at most once every min_ms milliseconds.
   * Unlike debounce, throttle will execute periodically while the event fires,
   * not just after the firing stops.
   * 
   * @param {Function} func - The function to throttle
   * @param {number} min_ms - Minimum milliseconds between executions
   * @returns {Function} Throttled function
   * 
   * @example
   * ```javascript
   * const throttledUpdate = performance.throttle(updateDashboard, 100);
   * window.addEventListener('scroll', throttledUpdate);
   * ```
   */
  throttle(func: Function, min_ms: number): Function {
    /** @type {number|undefined} */
    let lastCall = 0;
    
    /** @type {Function} */
    const throttled = function (...args: any[]) {
      /** @type {number} */
      const now = Date.now();
      /** @type {boolean} */
      const shouldCall = now - (lastCall || 0) >= min_ms;
      
      if (shouldCall) {
        lastCall = now;
        func.apply(this, args);
      }
    };
    
    throttled.flush = function () {
      lastCall = 0;
    };
    
    return throttled;
  },

  /**
   * Debounce search/filter operations for master list rendering.
   * Specifically tailored for the m-list search input where too-frequent
   * re-rendering can cause performance issues.
   * 
   * @param {Function} renderFn - The render function to debounce
   * @param {number} wait_ms - Wait time in milliseconds (default: 300)
   * @returns {Function} Debounced render function
   * 
   * @example
   * ```javascript
   * const debouncedRender = performance.debounceRender(renderMasterList);
   * searchInput.addEventListener('input', (e) => {
   *   debouncedRender(e.target.value);
   * });
   * ```
   */
  debounceRender(renderFn: Function, wait_ms: number = 300): Function {
    return this.debounce(renderFn, wait_ms, false);
  },

  /**
   * Create a memoized version of a function that caches results based on input.
   * Useful for expensive computations that don't need to re-run on every render.
   * 
   * @param {Function} func - The function to memoize
   * @param {number} maxCacheSize - Maximum number of cache entries (default: 10)
   * @returns {Function} Memoized function
   * 
   * @example
   * ```javascript
   * const memoizedGetStock = performance.memoize(appState.getCurrentStock.bind(appState));
   * // Will cache results for last 10 unique itemId lookups
   * ```
   */
  memoize(func: Function, maxCacheSize: number = 10): Function {
    /** @type {Map<string, {result: any, timestamp: number}>} */
    const cache = new Map();
    /** @type {number} */
    let cacheSize = 0;
    
    /** @type {Function} */
    const memoized = function (...args: any[]) {
      /** @type {string} */
      const key = JSON.stringify(args);
      /** @type {number} */
      const now = Date.now();
      
      // Check cache hit
      /** @type {any|undefined} */
      const cached = cache.get(key);
      if (cached && now - cached.timestamp < 1000) {
        return cached.result;
      }
      
      /** @type {any} */
      const result = func.apply(this, args);
      
      // Add to cache
      if (cacheSize >= maxCacheSize) {
        /** @type {any} */
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
        cacheSize--;
      }
      cache.set(key, { result, timestamp: now });
      cacheSize++;
      
      return result;
    };
    
    memoized.clear = () => cache.clear();
    return memoized;
  }
};