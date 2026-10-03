/**
 * @file index.js
 * Entry point for vue-url-cleaner.
 */

import {
  sanitizeUrl,
  cleanCurrentUrl,
  initUrlCleaner,
  createUrlCleaner
} from './cleaner.js'

export {
  sanitizeUrl,
  cleanCurrentUrl,
  initUrlCleaner,
  createUrlCleaner
}

export default createUrlCleaner
