import { getCollection } from "astro:content";

async function getAuthorsCollection() {
  return await getCollection("authors");
}

export const authorsHandler = {
  allAuthors: () => getAuthorsCollection(),
  limitAuthors: async (limit: number) => {
    const authors = await getAuthorsCollection();
    return authors.slice(0, limit);
  },
  getAuthors: async (authorsRefs: { collection: string; id: string }[]) => {
    const authors = await getAuthorsCollection();
    return authorsRefs.map(({ id }) => {
      const author = authors.find((a) => a.id === id);
      if (!author) {
        throw new Error(`Author ${id} not found`);
      }
      return author;
    });
  },
  findAuthor: async (id: string) => {
    const authors = await getAuthorsCollection();
    const author = authors.find((a) => a.id === id);
    if (!author) {
      throw new Error(`Author ${id} not found`);
    }
    return author;
  },
};
