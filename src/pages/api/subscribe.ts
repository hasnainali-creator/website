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

        // [End Level] Flawless Variable Extraction
        const cfEnv = (locals as any)?.runtime?.env || {};
        const safeProcess = (globalThis as any).process?.env || {};
        
        // Detailed extraction with fallback trace
        const clientEmail = cfEnv.FIREBASE_CLIENT_EMAIL || safeProcess.FIREBASE_CLIENT_EMAIL;
        const rawPrivateKey = cfEnv.FIREBASE_PRIVATE_KEY || safeProcess.FIREBASE_PRIVATE_KEY || '';

        // If credentials are missing, we MUST know why
        if (!clientEmail || !rawPrivateKey) {
            console.error('[End Level 🏆] Missing Credentials Trace:', {
                hasEnv: !!(locals as any)?.runtime?.env,
                hasProcess: !!(globalThis as any).process?.env,
                emailFound: !!clientEmail,
                keyFound: !!rawPrivateKey
            });
            
            return new Response(JSON.stringify({ 
                error: 'Missing Firebase Credentials on Cloudflare', 
                debug: {
                    emailMissing: !clientEmail,
                    keyMissing: !rawPrivateKey,
                    advice: 'Ensure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are set in Cloudflare Settings > Variables (NOT Secrets).'
                } 
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        const projectId = 'omnysports-push-notifications';

        // 1. Generate the Edge-Compatible Bearer Token
        let accessToken;
        try {
            // Robust Key Formatting: Handles both literal \n and real newlines
            const formattedKey = rawPrivateKey
                .replace(/\\n/g, '\n') // Handle literal \n strings
                .replace(/"/g, '')     // Remove accidental quotes
                .trim();               // Remove whitespace
            
            accessToken = await getGoogleAuthToken(clientEmail, formattedKey);
        } catch (authErr: any) {
            console.error('[End Level 🏆] Auth Token Generation Failed:', authErr.message);
            return new Response(JSON.stringify({ 
                error: 'Authentication Handshake Failed', 
                message: authErr.message 
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        // 2. Subscribe the device token to the 'all' topic using FCM Instance ID API
        // This is the direct REST mapping equivalent to admin.messaging().subscribeToTopic()
        const subscribeUrl = `https://iid.googleapis.com/iid/v1/${token}/rel/topics/all`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s Timeout for Edge Safety

        const response = await fetch(subscribeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'access_token_auth': 'true' // Recommended for pure OAuth requests on IID
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

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
