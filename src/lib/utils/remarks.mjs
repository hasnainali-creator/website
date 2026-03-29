// @ts-nocheck
import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import getReadingTime from "reading-time";
import { toString as ConvertToString } from "mdast-util-to-string";

function isGitAvailable() {
  try {
    execSync("git --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isGitRepo() {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function modifiedTime() {
  return (_, file) => {
    const filepath = file.history[0];
    let gitModified;
    let fsModified;

    // 1. Get FS time (always available)
    try {
      const stats = statSync(filepath);
      fsModified = stats.mtime;
    } catch {
      // Ignored
    }

    // 2. Get Git time (if available)
    if (isGitAvailable() && isGitRepo()) {
      try {
        const gitResult = execSync(
          `git log -1 --pretty="format:%cI" "${filepath}"`,
          { stdio: ["ignore", "pipe", "ignore"] }
        )
          .toString()
          .trim();

        if (gitResult) {
          gitModified = new Date(gitResult);
        }
      } catch {
        // Fallback to FS if not in git
      }
    }

    // 3. Take the latest of the two
    let finalModified;
    if (gitModified && fsModified) {
      finalModified = gitModified > fsModified ? gitModified : fsModified;
    } else {
      finalModified = gitModified || fsModified || new Date();
    }

    file.data.astro.frontmatter.lastModified = finalModified.toISOString();
  };
}

export function readingTime() {
  return (tree, { data }) => {
    // Advanced Precision Logic: Scanning tree for images and words
    let images = 0;
    
    // Simple recursive traversal to find image nodes
    const traverse = (node) => {
      if (node.type === 'image') images++;
      if (node.children) node.children.forEach(traverse);
    }
    traverse(tree);

    const textOnPage = ConvertToString(tree);
    const wordCount = textOnPage.trim().split(/\s+/).length || 0;
    
    // Logic: 275 WPM (Industry Standard) + Medium Image Scaling
    const wordsPerMin = 275;
    const wordSeconds = (wordCount / wordsPerMin) * 60;
    
    // Medium-style Image Logic: 12, 11, 10... up to min 3s per image
    let imageSeconds = 0;
    for (let i = 1; i <= images; i++) {
       imageSeconds += Math.max(12 - i + 1, 3);
    }
    
    const totalSeconds = Math.ceil(wordSeconds + imageSeconds);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    
    // Professional advanced format
    let finalStr = "";
    if (m > 0) finalStr += `${m} min `;
    finalStr += `${s} sec read`;
    
    data.astro.frontmatter.minutesRead = finalStr;
  };
}
