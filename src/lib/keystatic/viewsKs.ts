import { collection, fields } from "@keystatic/core";

export const viewsKs = collection({
    label: "Pages (Views)",
    slugField: "slug",
    path: "src/content/views/*",
    format: { contentField: "content" },
    entryLayout: "form",
    schema: {
        slug: fields.text({
            label: "URL Slug / File Name",
            description: "Customize the URL path. Example: 'privacy-policy' or 'terms'.",
            validation: { isRequired: true },
        }),
        title: fields.text({ label: "Page Title", validation: { isRequired: true } }),
        sortOrder: fields.integer({
            label: "Sort Order",
            description: "Number between 1 and 20 to dictate order in footer links.",
            defaultValue: 20,
            validation: { isRequired: true, min: 1, max: 20 },
        }),
        seo: fields.object({
            metaTitle: fields.text({
                label: "Meta Title",
                description: "Limit of 60 characters",
                validation: { length: { max: 60 } },
            }),
            metaDescription: fields.text({
                label: "Meta Description",
                description: "Limit of 160 characters",
                multiline: true,
                validation: { length: { max: 160 } },
            }),
            metaKeywords: fields.text({
                label: "Meta Keywords",
                description: "Comma-separated keywords for SEO.",
            }),
        }),
        content: fields.mdx({
            label: "Content",
        }),
    },
});
