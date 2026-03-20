import { collection, fields } from "@keystatic/core";
import { authorsAvatarField } from "./components/AvatarCropper";

export const authorsKs = collection({
  label: "Authors",
  slugField: "id",
  path: "src/content/authors/*/index",
  format: { contentField: "content" },
  entryLayout: "form",
  schema: {
    id: fields.text({ 
        label: "Internal ID / Slug (DO NOT CHANGE)", 
        validation: { isRequired: true },
        description: "This determines the folder name. Keep it as-is to prevent broken images."
    }),
    name: fields.text({ label: "Full Name (Display)", validation: { isRequired: true } }),
    job: fields.text({ label: "Job Title/Role", validation: { isRequired: true } }),
    avatar: authorsAvatarField(),
    bio: fields.text({
      label: "Short Bio",
      description: "Appears on the author card and top of their profile.",
      multiline: true
    }),
    content: fields.mdx({
      label: "Full Biography / Extended About (Optional)",
      description: "This text will appear below the articles on the individual author page.",
      options: {
        image: {
          publicPath: "./",
        },
      },
    }),
  },
});
