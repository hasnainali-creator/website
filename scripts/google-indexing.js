// @ts-nocheck
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

/**
 * Automates Google Indexing by notifying Google of new/updated URLs from the sitemap.
 */
async function indexSitemap() {
    let keyContent = process.env.GOOGLE_INDEXING_KEY;

    // Load from .env manually just in case user adds it locally in the future
    if (!keyContent) {
        try {
            const envPath = path.resolve(process.cwd(), '.env');
            if (fs.existsSync(envPath)) {
                const envFile = fs.readFileSync(envPath, 'utf8');
                const match = envFile.match(/GOOGLE_INDEXING_KEY=(.*)/);
                if (match) {
                    keyContent = match[1];
                }
            }
        } catch (err) { }
    }

    if (!keyContent) {
        if (process.env.CF_PAGES) {
            console.error('❌ CRITICAL: GOOGLE_INDEXING_KEY is missing in Cloudflare Environment Variables!');
            // We do not throw to avoid failing the whole build, but we log critically
            return;
        } else {
            console.log('ℹ️ Local Environment: GOOGLE_INDEXING_KEY not found. Skipping auto-index (This is normal for local testing).');
            return;
        }
    }

    let key;
    try {
        // Sanitize string if Cloudflare variable wraps it in quotes or escapes newlines
        const sanitized = keyContent.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
        key = JSON.parse(sanitized);
    } catch (e) {
        console.error('❌ FORMAT ERROR: GOOGLE_INDEXING_KEY is not valid JSON. Please check Cloudflare variables.');
        return;
    }

    const auth = new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/indexing']
    });

    const indexing = google.indexing({ version: 'v3', auth });

    const sitemapPath = path.join(process.cwd(), 'dist', 'sitemap-0.xml');
    if (!fs.existsSync(sitemapPath)) {
        console.warn(`⚠️ Sitemap not found at ${sitemapPath}. Build may have failed or sitemap name is different.`);
        return;
    }
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    const allUrls = [...sitemapContent.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map(m => m[1]);

    console.log(`🔍 Found ${allUrls.length} total URLs in sitemap.`);

    // FIND RECENTLY ADDED OR UPDATED ARTICLES (LAST 48 HOURS)
    const recentSlugs = new Set();
    const articlesDir = path.join(process.cwd(), 'src', 'content', 'articles');
    const RECENT_HOURS = 48;

    if (fs.existsSync(articlesDir)) {
        const dirs = fs.readdirSync(articlesDir, { withFileTypes: true });
        const nowMs = Date.now();

        for (const d of dirs) {
            if (d.isDirectory()) {
                const mdPath = path.join(articlesDir, d.name, 'index.md');
                const mdxPath = path.join(articlesDir, d.name, 'index.mdx');
                const filePath = fs.existsSync(mdxPath) ? mdxPath : (fs.existsSync(mdPath) ? mdPath : null);

                if (filePath) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    // Check publishedTime or lastModified
                    const matchTime = content.match(/(?:publishedTime|lastModified):\s*([^\n\r]+)/);
                    if (matchTime) {
                        const dateStr = matchTime[1].trim().replace(/^['"]|['"]$/g, '');
                        const parsedDate = new Date(dateStr);
                        if (!isNaN(parsedDate.getTime())) {
                            const diffHours = (nowMs - parsedDate.getTime()) / (1000 * 60 * 60);
                            if (diffHours >= 0 && diffHours <= RECENT_HOURS) {
                                recentSlugs.add(d.name);
                                recentSlugs.add(encodeURIComponent(d.name));
                                recentSlugs.add(d.name.toLowerCase().replace(/\s+/g, '-'));
                            }
                        }
                    }
                }
            }
        }
    }

    // FILTER URLS: Only push the Homepage + the specific Recent Articles
    const urlsToNotify = allUrls.filter(url => {
        // Always ping the Homepage to keep main cache fresh
        if (url === 'https://omnysports.pages.dev/') return true;

        // Filter articles dynamically based on directory slugs that were modified
        if (url.includes('/articles/')) {
            const isRecent = Array.from(recentSlugs).some(slug => url.endsWith(`/articles/${slug}/`) || url.endsWith(`/articles/${slug}`));
            return isRecent;
        }

        // Block categories, authors, and legal pages from eating up the 200/day quota
        return false;
    });

    if (urlsToNotify.length === 0) {
        console.log('✅ No new or recently updated articles found within the last 48 hours. API index quota saved!');
        return;
    }

    console.log(`🚀 Sending exactly ${urlsToNotify.length} highly targeted URL(s) to Google Indexing API to preserve daily limits...`);

    for (const url of urlsToNotify) {
        try {
            await indexing.urlNotifications.publish({
                requestBody: {
                    url: url,
                    type: 'URL_UPDATED',
                },
            });
            console.log(`✅ Google Notified (Prioritized): ${url}`);
        } catch (error) {
            console.error(`❌ API Error for ${url}:`, error.message);
        }
    }

    // Fallback: Ping Google Sitemap via HTTPS
    const sitemapUrl = 'https://omnysports.pages.dev/sitemap-index.xml';
    https.get(`https://www.google.com/ping?sitemap=${sitemapUrl}`, (res) => {
        if (res.statusCode === 200) {
            console.log('✅ Google Sitemap Ping success.');
        }
    }).on('error', (e) => {
        console.warn('⚠️ Sitemap ping failed, but Indexing API was likely successful.');
    });
}

indexSitemap().catch(err => {
    console.error('❌ Indexing Script Crash:', err);
    process.exit(0); // Exit gracefully to not break build pipeline
});
