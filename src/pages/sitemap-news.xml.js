// @ts-nocheck
import { getCollection } from "astro:content";
import { SITE } from "../lib/config";

/**
 * Google News Sitemap Protocol:
 * 1. Must only contain articles from the last 2 days (48 hours).
 * 2. Limited to 1,000 URLs per sitemap.
 */
export async function GET() {
    const articles = await getCollection("articles");
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const newsArticles = articles
        .filter(a => !a.data.isDraft)
        .filter(a => new Date(a.data.publishedTime) >= fortyEightHoursAgo)
        .sort((a, b) => new Date(b.data.publishedTime).getTime() - new Date(a.data.publishedTime).getTime())
        .slice(0, 1000);

    const entries = newsArticles.map((article) => {
        const pubDate = new Date(article.data.publishedTime).toISOString();
        const title = article.data.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return `
  <url>
    <loc>${SITE.url}/articles/${article.id}/</loc>
    <news:news>
      <news:publication>
        <news:name>${SITE.title}</news:name>
        <news:language>${SITE.locale.split('-')[0]}</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`.trim();
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${entries}
</urlset>`.trim();

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
