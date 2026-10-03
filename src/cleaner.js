/**
 * @file cleaner.js
 * High-performance, zero-dependency URL tracking parameter stripper and query cleaner.
 * Enforces a strict allowlist: strips any query parameter not explicitly declared
 * as allowed by your routing or configuration.
 */

/**
 * Pure function to sanitize any URL string or URL instance against an allowlist.
 * Works uniformly in Node.js, SSR, and browser runtimes.
 *
 * @param {string | URL} urlInput - The URL to sanitize.
 * @param {Object} [options]
 * @param {string[]} [options.allowedKeys=[]] - Explicit list of permitted query parameter names.
 * @param {RegExp[]} [options.allowedPatterns=[]] - Regex patterns for permitted query parameter names.
 * @param {Function} [options.isAllowed] - Custom predicate: (key: string, val: string) => boolean.
 * @param {boolean} [options.preserveHash=true] - Whether to keep location.hash in output.
 * @returns {{ cleanUrl: string, stripped: Record<string, string[]>, hasModifications: boolean }}
 */
export function sanitizeUrl(urlInput, options = {}) {
  const {
    allowedKeys = [],
    allowedPatterns = [],
    isAllowed,
    preserveHash = true
  } = options

  // Handle relative paths by providing a dummy base for parsing
  const isRelative = typeof urlInput === 'string' && !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(urlInput)
  const dummyBase = 'https://vue-url-cleaner.local'
  const parsed = new URL(urlInput, isRelative ? dummyBase : undefined)

  const params = parsed.searchParams
  const stripped = {}
  let hasModifications = false

  const allowedSet = new Set(allowedKeys)
  const keys = Array.from(params.keys())

  for (const key of keys) {
    let allowed = allowedSet.has(key)

    if (!allowed && allowedPatterns.length > 0) {
      allowed = allowedPatterns.some(pattern => pattern.test(key))
    }

    if (!allowed && typeof isAllowed === 'function') {
      allowed = isAllowed(key, params.get(key))
    }

    if (!allowed) {
      stripped[key] = params.getAll(key)
      params.delete(key)
      hasModifications = true
    }
  }

  let cleanUrl = ''
  if (isRelative) {
    const searchStr = params.toString() ? `?${params.toString()}` : ''
    const hashStr = preserveHash ? parsed.hash : ''
    cleanUrl = `${parsed.pathname}${searchStr}${hashStr}`
  } else {
    if (!preserveHash) {
      parsed.hash = ''
    }
    cleanUrl = parsed.toString()
  }

  return {
    cleanUrl,
    stripped,
    hasModifications
  }
}

/**
 * Sanitizes current window location in-place using history.replaceState.
 * Prevents page reloads, preserves shareable clean URLs and intact document.referrer.
 *
 * @param {Object} [options]
 * @param {string[]} [options.allowedKeys=[]]
 * @param {RegExp[]} [options.allowedPatterns=[]]
 * @param {Function} [options.isAllowed]
 * @param {boolean} [options.preserveHash=true]
 * @param {Function} [options.onStrip] - Callback: (strippedParams, cleanUrl) => void.
 * @returns {boolean} Whether any parameters were stripped.
 */
export function cleanCurrentUrl(options = {}) {
  if (typeof window === 'undefined' || !window.location || !window.history) {
    return false
  }

  const currentSearch = window.location.search
  if (!currentSearch || currentSearch === '?') {
    return false
  }

  const result = sanitizeUrl(window.location.href, options)

  if (result.hasModifications) {
    const currentUrl = new URL(window.location.href)
    const newSearch = currentUrl.searchParams
    // Apply deletions
    for (const key of Object.keys(result.stripped)) {
      newSearch.delete(key)
    }

    const searchStr = newSearch.toString() ? `?${newSearch.toString()}` : ''
    const hashStr = options.preserveHash !== false ? currentUrl.hash : ''
    const cleanPath = `${currentUrl.pathname}${searchStr}${hashStr}`

    window.history.replaceState(window.history.state, '', cleanPath)

    if (typeof options.onStrip === 'function') {
      options.onStrip(result.stripped, cleanPath)
    }

    return true
  }

  return false
}

/**
 * Initializes automatic URL cleaning on page boot and on router / popstate transitions.
 * Ideal for VitePress, Nuxt, or vanilla Single Page Applications.
 *
 * @param {Object} [options]
 * @param {Object} [router] - Router instance with onAfterRouteChange or afterEach.
 * @returns {Function} Teardown function to remove listeners.
 */
export function initUrlCleaner(options = {}, router = null) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  // Clean immediately on boot
  cleanCurrentUrl(options)

  // Hook into router transitions if present
  if (router) {
    if (typeof router.onAfterRouteChange === 'function') {
      const originalHandler = router.onAfterRouteChange
      router.onAfterRouteChange = (to) => {
        cleanCurrentUrl(options)
        originalHandler(to)
      }
    } else if (typeof router.afterEach === 'function') {
      router.afterEach(() => {
        cleanCurrentUrl(options)
      })
    }
  }

  // Listen for browser forward/back buttons
  const handlePopState = () => {
    cleanCurrentUrl(options)
  }
  window.addEventListener('popstate', handlePopState)

  return () => {
    window.removeEventListener('popstate', handlePopState)
  }
}

/**
 * Creates a Vue 3 plugin that automatically scrubs tracking parameters from URLs.
 * Supports auto-discovering permitted query parameters from Vue Router route meta:
 * `meta: { allowedQuery: ['q', 'page'] }` or `meta: { allowedQuery: false }`.
 *
 * @param {Object} [globalOptions]
 * @param {Object} [globalOptions.router] - Optional Vue Router instance.
 * @param {string[]} [globalOptions.allowedKeys=[]] - Default allowed keys across all routes.
 * @param {RegExp[]} [globalOptions.allowedPatterns=[]] - Allowed key regex patterns.
 * @param {boolean} [globalOptions.autoFromRouteMeta=true] - Extract allowed keys from `route.meta.allowedQuery`.
 * @param {boolean} [globalOptions.preserveHash=true] - Keep hash anchors.
 * @param {Function} [globalOptions.onStrip] - Callback invoked when params are stripped.
 * @returns {Object} Vue plugin object with `install(app)`.
 */
export function createUrlCleaner(globalOptions = {}) {
  return {
    install(app, pluginOptions = {}) {
      const options = { ...globalOptions, ...pluginOptions }
      const router = options.router || app.config.globalProperties.$router

      if (typeof window === 'undefined') {
        return
      }

      if (router && typeof router.afterEach === 'function') {
        // Clean immediately on initial load
        cleanCurrentUrl(options)

        // Clean after every route transition, respecting route meta
        router.afterEach((to) => {
          let routeAllowedKeys = [...(options.allowedKeys || [])]

          if (options.autoFromRouteMeta !== false && to && to.meta) {
            const metaAllowed = to.meta.allowedQuery
            if (Array.isArray(metaAllowed)) {
              routeAllowedKeys = [...routeAllowedKeys, ...metaAllowed]
            } else if (metaAllowed === false) {
              // Route explicitly forbids any query parameters
              routeAllowedKeys = []
            }
          }

          cleanCurrentUrl({
            ...options,
            allowedKeys: routeAllowedKeys
          })
        })
      } else {
        // Fallback without Vue Router
        initUrlCleaner(options, router)
      }
    }
  }
}
