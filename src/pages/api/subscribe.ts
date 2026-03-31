import type { APIRoute } from 'astro';
import { SignJWT, importPKCS8 } from 'jose';

export const prerender = false;

// Helper to generate a Google Cloud Platform OAuth2 Token entirely on the Cloudflare Edge
async function getGoogleAuthToken(clientEmail: string, privateKey: string): Promise<string> {
    const alg = 'RS256';
    
    // Safety check and reformat private key for Cloudflare env variables
    const formattedKey = privateKey.replace(/\\n/g, '\n');
    const key = await importPKCS8(formattedKey, alg);

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const jwt = await new SignJWT({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp,
        iat
    })
    .setProtectedHeader({ alg, typ: 'JWT' })
    .sign(key);

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        }).toString()
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to fetch Google OAuth token: ${err}`);
    }

    const data = await res.json();
    return data.access_token;
}

export const POST: APIRoute = async (context) => {
    const { request, locals } = context;
    try {
        const body = await request.json();
        const token = body.token;

        if (!token) {
            return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400 });
        }

        // Retrieve credentials safely inside the handler to prevent Cloudflare initialization cache errors.
        // On Cloudflare Edge, variables added via dashboard are passed in locals.runtime.env.
        const cfEnv = (locals as any)?.runtime?.env || {};
        
        let projectId = cfEnv.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || import.meta.env.FIREBASE_PROJECT_ID;
        let clientEmail = cfEnv.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL || import.meta.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = cfEnv.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || import.meta.env.FIREBASE_PRIVATE_KEY || '';

        const indexingKey = cfEnv.GOOGLE_INDEXING_KEY || process.env.GOOGLE_INDEXING_KEY || import.meta.env.GOOGLE_INDEXING_KEY;
        if ((!projectId || !clientEmail || !privateKey) && indexingKey) {
            try {
                const key = JSON.parse(indexingKey.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n'));
                projectId = key.project_id;
                clientEmail = key.client_email;
                privateKey = key.private_key;
            } catch (ignored) {}
        }

        if (!projectId || !clientEmail || !privateKey) {
            console.error('[Firebase Edge API] Missing credentials.');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
        }

        // 1. Generate the Edge-Compatible Bearer Token
        const accessToken = await getGoogleAuthToken(clientEmail, privateKey);

        // 2. Subscribe the device token to the 'all' topic using FCM Instance ID API
        // This is the direct REST mapping equivalent to admin.messaging().subscribeToTopic()
        const subscribeUrl = `https://iid.googleapis.com/iid/v1/${token}/rel/topics/all`;
        
        const response = await fetch(subscribeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'access_token_auth': 'true' // Recommended for pure OAuth requests on IID
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[Firebase Edge API] Failed to subscribe to topic:', errText);
            return new Response(JSON.stringify({ error: 'Subscription failed' }), { status: 500 });
        }

        console.log('[Firebase Edge API] Successfully subscribed token to topic "all"');

        return new Response(JSON.stringify({ success: true, message: 'Device subscribed accurately via Edge API.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('[Firebase Edge API] Fatal Error:', error.message);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
