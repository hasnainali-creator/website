import type { APIRoute } from 'astro';
import { SignJWT } from 'jose';

export const prerender = false;

// Bulletproof: Generate Google OAuth2 token using Web Crypto API directly.
// NO jose importPKCS8. NO atob through jose. We do it ourselves.
async function getGoogleAuthToken(clientEmail: string, rawKey: string): Promise<string> {
    
    // STEP 1: Strip PEM headers completely
    let stripped = rawKey
        .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, '')
        .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, '');
    
    // STEP 2: Kill EVERY non-base64 character. This handles:
    // - Literal \n (backslash + n from Cloudflare text fields)
    // - Real newlines, carriage returns, tabs
    // - Stray quotes, spaces, anything
    stripped = stripped.replace(/\\n/g, ''); // Kill literal \n first
    stripped = stripped.replace(/[^A-Za-z0-9+/=]/g, ''); // Keep ONLY valid base64
    
    // STEP 3: Fix padding (base64 must be divisible by 4)
    const remainder = stripped.length % 4;
    if (remainder === 2) stripped += '==';
    else if (remainder === 3) stripped += '=';
    else if (remainder === 1) stripped = stripped.slice(0, -1); // Invalid, trim
    
    // STEP 4: Decode base64 to binary using atob()
    const binaryString = atob(stripped);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    // STEP 5: Import as CryptoKey via Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        bytes.buffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    // STEP 6: Create JWT with jose (jose accepts CryptoKey directly)
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
    .sign(cryptoKey);

    // STEP 7: Exchange JWT for OAuth2 access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        }).toString()
    });

    if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`OAuth token exchange failed: ${errText}`);
    }

    const data = await tokenRes.json();
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

        // Extract Firebase credentials from Cloudflare environment
        const cfContextEnv = (context as any).env || {};
        const cfLocalsEnv = (locals as any)?.runtime?.env || {};
        const safeProcess = (globalThis as any).process?.env || {};
        
        const clientEmail = cfContextEnv.FIREBASE_CLIENT_EMAIL || cfLocalsEnv.FIREBASE_CLIENT_EMAIL || safeProcess.FIREBASE_CLIENT_EMAIL;
        const rawPrivateKey = cfContextEnv.FIREBASE_PRIVATE_KEY || cfLocalsEnv.FIREBASE_PRIVATE_KEY || safeProcess.FIREBASE_PRIVATE_KEY || '';

        if (!clientEmail || !rawPrivateKey) {
            return new Response(JSON.stringify({ 
                error: 'Missing Firebase Credentials',
                debug: { emailMissing: !clientEmail, keyMissing: !rawPrivateKey }
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        // Generate OAuth token (handles ALL key format issues internally)
        let accessToken;
        try {
            accessToken = await getGoogleAuthToken(clientEmail, rawPrivateKey);
        } catch (authErr: any) {
            console.error('[Push API] Auth failed:', authErr.message);
            return new Response(JSON.stringify({ 
                error: 'Authentication Handshake Failed',
                message: authErr.message
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        // Subscribe device to 'all' topic
        const subscribeUrl = `https://iid.googleapis.com/iid/v1/${token}/rel/topics/all`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(subscribeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'access_token_auth': 'true'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            console.error('[Push API] Topic subscription failed:', errText);
            return new Response(JSON.stringify({ error: 'Subscription failed', detail: errText }), { status: 500 });
        }

        console.log('[Push API] Successfully subscribed to topic "all"');
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('[Push API] Fatal:', error.message);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
