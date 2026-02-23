import { config } from "@keystatic/core";
import { articlesKs, authorsKs, categoriesKs, viewsKs } from "./src/lib/keystatic";

export default config({
  storage: { kind: "local" },
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

