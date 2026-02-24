import { collection, fields } from "@keystatic/core";

export const viewsKs = collection({
    label: "Pages (Views)",
    slugField: "title",
    path: "src/content/views/*",
    format: { contentField: "content" },
    entryLayout: "form",
    schema: {
        title: fields.slug({ name: { label: "Title" } }),
        description: fields.text({ label: "Description" }),
        blocks: fields.array(
            fields.object({
                name: fields.text({ label: "Block Name" }),
                title: fields.text({ label: "Block Title" }),
            }),
            {
                label: "Blocks (for header/meta)",
                itemLabel: (props) => props.fields?.name.value ?? "Block",
            }
        ),
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
