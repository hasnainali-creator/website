import { getCollection } from "astro:content";

async function getArticles() {
  const rawArticles = await getCollection("articles", ({ data }) => {
    return data.isDraft !== true;
  });

  return rawArticles.map(a => ({
    ...a,
    data: {
      ...a.data,
      title: a.data.title || a.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  })).sort((a, b) =>
    new Date(b.data.publishedTime)
      .toISOString()
      .localeCompare(new Date(a.data.publishedTime).toISOString())
  );
}

export const articlesHandler = {
  allArticles: () => getArticles(),

  mainHeadline: async () => {
    const articlesCollection = await getArticles();
    const article = articlesCollection.find((article) => {
      if (!article.data.publishing) {
        console.warn(`Article ${article.id} is missing publishing data!`, article.data);
        return false;
      }
      return article.data.publishing.isMainHeadline === true;
    });
    if (!article) {
      return articlesCollection[0];
    }
    return article;
  },

  subHeadlines: async () => {
    const articlesCollection = await getArticles();
    const mainHeadline = await articlesHandler.mainHeadline();
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
