import { config } from "@keystatic/core";
import { articlesKs, authorsKs, categoriesKs, viewsKs } from "./src/lib/keystatic";

// Force correct Client ID to override environment variable issues
if (typeof process !== 'undefined') {
  process.env.KEYSTATIC_GITHUB_CLIENT_ID = "Iv23liJA49xpruzfKcet";
}

export default config({
  storage:
    process.env.NODE_ENV === "development" || process.env.KEYSTATIC_STORAGE_KIND === "local"
      ? { kind: "local" }
      : {
        kind: "github",
        repo: {
          owner: "hasnainali-creator",
          name: "website",
        },
      },
  ui: {
    brand: {
      name: "OmnySports",
    },
    navigation: ["---", "articles", "---", "authors", "categories", "---", "views"],
  },
  collections: {
    articles: articlesKs,
    authors: authorsKs,
    categories: categoriesKs,
    views: viewsKs,
  },

});

