import { getCollection } from "astro:content";

const articlesCollection = (
  await getCollection("articles", ({ data }) => {
    return data.isDraft !== true && new Date(data.publishedTime) <= new Date();
  })
).sort((a, b) =>
  new Date(b.data.publishedTime)
    .toISOString()
    .localeCompare(new Date(a.data.publishedTime).toISOString())
);

export const articlesHandler = {
  allArticles: () => articlesCollection,

  mainHeadline: () => {
    const article = articlesCollection.find((article) => {
      if (!article.data.publishing) {
        console.warn(`Article ${article.id} is missing publishing data!`, article.data);
        return false;
      }
      return article.data.publishing.isMainHeadline === true;
    });
    if (!article) {
      // Fallback to the latest article if no main headline is set
      return articlesCollection[0];
    }
    return article;
  },

  subHeadlines: () => {
    const mainHeadline = articlesHandler.mainHeadline();
    const subHeadlines = articlesCollection
      .filter((article) => {
        if (!article.data.publishing) return false;
        return article.data.publishing.isSubHeadline === true &&
          mainHeadline?.id !== article.id;
      })
      .slice(0, 4);

    return subHeadlines;
  },
};
