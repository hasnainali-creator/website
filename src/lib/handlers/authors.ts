import { getCollection } from "astro:content";

async function getAuthorsCollection() {
  return await getCollection("authors");
}

function formatNameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const FALLBACK_AUTHOR = {
  id: "team",
  collection: "authors",
  data: {
    name: "OmnySports Team",
    job: "Editorial Contributor",
    bio: "Dedicated to bringing you the latest in sports and technology news.",
    social: [],
  },
} as any;

export const authorsHandler = {
  allAuthors: async () => {
    const authors = await getAuthorsCollection();
    return authors.map((author) => {
      if (author.data.name === "Unknown Author" || !author.data.name) {
        author.data.name = formatNameFromSlug(author.id);
      }
      return author;
    });
  },
  limitAuthors: async (limit: number) => {
    const authors = await authorsHandler.allAuthors();
    return authors.slice(0, limit);
  },
  getAuthors: async (authorsRefs: any[]) => {
    const allAuthors = await authorsHandler.allAuthors();
    return authorsRefs.map((ref) => {
      const id = typeof ref === "string" ? ref : ref.id;
      const author = allAuthors.find((a) => a.id === id);
      if (!author) {
        console.warn(`Author reference "${id}" not found. Falling back to default Team author.`);
        return { ...FALLBACK_AUTHOR, id };
      }
      return author;
    });
  },
  findAuthor: async (id: string) => {
    const allAuthors = await authorsHandler.allAuthors();
    const author = allAuthors.find((a) => a.id === id);
    if (!author) {
      console.warn(`Author "${id}" not found. Falling back to default Team author.`);
      return { ...FALLBACK_AUTHOR, id };
    }
    return author;
  },
  renderAuthor: async (author: any) => {
    if (author.id === "team") {
      return {
        Content: () => null,
        headings: [],
        remarkPluginFrontmatter: {},
      };
    }
    try {
      const { render } = await import("astro:content");
      return await render(author);
    } catch (e) {
      console.error("Error rendering author content:", e);
      return {
        Content: () => null,
        headings: [],
        remarkPluginFrontmatter: {},
      };
    }
  },
};
