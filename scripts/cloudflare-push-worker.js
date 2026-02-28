// @ts-nocheck
/**
 * Cloudflare Worker: RSS to Firebase Push Notification
 * This script checks the RSS feed, remembers the last processed item, 
 * and sends a broadcast notification to the "all" topic when a new item appears.
 */

// You need to set these SECRETS in your Cloudflare Worker dashboard:
// FIREBASE_PROJECT_ID
// FIREBASE_CLIENT_EMAIL
// FIREBASE_PRIVATE_KEY

// Using Cloudflare Workers KV to store the last processed article ID
// Bind a KV namespace called "PUSH_KV" to your worker.

export default {
    async scheduled(event, env, ctx) {
        ctx.waitUntil(this.checkAndNotify(env));
    },

    // Also allowing manual trigger via HTTP for testing
    async fetch(request, env, ctx) {
        await this.checkAndNotify(env);
        return new Response("Check complete");
    },

    async checkAndNotify(env) {
        const rssUrl = "https://omnysports.pages.dev/rss.xml";

        try {
            const response = await fetch(rssUrl);
            const text = await response.text();

            // Simple regex to extract the first item's title, link, and guid
            const itemMatch = text.match(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<guid.*?>(.*?)<\/guid>/i);

            if (!itemMatch) {
                console.log("No items found in RSS feed.");
                return;
            }

            const title = itemMatch[1].replace('<![CDATA[', '').replace(']]>', '').trim();
            const link = itemMatch[2].trim();
            const guid = itemMatch[3].trim();

            // Check if we already processed this article
            if (!env.PUSH_KV) {
                console.error("KV Namespace 'PUSH_KV' is not bound!");
                return;
            }

            const lastGuid = await env.PUSH_KV.get("LAST_PUSHED_GUID");

            if (lastGuid === guid) {
                console.log(`No new articles. Last processed: ${guid}`);
                return;
            }

            console.log(`New article detected: ${title}. Sending push notification...`);

            // Send the Push Notification via Firebase Admin REST API
            const token = await this.getFirebaseAuthToken(env);
            await this.sendPushToTopic(token, env.FIREBASE_PROJECT_ID, title, "Naya article publish ho gaya hai! Abhi padhein.", link);

            // Save the id so we don't send it again
            await env.PUSH_KV.put("LAST_PUSHED_GUID", guid);
            console.log("Push sent and KV updated.");

        } catch (err) {
            console.error("Error checking RSS:", err);
        }
    },

    async getFirebaseAuthToken(env) {
        // We create a JWT and exchange it for a Google OAuth2 token.
        const header = { alg: "RS256", typ: "JWT" };
        const now = Math.floor(Date.now() / 1000);
        const claim = {
            iss: env.FIREBASE_CLIENT_EMAIL,
            scope: "https://www.googleapis.com/auth/firebase.messaging",
            aud: "https://oauth2.googleapis.com/token",
            exp: now + 3600,
            iat: now
        };

        const encodedHeader = this.base64url(JSON.stringify(header));
        const encodedClaim = this.base64url(JSON.stringify(claim));
        const signatureInput = `${encodedHeader}.${encodedClaim}`;

        // Import the private key
        const privateKeyStr = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        const privateKey = await this.importRSAPrivateKey(privateKeyStr);

        // Sign the JWT
        const signature = await crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            privateKey,
            new TextEncoder().encode(signatureInput)
        );

        const encodedSignature = this.base64url(signature);
        const jwt = `${signatureInput}.${encodedSignature}`;

        // Exchange for Access Token
        const authRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
        });

        const authData = await authRes.json();
        return authData.access_token;
    },

    async sendPushToTopic(accessToken, projectId, title, body, link, imageUrl) {
        const message = {
            message: {
                topic: "all",
                notification: {
                    title: title,
                    body: body,
                    image: imageUrl
                },
                android: {
                    notification: {
                        image: imageUrl,
                        click_action: link
                    }
                },
                webpush: {
                    notification: {
                        image: imageUrl,
                        icon: "https://omnysports.pages.dev/favicon-96x96.png", // Your Logo
                        badge: "https://omnysports.pages.dev/favicon-96x96.png",
                        actions: [
                            {
                                action: "read_more",
                                title: "Pura Padhein 📰",
                                icon: "https://omnysports.pages.dev/favicon.ico"
                            },
                        ]
                    },
                    fcm_options: {
                        link: link
                    }
                }
            }
        };

        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(message)
        });

        if (!res.ok) {
            console.error("Error sending push:", await res.text());
        }
    },

    async checkAndNotify(env) {
        const rssUrl = "https://omnysports.pages.dev/rss.xml";

        try {
            const response = await fetch(rssUrl);
            const text = await response.text();

            // Extract items
            const itemMatch = text.match(/<item>([\s\S]*?)<\/item>/i);

            if (!itemMatch) {
                console.log("No items found in RSS feed.");
                return;
            }

            const item = itemMatch[1];

            // Extract title
            const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
            const title = titleMatch?.[1].trim() || "Naya Articles!";

            // Extract link
            const linkMatch = item.match(/<link>(.*?)<\/link>/i);
            const link = linkMatch?.[1].trim() || "https://omnysports.pages.dev";

            // Extract guid
            const guidMatch = item.match(/<guid.*?>(.*?)<\/guid>/i);
            const guid = guidMatch?.[1].trim();

            // Extract description
            const descMatch = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i);
            const description = descMatch?.[1].trim() || "Breaking News - Abhi Padhein!";

            // Extract Image (media:content)
            const imgMatch = item.match(/<media:content[^>]*url=["'](.*?)["']/i);
            const imageUrl = imgMatch?.[1] || "https://omnysports.pages.dev/og-image.png";

            // Check if we already processed this article
            if (!env.PUSH_KV) {
                console.error("KV Namespace 'PUSH_KV' is not bound!");
                return;
            }

            const lastGuid = await env.PUSH_KV.get("LAST_PUSHED_GUID");

            if (lastGuid === guid) {
                console.log(`No new articles. Last processed: ${guid}`);
                return;
            }

            console.log(`New article: ${title}. Sending push...`);

            // Send Push
            const token = await this.getFirebaseAuthToken(env);
            await this.sendPushToTopic(token, env.FIREBASE_PROJECT_ID, title, description, link, imageUrl);

            // Save state
            await env.PUSH_KV.put("LAST_PUSHED_GUID", guid);
            console.log("Push completed.");

        } catch (err) {
            console.error("Error in checkAndNotify:", err);
        }
    },

    base64url(source) {
        let encoded;
        if (source instanceof ArrayBuffer) {
            encoded = btoa(String.fromCharCode.apply(null, new Uint8Array(source)));
        } else {
            encoded = btoa(source);
        }
        return encoded.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    },

    async importRSAPrivateKey(pem) {
        // Remove headers and newlines
        const pemHeader = "-----BEGIN PRIVATE KEY-----";
        const pemFooter = "-----END PRIVATE KEY-----";
        const pemContents = pem.substring(
            pem.indexOf(pemHeader) + pemHeader.length,
            pem.indexOf(pemFooter)
        ).replace(/\s/g, '');

        const binaryDer = atob(pemContents);
        const buffer = new ArrayBuffer(binaryDer.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binaryDer.length; i++) {
            view[i] = binaryDer.charCodeAt(i);
        }

        return crypto.subtle.importKey(
            "pkcs8",
            buffer,
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256",
            },
            true,
            ["sign"]
        );
    }
};
