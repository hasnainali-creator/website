// @ts-nocheck
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Specifically notifies Google that the Homepage and Meta Branding have been updated.
 * This helps force Google to refresh the Site Name and Favicon in Search results.
 */
async function forceUpdate() {
    // SHIELD MODE CHECK: Do not index ANYTHING if shield is active!
    try {
        const configPath = path.resolve(process.cwd(), 'src/lib/config/index.ts');
        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');
            if (configContent.includes('SHIELD_MODE: true')) {
                console.log('🛡️ SHIELD MODE ACTIVE: Skipping Force-Update requests.');
                return;
            }
        }
    } catch (err) {
        console.warn('⚠️ Could not check SHIELD_MODE, proceeding with caution.');
    }

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
        if (process.env.CF_PAGES) {
            console.error('❌ CRITICAL: GOOGLE_INDEXING_KEY is missing in Cloudflare Environment Variables!');
        } else {
            console.log('ℹ️ Local Environment: GOOGLE_INDEXING_KEY not found. Skipping force-update (This is normal for local builds).');
        }
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

    const urlsToForce = [
        'https://omnysports.pages.dev/',
        'https://omnysports.pages.dev/about',
        'https://omnysports.pages.dev/contact'
    ];

    console.log(`🚀 Forcing Google to refresh branding for ${urlsToForce.length} key URLs...`);

    for (const url of urlsToForce) {
        try {
            await indexing.urlNotifications.publish({
                requestBody: {
                    url: url,
                    type: 'URL_UPDATED',
                },
            });
            console.log(`✅ Update Notification Sent: ${url}`);
        } catch (error) {
            console.error(`❌ API Error for ${url}: ${error.message}`);
        }
    }

    console.log('🏁 Force update complete. Google should refresh its cache soon.');
}

forceUpdate().catch(err => {
    console.error('❌ Script Crash:', err);
});
