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
    const textOnPage = ConvertToString(tree);
    const readingTime = getReadingTime(textOnPage, { wordsPerMinute: 180 });
    data.astro.frontmatter.minutesRead = readingTime.text;
  };
}
