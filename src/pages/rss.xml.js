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
      dc: "http://purl.org/dc/elements/1.1/"
    },
    lastBuildDate: new Date(),
    customData: `
      <language>${SITE.locale.toLowerCase()}</language>
      <ttl>60</ttl>
    `.trim(),
    items: sortedArticles.map((article) => {
      // Resolve the cover image source correctly (Ensure large 1200px+ images for Discover)
      const imageUrl = article.data.cover?.src;
      const absoluteImageUrl = imageUrl
        ? (imageUrl.startsWith('http') ? imageUrl : `${SITE.url}${imageUrl}`)
        : `${SITE.url}/omnysports-logo.png`;

      // Google News Center Protocol: Absolute links are mandatory
      const articleLink = `${SITE.url}/articles/${article.id}/`;

      // Google News Publisher Center prefers exact author & categories
      const categoryTags = article.data.category ? article.data.category.map(cat => `<category>${cat}</category>`).join('') : '';
      const authors = article.data.authors ? article.data.authors.map(a => `<dc:creator>${a.name}</dc:creator>`).join('') : `<dc:creator>${SITE.author}</dc:creator>`;

      return {
        title: article.data.title,
        pubDate: article.data.publishedTime,
        description: article.data.description,
        link: articleLink,
        guid: articleLink,
        items: [
          {
            content: article.data.description,
          }
        ],
        customData: `
          <content:encoded><![CDATA[${article.data.description}]]></content:encoded>
          ${categoryTags}
          ${authors}
          <media:content url="${absoluteImageUrl}" medium="image" width="1200" height="675" />
        `.trim(),
      };
    }),
  });
}
