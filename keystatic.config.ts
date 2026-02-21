import { articlesKs, authorsKs, categoriesKs, viewsKs } from "./src/lib/keystatic";
import { config } from "@keystatic/core";

export default config({
  storage: {
    kind: "local",
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
