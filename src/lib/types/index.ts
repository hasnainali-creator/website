import type { CollectionEntry } from "astro:content";

export type Icon = {
  size?: string;
  width?: string;
  height?: string;
  color?: string;
  strokeWidth?: string;
};

export type Link = {
  href: string;
  text: string;
  icon?: string;
  target?: "_blank" | "_self";
};

type Author = {
  name: string;
  link: string;
  jobTitle?: string;
  description?: string;
};

export type Meta = {
  title: string;
  metaTitle: string;
  description: string;
  type: "article" | "website";
  ogImage: string;
  ogImageAlt: string;
  keywords?: string;
  breadcrumbs?: { label: string; url: string }[];
  prev?: string | undefined;
  next?: string | undefined;
  wikidataId?: string; // Omega: Link to Wikidata for supreme authority
  itemLocation?: string; // Omega: Geographic targeting
};

export type ArticleMeta = Meta & {
  publishedTime: string;
  lastModified: string;
  authors: Author[];
  tags?: string[];
  category?: string[];
  articleBody?: string; // Omega: Semantic content depth
};

export type Entry = CollectionEntry<"articles" | "views">;
