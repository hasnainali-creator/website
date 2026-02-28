// @ts-nocheck
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE } from "../lib/config";

export async function GET(context) {
  const articles = await getCollection("articles");

  // Sort articles by date descending
  const sortedArticles = articles
    .filter(a => !a.data.isDraft)
    .sort((a, b) => new Date(b.data.publishedTime).getTime() - new Date(a.data.publishedTime).getTime());

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    xmlns: {
      media: "http://search.yahoo.com/mrss/",
    },
    items: sortedArticles.map((article) => {
      // Construct a probable public URL for the image
      // Note: This assumes images are in /src/assets/images/articles/[slug]/cover.[ext]
      // In a production build, these are moved. For the RSS-to-Push flow, 
      // we'll provide the slug so the worker can eventually "guess" or we use a better method.
      // Better strategy: Use a helper to get the processed URL if possible, 
      // or for now, use the slug-based path if we can rely on it.

      const imageUrl = `${context.site.origin}/_astro/${article.id}/cover.avif`; // This is a guess, let's be more robust.

      return {
        title: article.data.title,
        pubDate: article.data.publishedTime,
        description: article.data.description,
        link: `/articles/${article.id}/`,
        customData: `<media:content url="${context.site.origin}/og/${article.id}.png" medium="image" type="image/png" />`,
      };
    }),
  });
}
