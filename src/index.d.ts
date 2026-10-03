import type { App, Plugin } from 'vue'
import type { Router } from 'vue-router'

export interface SanitizeOptions {
  /** Whitelist of permitted query parameter names. */
  allowedKeys?: string[]
  /** Whitelist of regex patterns for query parameter names. */
  allowedPatterns?: RegExp[]
  /** Custom predicate to determine whether a key/value pair is allowed. */
  isAllowed?: (key: string, value: string | null) => boolean
  /** Whether to preserve the hash fragment (#section). Default: true. */
  preserveHash?: boolean
  /** Callback invoked when parameters are stripped. */
  onStrip?: (stripped: Record<string, string[]>, cleanUrl: string) => void
}

export interface SanitizeResult {
  /** The sanitized, clean URL string. */
  cleanUrl: string
  /** Dictionary of removed query parameters and their values. */
  stripped: Record<string, string[]>
  /** True if any query parameter was removed. */
  hasModifications: boolean
}

export interface PluginOptions extends SanitizeOptions {
  /** Optional Vue Router instance. */
  router?: Router
  /**
   * If true, permitted query parameters are automatically read from route meta:
   * `meta: { allowedQuery: ['q', 'page'] }` or `meta: { allowedQuery: false }`.
   * Default: true.
   */
  autoFromRouteMeta?: boolean
}

/**
 * Pure function to sanitize any URL string or URL object against an allowlist.
 * Works in Node.js, SSR, and browser environments.
 */
export function sanitizeUrl(
  urlInput: string | URL,
  options?: SanitizeOptions
): SanitizeResult

/**
 * Sanitizes current window.location in-place using history.replaceState.
 * Prevents page reloads, preserves clean shareable links and referrer.
 */
export function cleanCurrentUrl(options?: SanitizeOptions): boolean

/**
 * Initializes automatic URL cleaning on page boot and on router / popstate transitions.
 * Useful for VitePress, Nuxt, or vanilla Single Page Applications.
 */
export function initUrlCleaner(
  options?: SanitizeOptions,
  router?: any
): () => void

/**
 * Creates a Vue 3 plugin that automatically scrubs tracking parameters from URLs.
 */
export function createUrlCleaner(globalOptions?: PluginOptions): Plugin

export default createUrlCleaner
