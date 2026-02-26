import { getCollection } from "astro:content";
import { toSlug } from "@/lib/utils";

// Helper to extract parent ID from the parent field
function getParentId(category: any): string | null {
    const parent = category.data.parent;
    if (!parent) return null;
    if (typeof parent === 'string') return parent;
    if (typeof parent === 'object' && parent !== null && 'id' in parent) return (parent as any).id;
    return null;
}

const normalizeId = (id: string) => id.toLowerCase().trim().replace(/\\/g, "/").replace(/\/index$/, "").replace(/\/$/, "");

// Normalize category data: handles both single object and array formats
type CategoryItem = { discriminant: string; value?: string | null };
export function normalizeCategoryData(category: any): CategoryItem[] {
    if (!category) return [];
    if (Array.isArray(category)) return category;
    if (typeof category === 'object' && 'discriminant' in category) return [category];
    return [];
}

export const categoriesHandler = {
    getCollection: () => getCollection('categories'),

    getProvider: async () => {
        const categoriesCollection = await getCollection('categories');
        const allArticles = await getCollection('articles', ({ data }) => data.isDraft !== true);

        // Crucial: Create a safe collection where every category is GUARANTEED to have a title.
        // If Keystatic omits the title field, we fall back to the folder name (ID).
        const safeCategories = categoriesCollection.map(c => ({
            ...c,
            data: {
                ...c.data,
                title: c.data.title || c.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            }
        }));

        // Sort by sortOrder (lowest first), then by title
        const sortedCategories = [...safeCategories].sort((a, b) => {
            const orderA = a.data.sortOrder ?? 99;
            const orderB = b.data.sortOrder ?? 99;
            if (orderA !== orderB) return orderA - orderB;
            return a.data.title.localeCompare(b.data.title);
        });

        const helper = {
            oneCategory: (categoryId: string) => {
                const nid = normalizeId(categoryId);
                const category = sortedCategories.find((c) => normalizeId(c.id) === nid);
                if (!category) {
                    console.warn(`Category "${categoryId}" not found.`);
                    return sortedCategories[0] || { id: "uncategorized", data: { title: "Uncategorized" } };
                }
                return category;
            },
            allCategories: () => sortedCategories,
            getDisplayPath: (categoryId: string) => {
                const nid = normalizeId(categoryId);
                const category = sortedCategories.find((c) => normalizeId(c.id) === nid);
                if (!category) return "Uncategorized";

                const parentId = getParentId(category);
                if (parentId) {
                    const pnid = normalizeId(parentId);
                    const parent = sortedCategories.find((c) => normalizeId(c.id) === pnid);
                    if (parent) {
                        return `${parent.data.title} / ${category.data.title}`;
                    }
                }
                return category.data.title;
            },
            isDescendantOf: (candidateId: string, targetId: string): boolean => {
                let currentId: string | null = candidateId;
                const targetNid = normalizeId(targetId);
                const visited = new Set<string>();

                while (currentId && !visited.has(normalizeId(currentId))) {
                    const currentNid = normalizeId(currentId);
                    visited.add(currentNid);
                    const cat = sortedCategories.find(c => normalizeId(c.id) === currentNid);
                    if (!cat) break;

                    const parentId = getParentId(cat);
                    if (parentId && normalizeId(parentId) === targetNid) return true;
                    currentId = parentId;
                }
                return false;
            },
            getLatestArticles: (categoryId: string, limit = 5) => {
                const catNid = normalizeId(categoryId);
                return allArticles
                    .filter((article) => {
                        const cats = normalizeCategoryData(article.data.category);
                        return cats.some(c => normalizeId(c.discriminant) === catNid);
                    })
                    .sort((a, b) => new Date(b.data.publishedTime).getTime() - new Date(a.data.publishedTime).getTime())
                    .slice(0, limit);
            }
        };

        return {
            categories: sortedCategories,
            ...helper,
            getNestedCategories: () => {
                return sortedCategories.map(parent => {
                    const subs: string[] = parent.data.subCategories || [];
                    const virtualChildren = subs
                        .map(name => ({
                            id: `/categories/${parent.id}/${toSlug(name)}`,
                            data: { title: name },
                            isVirtual: true
                        }));

                    return {
                        ...parent,
                        children: virtualChildren,
                    };
                });
            }
        };
    }
};
