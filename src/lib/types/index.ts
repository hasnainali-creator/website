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
  prev?: string;
  next?: string;
};

export type ArticleMeta = Meta & {
  publishedTime: string;
  lastModified: string;
  authors: Author[];
  tags?: string[];
};

export type Entry = CollectionEntry<"articles" | "views">;
