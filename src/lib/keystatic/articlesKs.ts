import { collection, fields } from "@keystatic/core";
import { categoryOptions, subCategoryFields } from "./options";


export const articlesKs = collection({
  label: "Articles",
  slugField: "title",
  path: "src/content/articles/*/index",
  format: { contentField: "content" },
  entryLayout: "form",
  columns: ["publishedTime", "title"],
  schema: {
    isDraft: fields.checkbox({
      label: "Is this a draft?",
      defaultValue: false,
    }),
    hideBadge: fields.checkbox({
      label: "Hide Updated Badge?",
      description: "Manually hide the green 'Updated' badge even if recently modified.",
      defaultValue: false,
    }),
    tags: fields.array(fields.text({ label: "Tag" }), {
      label: "Hashtags / Keywords",
      itemLabel: (props) => props.value,
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
    title: fields.text({ label: "Title", validation: { isRequired: true } }),
    cover: fields.image({
      label: "Cover Image",
      directory: "src/assets/images/articles",
      publicPath: "@assets/images/articles/",
    }),
    coverAlt: fields.text({
      label: "Cover Image Alt Text (SEO)",
      description: "Describe the image briefly for SEO and screen readers. Fallbacks to article title.",
      validation: { length: { max: 120 } },
    }),
    category: fields.array(
      fields.conditional(
        fields.select({
          label: "Main Category",
          options: categoryOptions.length > 0 ? categoryOptions : [{ label: 'None', value: 'none' }],
          defaultValue: categoryOptions[0]?.value || 'none',
        }),
        Object.fromEntries(
          (categoryOptions.length > 0 ? categoryOptions : [{ label: 'None', value: 'none' }]).map((opt) => [
            opt.value,
            fields.select(subCategoryFields[opt.value]),
          ])
        )
      ),
      {
        label: "Categories",
        itemLabel: (props) => {
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
      metaKeywords: fields.text({
        label: "Meta Keywords",
        description: "Comma-separated keywords for SEO.",
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
