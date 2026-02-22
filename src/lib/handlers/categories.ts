import { getCollection } from "astro:content";
import { articlesHandler } from "./articles";

const categoriesCollection = await getCollection('categories');

// Helper to extract parent ID from the parent field
function getParentId(category: typeof categoriesCollection[number]): string | null {
    const parent = category.data.parent;
    if (!parent) return null;
    if (typeof parent === 'string') return parent;
    if (typeof parent === 'object' && parent !== null && 'id' in parent) return (parent as any).id;
    return null;
}

import { toSlug } from "@/lib/utils";

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
    // Legacy support or internal use
    getCollection: () => getCollection('categories'),

    // The NEW preferred way: fetch once, use synchronously
    getProvider: async () => {
        const categoriesCollection = await getCollection('categories');
        const allArticles = await getCollection('articles', ({ data }) => data.isDraft !== true);

        const helper = {
            oneCategory: (categoryId: string) => {
                const nid = normalizeId(categoryId);
                const category = categoriesCollection.find((c) => normalizeId(c.id) === nid);
                if (!category) {
                    console.warn(`Category "${categoryId}" (normalized: "${nid}") not found. Available normalized IDs: ${categoriesCollection.map(c => normalizeId(c.id)).join(", ")}`);
                    return categoriesCollection[0] || { id: "uncategorized", data: { title: "Uncategorized" } };
                }
                return category;
            },
            getDisplayPath: (categoryId: string) => {
                const nid = normalizeId(categoryId);
                const category = categoriesCollection.find((c) => normalizeId(c.id) === nid);
                if (!category) return "Uncategorized";

                const parentId = getParentId(category);
                if (parentId) {
                    const pnid = normalizeId(parentId);
                    const parent = categoriesCollection.find((c) => normalizeId(c.id) === pnid);
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
                    const cat = categoriesCollection.find(c => normalizeId(c.id) === currentNid);
                    if (!cat) break;

                    const parentId = getParentId(cat);
                    if (parentId && normalizeId(parentId) === targetNid) return true;
                    currentId = parentId;
                }
                return false;
            },
            getLatestArticles: (categoryId: string) => {
                const catNid = normalizeId(categoryId);
                return allArticles.filter((article) => {
                    const cats = normalizeCategoryData(article.data.category);
                    return cats.some(c => normalizeId(c.discriminant) === catNid);
                });
            }
        };

        return {
            categories: categoriesCollection.sort((a, b) => a.data.title.localeCompare(b.data.title)),
            ...helper,
            getNestedCategories: () => {
                const topLevel = categoriesCollection
                    .filter(c => !getParentId(c))
                    .sort((a, b) => a.data.title.localeCompare(b.data.title));

                return topLevel.map(parent => {
                    const parentNid = normalizeId(parent.id);
                    const relationChildren = categoriesCollection
                        .filter(c => {
                            const pid = getParentId(c);
                            return pid && normalizeId(pid) === parentNid;
                        })
                        .sort((a, b) => a.data.title.localeCompare(b.data.title));

                    const subs: string[] = (parent.data as any).subCategories || [];
                    const existingTitles = new Set(relationChildren.map(c => c.data.title));
                    const virtualChildren = subs
                        .filter(name => !existingTitles.has(name))
                        .map(name => ({
                            id: `/categories/${parent.id}/${toSlug(name)}`,
                            data: { title: name },
                            isVirtual: true
                        }));

                    return {
                        ...parent,
                        children: [...relationChildren, ...virtualChildren],
                    };
                });
            }
        };
    }
}
