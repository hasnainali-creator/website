// @ts-nocheck
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Sends URL_DELETED notifications to Google for all URLs found in the sitemap.
 * This is used to "flush" dummy or unwanted content from Google's index.
 */
async function deindexEverything() {
    let keyContent = process.env.GOOGLE_INDEXING_KEY;

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
        console.error('❌ ERROR: GOOGLE_INDEXING_KEY not found in environment or .env file.');
        return;
    }

    let key;
    try {
        const sanitized = keyContent.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
        key = JSON.parse(sanitized);
    } catch (e) {
        console.error('❌ FORMAT ERROR: GOOGLE_INDEXING_KEY is not valid JSON.');
        return;
    }

    const auth = new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/indexing']
    });

    const indexing = google.indexing({ version: 'v3', auth });

    // We look for sitemap in dist/ (after build)
    const sitemapPath = path.join(process.cwd(), 'dist', 'sitemap-0.xml');
    if (!fs.existsSync(sitemapPath)) {
        console.warn(`⚠️ Sitemap not found at ${sitemapPath}. Please run a build first (npm run build).`);
        return;
    }

    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    const allUrls = [...sitemapContent.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map(m => m[1]);

    console.log(`🔍 Found ${allUrls.length} total URLs in sitemap to DE-INDEX.`);

    if (allUrls.length === 0) {
        console.log('✅ No URLs found in sitemap.');
        return;
    }

    console.log(`🚀 Sending ${allUrls.length} URL_DELETED notifications to Google...`);

    for (const url of allUrls) {
        try {
            await indexing.urlNotifications.publish({
                requestBody: {
                    url: url,
                    type: 'URL_DELETED',
                },
            });
            console.log(`🗑️ De-index Request Sent: ${url}`);
        } catch (error) {
            console.error(`❌ API Error for ${url}:`, error.message);
        }
    }

    console.log('🏁 De-indexing process complete.');
}

deindexEverything().catch(err => {
    console.error('❌ De-indexing Script Crash:', err);
    process.exit(1);
});
