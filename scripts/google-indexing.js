// @ts-nocheck
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

/**
 * Automates Google Indexing by notifying Google of new/updated URLs from the sitemap.
 */
async function indexSitemap() {
    const keyContent = process.env.GOOGLE_INDEXING_KEY;
    if (!keyContent) {
        console.warn('⚠️ GOOGLE_INDEXING_KEY background variable missing. Google Indexing skipped.');
        return;
    }

    let key;
    try {
        key = JSON.parse(keyContent);
    } catch (e) {
        console.error('❌ Error parsing GOOGLE_INDEXING_KEY. Ensure it is valid JSON.');
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
    const urls = [...sitemapContent.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map(m => m[1]);

    console.log(`🔍 Found ${urls.length} URLs. Notifying Google...`);

    for (const url of urls) {
        try {
            await indexing.urlNotifications.publish({
                requestBody: {
                    url: url,
                    type: 'URL_UPDATED',
                },
            });
            console.log(`✅ Google Notified: ${url}`);
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
