// @ts-nocheck
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { modifiedTime, readingTime } from "./src/lib/utils/remarks.mjs";
import { SITE } from "./src/lib/config";
import keystatic from "@keystatic/astro";
import react from "@astrojs/react";
import { loadEnv } from "vite";
import pagefind from "astro-pagefind";
import partytown from "@astrojs/partytown";

import cloudflare from "@astrojs/cloudflare";
import astroPWA from "@vite-pwa/astro";

const { RUN_KEYSTATIC } = loadEnv(import.meta.env.MODE, process.cwd(), "");

const integrations = [
  mdx(), 
  sitemap(), 
  react(), 
  pagefind(),
  // NOTE: Partytown REMOVED — its service worker uses deprecated APIs
  // (SharedStorage, AttributionReporting) causing Best Practices = 81%.
  // Will re-add when Ads/Analytics are actually integrated.
  astroPWA({
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,avif,webp,jpg}'],
      maximumFileSizeToCacheInBytes: 10000000,
      runtimeCaching: [
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images-cache',
            expiration: { maxEntries: 100, maxAgeSeconds: 365 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] }
          }
        },
        {
          urlPattern: /\.(?:woff2|woff|ttf|otf)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'fonts-cache',
            expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] }
          }
        },
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'pages-cache',
            expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] }
          }
        }
      ]
    },
    manifest: {
      name: SITE.title,
      short_name: SITE.title,
      description: SITE.description,
      theme_color: '#ffffff',
      icons: [
        {
          src: 'favicon-96x96.png',
          sizes: '96x96',
          type: 'image/png'
        }
      ]
    }
  })
];

if (RUN_KEYSTATIC === "true") {
  integrations.push(keystatic());
}

// https://astro.build/config
export default defineConfig({
  cacheDir: './node_modules/.astro',
  site: SITE.url,
  base: SITE.basePath,

  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },

  build: {
    // Absolute Render Unblocking: Forces all CSS directly into the HTML to eliminate network requests
    inlineStylesheets: 'always'
  },

  markdown: {
    remarkPlugins: [readingTime, modifiedTime],
  },

  image: {
    responsiveStyles: true,
    breakpoints: [640, 1280],
  },

  integrations,

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Zenith Mobile: Removing Terser because it causes 'Minify JavaScript' Lighthouse warnings.
      // Vite's default esbuild is significantly faster for mobile parsing and minifies better.
    },
    server: {
      watch: {
        // Only ignore the output file, don't ignore content!
        ignored: ['**/keystatic-output.html']
      }
    }
  },

  adapter: cloudflare({
    imageService: "compile",
    platformProxy: {
      enabled: false
    }
  })
});

// Deployment Trigger: 2026-03-10 01:35 - Force Bun Build Strategy Sync