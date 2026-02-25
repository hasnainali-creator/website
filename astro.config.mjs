import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { modifiedTime, readingTime } from "./src/lib/utils/remarks.mjs";
import { SITE } from "./src/lib/config";
import keystatic from "@keystatic/astro";
import preact from "@astrojs/preact";
import pagefind from "astro-pagefind";
import compress from "astro-compress";
import AstroPWA from '@vite-pwa/astro';

import cloudflare from "@astrojs/cloudflare";

const IS_DEV = import.meta.env.MODE === "development";

const integrations = [
  mdx(),
  sitemap(),
  pagefind(),
  AstroPWA({
    registerType: 'autoUpdate',
    injectRegister: false,
    manifest: false,
    workbox: {
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      runtimeCaching: [
        {
          // Google Fonts - Cache forever
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365
            }
          }
        },
        {
          // HTML pages - Show cached instantly, update in background
          urlPattern: /\/(?:articles|categories|authors)\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'pages-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 7
            }
          }
        },
        {
          // Optimized Images - Cache first for speed
          urlPattern: /\/_astro\/.*\.(?:avif|webp|jpg|jpeg|png|gif)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30
            }
          }
        },
        {
          // Static assets (JS, CSS) - Cache first
          urlPattern: /\/_astro\/.*\.(?:js|css)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'static-assets-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30
            }
          }
        }
      ]
    }
  }),
  compress({
    CSS: true,
    HTML: {
      "html-minifier-terser": {
        removeComments: true,
        collapseWhitespace: true,
      }
    },
    Image: false,
    JavaScript: true,
    SVG: true,
  })
];

if (IS_DEV) {
  integrations.push(preact());
  integrations.push(keystatic());
}

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  base: SITE.basePath,

  build: {
    inlineStylesheets: 'always'
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'tap'
  },

  markdown: {
    remarkPlugins: [readingTime, modifiedTime],
  },

  image: {
    responsiveStyles: true,
    breakpoints: [640, 1024, 1280, 2560],
    service: {
      entrypoint: "astro/assets/services/sharp"
    }
  },

  integrations,

  vite: {
    // @ts-ignore - Vite version mismatch between Astro core and tailwindcss/vite
    plugins: [
      ...tailwindcss(),
    ],
  },

  adapter: cloudflare({
    imageService: 'compile'
  })
});