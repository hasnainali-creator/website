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
import partytown from "@astrojs/partytown";

import cloudflare from "@astrojs/cloudflare";

const IS_DEV = import.meta.env.MODE === "development";

const integrations = [
  mdx(),
  sitemap(),
  pagefind(),
  compress({
    CSS: true,
    HTML: {
      "remove-comments": true,
    },
    Image: false, // Already optimized via astro:assets
    JavaScript: true,
    SVG: true,
  }),
  partytown({
    config: {
      forward: ["dataLayer.push"],
    },
  }),
];

if (IS_DEV) {
  integrations.push(react());
  integrations.push(keystatic());
}

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  base: SITE.basePath,

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },

  markdown: {
    remarkPlugins: [readingTime, modifiedTime],
  },

  image: {
    responsiveStyles: true,
    breakpoints: [640, 1024],
    service: {
      entrypoint: "astro/assets/services/sharp"
    }
  },

  integrations,

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare()
});