import { collection, fields } from "@keystatic/core";

export const categoriesKs = collection({
  label: "Categories",
  slugField: "title",
  path: "src/content/categories/*/",
  format: { data: "json" },
  schema: {
    title: fields.slug({
      name: {
        label: "Category Name",
        description: "Enter the name of the category.",
      },
    }),
    parent: fields.relationship({
      label: "Parent Category",
      description:
        "Optional. Select a parent to make this a sub-category.",
      collection: "categories",
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
