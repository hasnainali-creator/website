// Function to get categories and subcategories dynamically from the filesystem for Keystatic options
export function getDynamicCategories() {
    try {
        // We use import.meta.glob to find index.json files in categories
        // This runs at build time/dev time to populate Keystatic's schema fields
        const categoryFiles = import.meta.glob('/src/content/categories/*/index.json', { eager: true });
        const fileKeys = Object.keys(categoryFiles);

        return fileKeys.map((filepath) => {
            const content: any = categoryFiles[filepath];
            // Extract the category ID from the path (folder name)
            const parts = filepath.split(/[\\\/]/);
            const catId = parts[parts.length - 2];

            // Default title is the slugified folder name
            let title = catId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let subs: string[] = [];

            const data = content.default || content;
            if (data) {
                // If title exists in JSON, use it, otherwise keep the folder name title
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
        console.error("Error reading categories via dynamic glob:", e);
        return [];
    }
}

const cats = getDynamicCategories();

export const categoryOptions = cats.map(c => ({ label: c.title, value: c.id }));

export const subCategoryFields: Record<string, any> = Object.fromEntries(
    cats.map(c => [
        c.id,
        {
            label: "Sub-category",
            options: [
                { label: "None", value: "" },
                ...c.subCategories.map((s: string) => ({ label: s, value: s }))
            ],
            defaultValue: ""
        }
    ])
);
