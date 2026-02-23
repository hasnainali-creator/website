// @ts-nocheck
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { modifiedTime, readingTime } from "./src/lib/utils/remarks.mjs";
import { SITE } from "./src/lib/config";
import keystatic from "@keystatic/astro";
import react from "@astrojs/react";
import pagefind from "astro-pagefind";

import cloudflare from "@astrojs/cloudflare";

const IS_DEV = import.meta.env.MODE === "development";

const integrations = [mdx(), sitemap(), pagefind()];

if (IS_DEV) {
  integrations.push(react());
  integrations.push(keystatic());
}

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  base: SITE.basePath,

  markdown: {
    remarkPlugins: [readingTime, modifiedTime],
  },

  image: {
    responsiveStyles: true,
    breakpoints: [640, 1024],
  },

  integrations,

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare()
});