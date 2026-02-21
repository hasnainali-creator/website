# Data Integrity Audit Report (Feb 21, 2026)

I have audited all **14 articles**, their frontmatter, and their referenced images. Here are the "Masle" (Problems) found that need fixing to make the site 100% stable.

### 1. Folder Name Mismatch (Critical)
- **Article Folder**: `javascript-math-is-a-lie`
- **Image Folder**: `java-script-math-is-a-lie`
- **Issue**: There is an extra dash in the image folder. This can cause the "Cover Required" error because Astro can't find the image where it expects.

### 2. Demo Article Issue
- **Article**: `demo`
- **Issue**: This article doesn't have its own image. It's pointing to another article's image. 
- **Recommendation**: I should create a proper `demo` image or delete this test article to keep the data clean.

### 3. Alias vs Relative Paths
- **Current**: Most articles use `@assets/images/...`
- **Observation**: While this works in the CMS, Astro sometimes prefers relative paths (`../../assets/...`) for the `image()` validator in Content Collections. Mixed formats can sometimes lead to intermittent crashes during dev mode.

---

## Requested Actions (Waiting for your "OK")
1. [ ] **Rename** `src/assets/images/articles/java-script-math-is-a-lie` to `javascript-math-is-a-lie`.
2. [ ] **Cleanup** the `demo` article (Delete or give it proper data).
3. [ ] **Normalize** all image paths to a single consistent format.

**Aap batayein, kya main pehle in naming mismatches ko sahi karon?**
