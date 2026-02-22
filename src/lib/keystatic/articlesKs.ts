import { collection, fields } from "@keystatic/core";
import { categoryOptions, subCategoryFields } from "./options";

export const articlesKs = collection({
  label: "Articles",
  slugField: "title",
  path: "src/content/articles/*/",
  format: { contentField: "content" },
  entryLayout: "form",
  schema: {
    isDraft: fields.checkbox({
      label: "Is this a draft?",
      defaultValue: false,
    }),
    publishing: fields.object({
      isMainHeadline: fields.checkbox({
        label: "Is this a main headline?",
        defaultValue: false,
      }),
      isSubHeadline: fields.checkbox({
        label: "Is this a sub headline?",
        defaultValue: false,
      }),
      isFeatured: fields.checkbox({
        label: "Is Featured?",
        description: "Show this article in the featured section.",
        defaultValue: false,
      }),
    }),
    description: fields.text({
      label: "Description (Summary)",
      validation: { isRequired: true, length: { max: 160 } },
    }),
    title: fields.slug({
      name: { label: "Title", validation: { length: { max: 60 } } },
    }),
    cover: fields.image({
      label: "Cover Image",
      directory: "src/assets/images/articles",
      publicPath: "@assets/images/articles/",
    }),
    category: fields.array(
      fields.conditional(
        fields.select({
          label: "Main Category",
          options: categoryOptions,
          defaultValue: categoryOptions[0]?.value || '',
        }),
        Object.fromEntries(
          categoryOptions.map((opt) => [
            opt.value,
            subCategoryFields[opt.value]
              ? fields.select(subCategoryFields[opt.value]!)
              : fields.empty(),
          ])
        )
      ),
      {
        label: "Categories",
        itemLabel: (props) => {
          // If the branch has a value (sub-category), it will be in props.value.
          // For fields.select, it's usually just the string value in Keystatic's preview props.
          const sub = typeof props.value === 'string' ? props.value : (props.value as any)?.value;
          return sub ? `${props.discriminant} > ${sub}` : props.discriminant;
        },
        validation: { length: { min: 1 } },
      }
    ),
    publishedTime: fields.datetime({
      label: "Published Time",
      validation: { isRequired: true },
    }),
    authors: fields.array(
      fields.relationship({
        label: "Authors",
        collection: "authors",
      }),
      {
        label: "Authors",
        itemLabel: (props) => props.value ?? "",
        validation: {
          length: {
            min: 1,
          },
        },
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
    }),
    content: fields.mdx({
      label: "Content",
      options: {
        image: {
          directory: "src/assets/images/articles",
          publicPath: "@assets/images/articles",
        },
      },
    }),
  },
});

