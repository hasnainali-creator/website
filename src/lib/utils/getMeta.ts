import { render, type CollectionEntry } from "astro:content";
import { authorsHandler } from "@/lib/handlers/authors";
import { SITE } from "@/lib/config";
import defaultImage from "@/assets/images/default-image.jpg";
import type { ArticleMeta, Meta } from "@/lib/types";
import { capitalizeFirstLetter } from "@/lib/utils/letter";
import { normalizeDate } from "@/lib/utils/date";

type GetMetaCollection = CollectionEntry<"articles" | "views">;

const renderCache = new Map<string, any>();

export const getMeta = async (
  collection: GetMetaCollection,
  category?: string
): Promise<Meta | ArticleMeta> => {
  try {
    const collectionId = `${collection.collection}-${collection.id}`;

    if (collection.collection === "articles") {

      if (renderCache.has(collectionId)) {
        return renderCache.get(collectionId);
      }

      const { remarkPluginFrontmatter } = await render(collection);
      const authors = authorsHandler.getAuthors(collection.data.authors);

      const metaTitle = collection.data.seo?.metaTitle || collection.data.title;
      const metaDescription = collection.data.seo?.metaDescription || collection.data.description;

      const meta: ArticleMeta = {
        title: metaTitle.includes(SITE.title) ? metaTitle : `${metaTitle} | ${SITE.title}`,
        metaTitle: metaTitle,
        description: metaDescription,
        ogImage: collection.data.cover.src,
        ogImageAlt: collection.data.coverAlt || collection.data.title,
        publishedTime: normalizeDate(collection.data.publishedTime),
        lastModified: remarkPluginFrontmatter.lastModified,
        authors: authors.map((author) => ({
          name: author.data.name,
          link: `${author.id}`,
        })),
        type: "article",
        tags: collection.data.tags || [],
        keywords: collection.data.seo?.metaKeywords || [
          ...(collection.data.tags || []),
          ...collection.data.category.map(c => c.discriminant)
        ].join(", "),
        breadcrumbs: [
          {
            label: capitalizeFirstLetter(collection.data.category[0]?.discriminant || "uncategorized"),
            url: `/categories/${collection.data.category[0]?.discriminant || "uncategorized"}/1`
          },
          { label: collection.data.title, url: `/articles/${collection.id}` }
        ]
      };

      renderCache.set(collectionId, meta);

      return meta;
    }

    if (collection.collection === "views") {

      const cacheKey = category ? `${collectionId}-${category}` : collectionId;
      if (renderCache.has(cacheKey)) {
        return renderCache.get(cacheKey);
      }

      const metaTitle = collection.data.seo?.metaTitle || collection.data.title;
      const metaDescription = collection.data.seo?.metaDescription || collection.data.description;

      const title = collection.id === "categories" && category
        ? `${capitalizeFirstLetter(category)} | ${SITE.title}`
        : collection.id === "home"
          ? (metaTitle === SITE.title ? `${SITE.title} | ${SITE.description.slice(0, 50)}...` : metaTitle)
          : `${metaTitle} | ${SITE.title}`;

      const meta: Meta = {
        title,
        metaTitle: metaTitle,
        description: metaDescription,
        ogImage: defaultImage.src,
        ogImageAlt: SITE.title,
        type: "website",
      };
      renderCache.set(cacheKey, meta);
      return meta;
    }

    throw new Error(`Invalid collection type: ${(collection as GetMetaCollection).collection}`);
  } catch (error) {
    console.error(`Error generating metadata for ${collection.id}:`, error);
    throw error;
  }
};
