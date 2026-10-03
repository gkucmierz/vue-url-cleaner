# vue-url-cleaner

> **Zero-dependency, route-aware URL tracking parameter stripper and query cleaner for Vue 3, Vue Router, and VitePress.**

[![npm version](https://img.shields.io/npm/v/vue-url-cleaner.svg)](https://www.npmjs.com/package/vue-url-cleaner)
[![license](https://img.shields.io/npm/l/vue-url-cleaner.svg)](https://gitea.7u.pl/gkucmierz/vue-url-cleaner/src/branch/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/vue-url-cleaner)](https://bundlephobia.com/package/vue-url-cleaner)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)

Whenever visitors click links from Facebook, Instagram, Google Ads, TikTok, or email newsletters, platforms append unsightly, privacy-invasive tracking tokens to the URL:

```
https://example.com/posts/article?fbclid=IwY2xjawUuGilleHRuA2FlbQIxMA...&utm_source=fb
```

`vue-url-cleaner` scrubs these tracking tokens **immediately upon client arrival** and **across SPA route transitions** using `window.history.replaceState`. 

### ✨ Highlights
- **Strict Allowlist Architecture:** Instead of constantly chasing ad platforms' new tokens with outdated blacklists, it strips **everything your routing doesn't explicitly declare as permitted**.
- **Route-Aware (`autoFromRouteMeta`):** Automatically extracts permitted query keys directly from `route.meta.allowedQuery` in Vue Router.
- **Zero Reloads & Zero FOUC:** Smoothly rewrites the browser address bar in-place with `replaceState`.
- **Preserves Analytics & Referrers:** Keeps `document.referrer` intact so analytics tools continue tracking traffic sources accurately.
- **Universal Runtime:** Works seamlessly in **Vue 3**, **Vue Router**, **VitePress**, **Nuxt 3**, and pure **Node.js / SSR**.
- **Ultra Lightweight:** Zero runtime dependencies, written in native ES modules.

---

## 📦 Installation

```bash
npm install vue-url-cleaner
```

---

## 🚀 Quick Start (Vue 3 + Vue Router)

Register the plugin in your entry file (`main.js` or `main.ts`):

```javascript
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createUrlCleaner } from 'vue-url-cleaner'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/posts/:slug',
      component: () => import('./views/PostView.vue'),
      meta: {
        // Articles don't expect query parameters -> strips any ?fbclid=...
        allowedQuery: [] 
      }
    },
    {
      path: '/search',
      component: () => import('./views/SearchView.vue'),
      meta: {
        // Preserves 'q' and 'page', strips all other tracking noise
        allowedQuery: ['q', 'page'] 
      }
    }
  ]
})

const app = createApp(App)

app.use(createUrlCleaner({
  router,
  autoFromRouteMeta: true,
  // Global query params permitted on every route (optional)
  allowedKeys: ['lang', 'theme']
}))

app.use(router)
app.mount('#app')
```

---

## ⚡ Usage in VitePress

Add `initUrlCleaner` in your custom theme `.vitepress/theme/index.js`:

```javascript
import DefaultTheme from 'vitepress/theme'
import { initUrlCleaner } from 'vue-url-cleaner'

export default {
  ...DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window !== 'undefined') {
      // Strips query junk on boot and on route changes
      initUrlCleaner({ allowedKeys: [] }, router)
    }
  }
}
```

---

## 🧩 Usage in Nuxt 3

Create a client-side plugin `plugins/url-cleaner.client.js`:

```javascript
import { defineNuxtPlugin, useRouter } from '#app'
import { initUrlCleaner } from 'vue-url-cleaner'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  initUrlCleaner({ allowedKeys: ['lang'] }, router)
})
```

---

## 🛠️ Pure Utility (Node.js, SSR & Crawlers)

You can also use `sanitizeUrl` as a pure, stateless function without Vue:

```javascript
import { sanitizeUrl } from 'vue-url-cleaner'

const dirtyUrl = 'https://example.com/items?filter_color=gold&fbclid=999#specs'

const { cleanUrl, stripped, hasModifications } = sanitizeUrl(dirtyUrl, {
  allowedKeys: ['filter_color'],
  preserveHash: true
})

console.log(cleanUrl)
// Output: 'https://example.com/items?filter_color=gold#specs'

console.log(stripped)
// Output: { fbclid: ['999'] }
```

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `router` | `Router` | `undefined` | Vue Router instance for route change listening. |
| `allowedKeys` | `string[]` | `[]` | Whitelist of permitted query parameter names. |
| `allowedPatterns` | `RegExp[]` | `[]` | Whitelist of regex patterns for parameter names (e.g. `[/^filter_/]`). |
| `autoFromRouteMeta` | `boolean` | `true` | Reads permitted keys from `to.meta.allowedQuery`. |
| `preserveHash` | `boolean` | `true` | Preserves URL hash fragment (`#heading`). |
| `isAllowed` | `Function` | `undefined` | Custom predicate `(key, val) => boolean`. |
| `onStrip` | `Function` | `undefined` | Callback `(strippedParams, cleanUrl) => void`. |

---

## 🛡️ License

MIT © [Grzegorz Kućmierz](https://7u.pl)
