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

import cloudflare from "@astrojs/cloudflare";
import partytown from "@astrojs/partytown";
import astroPWA from "@vite-pwa/astro";

const { RUN_KEYSTATIC } = loadEnv(import.meta.env.MODE, process.cwd(), "");

const integrations = [
  mdx(), 
  sitemap(), 
  react(), 
  pagefind(),
  partytown({
    config: {
      forward: ["dataLayer.push", "firebase"],
    },
  }),
  astroPWA({
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,avif,webp,jpg}'],
      maximumFileSizeToCacheInBytes: 10000000,
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

  build: {
    // inlineStylesheets: 'always',
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