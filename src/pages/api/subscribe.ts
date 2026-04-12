import type { APIRoute } from 'astro';
import { SignJWT, importPKCS8 } from 'jose';

export const prerender = false;

const API_VERSION = 'v6-base64';

async function getGoogleAuthToken(clientEmail: string, pemKey: string): Promise<string> {
    const key = await importPKCS8(pemKey, 'RS256');

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const jwt = await new SignJWT({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp,
        iat
    })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
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
        throw new Error(`OAuth failed: ${err}`);
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

        // Get credentials from Cloudflare
        const env = (locals as any)?.runtime?.env || (context as any).env || {};
        const clientEmail = env.FIREBASE_CLIENT_EMAIL;
        const rawKey = env.FIREBASE_PRIVATE_KEY || '';

        if (!clientEmail || !rawKey) {
            return new Response(JSON.stringify({ 
                error: 'Missing credentials', 
                version: API_VERSION 
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        // DECODE THE KEY:
        // The key is stored as base64(entire PEM) in Cloudflare.
        // This eliminates ALL formatting issues - no \n problems, no PEM parsing problems.
        let pemKey: string;
        try {
            // Try base64 decode first (new format)
            pemKey = atob(rawKey.trim());
        } catch {
            // Fallback: raw PEM with literal \n replacement (old format)
            pemKey = rawKey.split('\\n').join('\n').replace(/"/g, '').trim();
        }

        let accessToken;
        try {
            accessToken = await getGoogleAuthToken(clientEmail, pemKey);
        } catch (authErr: any) {
            return new Response(JSON.stringify({ 
                error: 'Auth Failed',
                message: authErr.message,
                version: API_VERSION,
                keyLen: rawKey.length
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        // Subscribe to 'all' topic
        const subscribeUrl = `https://iid.googleapis.com/iid/v1/${token}/rel/topics/all`;
        
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(subscribeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'access_token_auth': 'true'
            },
            signal: controller.signal
        });
        
        clearTimeout(tid);

        if (!response.ok) {
            const errText = await response.text();
            return new Response(JSON.stringify({ error: 'Subscription failed', detail: errText }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true, version: API_VERSION }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: 'Server Error', message: error.message, version: API_VERSION }), { status: 500 });
    }
};
