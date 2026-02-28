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
      // Resolve the cover image source correctly
      const imageUrl = article.data.cover?.src;
      const absoluteImageUrl = imageUrl
        ? (imageUrl.startsWith('http') ? imageUrl : `${context.site.origin}${imageUrl}`)
        : `${context.site.origin}/favicon-96x96.png`;

      return {
        title: article.data.title,
        pubDate: article.data.publishedTime,
        description: article.data.description,
        link: `/articles/${article.id}/`,
        customData: `<media:content url="${absoluteImageUrl}" medium="image" />`,
      };
    }),
  });
}
