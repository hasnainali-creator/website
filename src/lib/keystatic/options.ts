// Function to get categories and subcategories dynamically from the filesystem
export function getDynamicCategories() {
    try {
        const categoryFiles = import.meta.glob('/src/content/categories/*/index.json', { eager: true });

        return Object.entries(categoryFiles).map(([filepath, content]: [string, any]) => {
            const parts = filepath.split('/');
            const catId = parts[parts.length - 2];

            let title = catId.charAt(0).toUpperCase() + catId.slice(1);
            let subs: string[] = [];

            const data = content.default || content;
            if (data) {
                title = data.title || title;
                if (Array.isArray(data.subCategories)) {
                    subs = data.subCategories;
                }
            }

            return {
                id: catId,
                title,
                subCategories: subs
            };
        });
    } catch (e) {
        console.error("Error reading categories via glob", e);
        return [];
    }
}

const cats = getDynamicCategories();

export const categoryOptions = cats.map(c => ({ label: c.title, value: c.id }));

export const subCategoryFields: Record<string, { label: string; options: readonly { label: string; value: string }[]; defaultValue: string } | null> = Object.fromEntries(
    cats.map(c => [
        c.id,
        c.subCategories.length > 0
            ? ({
                label: "Sub-category",
                options: c.subCategories.map((s: string) => ({ label: s, value: s })),
                defaultValue: c.subCategories[0]
            })
            : null
    ])
);
