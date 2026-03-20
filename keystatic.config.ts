import { config } from "@keystatic/core";
import { articlesKs, authorsKs, categoriesKs, viewsKs } from "./src/lib/keystatic";

export default config({
  storage: { kind: "local" },
  ui: {
    brand: {
      name: "OmnySports",
    },
    navigation: ["---", "articles", "---", "editorial", "categories", "---", "views"],
  },
  collections: {
    articles: articlesKs,
    editorial: authorsKs,
    categories: categoriesKs,
    views: viewsKs,
  },
});
