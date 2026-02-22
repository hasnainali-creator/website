import { articlesKs, authorsKs, categoriesKs, viewsKs } from "./src/lib/keystatic";
import { config } from "@keystatic/core";

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

