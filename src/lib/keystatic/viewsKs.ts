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
        content: fields.mdx({
            label: "Content",
        }),
    },
});
