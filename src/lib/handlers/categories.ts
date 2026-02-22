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

export const categoriesHandler = {
    allCategories: () => categoriesCollection.sort((a, b) => a.data.title.localeCompare(b.data.title)),
    oneCategory: (categoryId: string) => {
        const category = categoriesCollection.find((category) => category.id === categoryId);
        if (!category) {
            console.warn(`Category with id ${categoryId} not found, using fallback.`);
            return categoriesCollection[0];
        }
        return category;
    },
    getCategoryDisplayPath: (categoryId: string) => {
        const category = categoriesCollection.find((c) => c.id === categoryId);
        if (!category) return "Uncategorized";

        const parentId = getParentId(category);
        if (parentId) {
            const parent = categoriesCollection.find((c) => c.id === parentId);
            if (parent) {
                return `${parent.data.title} / ${category.data.title}`;
            }
        }
        return category.data.title;
    },
    isDescendantOf: (candidateId: string, targetId: string): boolean => {
        let currentId: string | null = candidateId;
        const visited = new Set<string>(); // Prevent loops

        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const cat = categoriesCollection.find(c => c.id === currentId);
            if (!cat) break;

            const parentId = getParentId(cat);
            if (parentId === targetId) return true;
            currentId = parentId;
        }
        return false;
    },
    allCategoriesWithLatestArticles: () => {
        return categoriesCollection.map((category) => {
            const articles = articlesHandler.allArticles()
                .filter((article) => article.data.category.discriminant === category.id);
            return {
                ...category,
                data: {
                    ...category.data,
                    count: articles.length,
                    latestArticles: articles.slice(0, 3)
                }
            }
        })
    },
    getNestedCategories: () => {
        const topLevel = categoriesCollection
            .filter(c => !getParentId(c))
            .sort((a, b) => a.data.title.localeCompare(b.data.title));

        return topLevel.map(parent => {
            // Source 1: Real collection entries that have this as parent
            const relationChildren = categoriesCollection
                .filter(c => getParentId(c) === parent.id)
                .sort((a, b) => a.data.title.localeCompare(b.data.title));

            // Source 2: Sub-categories typed in the array field
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
}
