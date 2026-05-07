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

// Zenith Production Strategy: Standardized Cloudflare Adapter for Infinite Scale
const adapter = cloudflare({
  imageService: "compile",
  platformProxy: { enabled: false }
});

const { RUN_KEYSTATIC } = loadEnv(import.meta.env.MODE, process.cwd(), "");

const integrations = [
  mdx(),
  sitemap(),
  react(),
  pagefind(),
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


  build: {
    // Absolute Render Unblocking: Forces all CSS directly into the HTML to eliminate network requests
    inlineStylesheets: 'always'
  },

  markdown: {
    remarkPlugins: [readingTime, modifiedTime],
  },

  image: {
    responsiveStyles: true,
    breakpoints: [640, 768, 1024, 1280, 1920, 2560],
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

  adapter,
});

// Deployment Trigger: 2026-03-10 01:35 - Force Bun Build Strategy Sync