import { collection, fields } from "@keystatic/core";

export const categoriesKs = collection({
  label: "Categories",
  slugField: "title",
  path: "src/content/categories/*/index",
  format: { data: "json" },
  columns: ["sortOrder", "title"],
  schema: {
    title: fields.text({ label: "Category Name", validation: { isRequired: true } }),
    sortOrder: fields.number({
      label: "Sort Order",
      description: "Lower numbers appear first (e.g. 1 to 20). Defaults to 20.",
      defaultValue: 20,
      validation: {
        min: 1,
        max: 20,
      },
    }),
    subCategories: fields.array(
      fields.text({
        label: "Sub-category name",
      }),
      {
        label: "Sub-categories",
        description:
          "Type sub-category names here (e.g. 'Tax', 'Stocks'). These appear as children of this category in the website menu.",
        itemLabel: (props) => props.value || "New sub-category",
      }
    ),
  },
});
