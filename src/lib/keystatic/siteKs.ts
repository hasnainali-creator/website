import { singleton, fields } from "@keystatic/core";

export const siteKs = singleton({
    label: "Site Settings",
    path: "src/content/site/index",
    format: { data: "json" },
    schema: {
        navigation: fields.array(
            fields.relationship({
                label: "Category",
                collection: "categories",
            }),
            {
                label: "Main Navigation (Category Order)",
                description: "Arrange categories in the order you want them to appear on the website.",
                itemLabel: (props) => props.value || "Select a category",
                validation: { length: { min: 1 } },
            }
        ),
    },
});
