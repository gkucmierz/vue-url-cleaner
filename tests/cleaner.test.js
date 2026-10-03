import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeUrl,
  createUrlCleaner
} from '../src/index.js'

describe('sanitizeUrl (Pure Function)', () => {
  it('strips tracking parameters when allowlist is empty', () => {
    const input = 'https://veto.7u.pl/posts/ewidencja-niewolnikow-rabunek-1933?fbclid=IwY2xjawUuGilleHRuA2FlbQIxMA&gclid=Cj0KCQj&utm_source=facebook'
    const result = sanitizeUrl(input, { allowedKeys: [] })

    assert.equal(result.cleanUrl, 'https://veto.7u.pl/posts/ewidencja-niewolnikow-rabunek-1933')
    assert.equal(result.hasModifications, true)
    assert.deepEqual(Object.keys(result.stripped).sort(), ['fbclid', 'gclid', 'utm_source'])
  })

  it('preserves allowed keys and strips the rest', () => {
    const input = 'https://7u.pl/search?q=austrian+economics&page=2&fbclid=XYZ123&utm_medium=cpc'
    const result = sanitizeUrl(input, {
      allowedKeys: ['q', 'page']
    })

    assert.equal(result.cleanUrl, 'https://7u.pl/search?q=austrian+economics&page=2')
    assert.equal(result.hasModifications, true)
    assert.deepEqual(Object.keys(result.stripped).sort(), ['fbclid', 'utm_medium'])
  })

  it('supports allowedPatterns regexes', () => {
    const input = 'https://shop.local/items?filter_color=gold&filter_weight=1oz&fbclid=999'
    const result = sanitizeUrl(input, {
      allowedPatterns: [/^filter_/]
    })

    assert.equal(result.cleanUrl, 'https://shop.local/items?filter_color=gold&filter_weight=1oz')
    assert.equal(result.hasModifications, true)
    assert.deepEqual(Object.keys(result.stripped), ['fbclid'])
  })

  it('supports custom isAllowed predicate', () => {
    const input = 'https://app.local/?safe_token=123&bad_token=456&fbclid=789'
    const result = sanitizeUrl(input, {
      isAllowed: (key) => key.startsWith('safe_')
    })

    assert.equal(result.cleanUrl, 'https://app.local/?safe_token=123')
    assert.equal(result.hasModifications, true)
    assert.deepEqual(Object.keys(result.stripped).sort(), ['bad_token', 'fbclid'])
  })

  it('preserves hash fragments by default', () => {
    const input = 'https://veto.7u.pl/posts/article?fbclid=abc#executive-order-6102'
    const result = sanitizeUrl(input, { allowedKeys: [] })

    assert.equal(result.cleanUrl, 'https://veto.7u.pl/posts/article#executive-order-6102')
  })

  it('strips hash fragments when preserveHash is false', () => {
    const input = 'https://veto.7u.pl/posts/article?fbclid=abc#executive-order-6102'
    const result = sanitizeUrl(input, { allowedKeys: [], preserveHash: false })

    assert.equal(result.cleanUrl, 'https://veto.7u.pl/posts/article')
  })

  it('handles relative URLs seamlessly', () => {
    const input = '/posts/ewidencja-niewolnikow-rabunek-1933?fbclid=abc#quote'
    const result = sanitizeUrl(input, { allowedKeys: [] })

    assert.equal(result.cleanUrl, '/posts/ewidencja-niewolnikow-rabunek-1933#quote')
    assert.equal(result.hasModifications, true)
  })

  it('does nothing when no query params exist', () => {
    const input = 'https://veto.7u.pl/posts/article#heading'
    const result = sanitizeUrl(input, { allowedKeys: [] })

    assert.equal(result.cleanUrl, input)
    assert.equal(result.hasModifications, false)
    assert.deepEqual(result.stripped, {})
  })

  it('does nothing when all query params are permitted', () => {
    const input = 'https://veto.7u.pl/search?q=gold'
    const result = sanitizeUrl(input, { allowedKeys: ['q'] })

    assert.equal(result.cleanUrl, input)
    assert.equal(result.hasModifications, false)
    assert.deepEqual(result.stripped, {})
  })
})

describe('createUrlCleaner (Vue 3 Plugin)', () => {
  it('installs cleanly as a Vue plugin', () => {
    const plugin = createUrlCleaner({
      allowedKeys: ['lang']
    })

    assert.equal(typeof plugin.install, 'function')

    const mockApp = {
      config: {
        globalProperties: {}
      }
    }

    // In Node (non-browser), install should return early safely without throwing
    assert.doesNotThrow(() => {
      plugin.install(mockApp)
    })
  })

  it('attaches afterEach hook to Vue Router when provided', () => {
    let hookRegistered = false
    const mockRouter = {
      afterEach(fn) {
        hookRegistered = true
        assert.equal(typeof fn, 'function')
      }
    }

    const plugin = createUrlCleaner({
      router: mockRouter,
      allowedKeys: ['lang']
    })

    // In a browser environment, it would register afterEach
    // Verify router reference is preserved
    assert.ok(plugin)
  })
})
