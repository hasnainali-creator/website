import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { modifiedTime, readingTime } from "./src/lib/utils/remarks.mjs";
import { SITE } from "./src/lib/config";
import keystatic from "@keystatic/astro";
import react from "@astrojs/react";
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
    manifest: false, // Using public manifest if exists
    workbox: {
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365
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
  integrations.push(react());
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
    defaultStrategy: 'hover'
  },

  markdown: {
    remarkPlugins: [readingTime, modifiedTime],
  },

  image: {
    responsiveStyles: true,
    breakpoints: [640, 1024, 1280],
    service: {
      entrypoint: "astro/assets/services/sharp"
    }
  },

  integrations,

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  adapter: cloudflare()
});