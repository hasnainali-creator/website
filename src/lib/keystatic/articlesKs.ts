import { collection, fields } from "@keystatic/core";
import fs from 'fs';
import path from 'path';

// Helper to read categories and their sub-categories from the filesystem
function getCategoriesData() {
  // Use absolute path or relative to project root
  const categoriesPath = path.join(process.cwd(), 'src/content/categories');
  const allSubCategories: { label: string; value: string }[] = [];

  if (fs.existsSync(categoriesPath)) {
    try {
      const dirs = fs.readdirSync(categoriesPath);
      for (const slug of dirs) {
        const indexPath = path.join(categoriesPath, slug, 'index.json');
        if (fs.existsSync(indexPath)) {
          const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
          const mainTitle = data.title || slug;
          const subs = data.subCategories || [];

          if (subs.length > 0) {
            subs.forEach((sub: string) => {
              allSubCategories.push({
                label: `${mainTitle} > ${sub}`,
                value: sub
              });
            });
          }
        }
      }
    } catch (e) {
      console.error("Error reading categories for CMS dropdown:", e);
    }
  }

  // Sort alphabetically by label
  return allSubCategories.sort((a, b) => a.label.localeCompare(b.label));
}

const subCategoryOptions = getCategoriesData();

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
    isMainHeadline: fields.checkbox({
      label: "Is this a main headline?",
      defaultValue: false,
    }),
    isSubHeadline: fields.checkbox({
      label: "Is this a sub headline?",
      defaultValue: false,
    }),
    description: fields.text({
      label: "Description",
      validation: { isRequired: true, length: { max: 160 } },
    }),
    title: fields.slug({
      name: { label: "Title", validation: { length: { max: 60 } } },
    }),
    cover: fields.image({
      label: "Cover",
      directory: "src/assets/images/articles",
      publicPath: "@assets/images/articles/",
    }),
    category: fields.relationship({
      label: "Category",
      collection: "categories",
    }),
    subCategory: fields.select({
      label: "Sub-category",
      description: "Select the sub-category. It will show as Category > Sub-category (e.g. Finance > USA Tax).",
      options: subCategoryOptions,
    }),
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
