import { reference, z } from "astro:content";
import type { ImageFunction } from "astro:content";

export const articleSchema = (image: ImageFunction) =>
  z.object({
    isDraft: z.boolean().default(false),
    hideBadge: z.boolean().default(false),
    publishing: z.object({
      isMainHeadline: z.boolean().default(false),
      isSubHeadline: z.boolean().default(false),
      isFeatured: z.boolean().default(false),
    }),
    tags: z.array(z.string()).default([]),
    cover: image(),
    coverAlt: z.string().optional(),
    title: z.string().max(60).optional(),
    description: z.string().max(160, "Too long, max 160 characters"),
    category: z.array(z.object({
      discriminant: z.string(),
      value: z.string().nullish(),
    })).min(1),
    publishedTime: z.string().datetime().or(z.date()),
    authors: z.array(reference("authors")).min(1),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      metaKeywords: z.string().optional(),
    }).optional(),
  });

export const viewSchema = z.object({
  title: z.string(),
  description: z.string(),
  blocks: z.array(z.any()),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    metaKeywords: z.string().optional(),
  }).optional(),
});

export const categorySchema = z.object({
  title: z.string().optional(),
  sortOrder: z.number().min(1).max(20).default(20),
  subCategories: z.array(z.string()).default([]),
});

export const authorSchema = (Image: ImageFunction) =>
  z.object({
    name: z.string(),
    job: z.string(),
    avatar: Image(),
    bio: z.string(),
    social: z.array(
      z.object({
        name: z.string(),
        url: z.string(),
        icon: z.string(),
      })
    ),
  });

// avatar: Image().refine(
//   (img) => {
//       const isValidWidth = img.width > 100 && img.width < 2000;
//       const isValidHeight = img.height > 100 && img.height < 2000;
//       return isValidWidth && isValidHeight;
//   },
//   "Avatar image must have width and height between 100 and 2000"
// ),

