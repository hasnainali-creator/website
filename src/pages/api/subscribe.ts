import type { APIRoute } from 'astro';
import { SignJWT, importPKCS8 } from 'jose';

export const prerender = false;

// Helper to generate a Google Cloud Platform OAuth2 Token entirely on the Cloudflare Edge
async function getGoogleAuthToken(clientEmail: string, privateKey: string | Uint8Array): Promise<string> {
    const alg = 'RS256';
    
    // PEM string or Binary DER Uint8Array can both be imported by jose
    const key = await importPKCS8(privateKey as any, alg);

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

        // [End Level] Triple-Layer Variable Extraction (Foolproof for Cloudflare)
        const cfContextEnv = (context as any).env || {};
        const cfLocalsEnv = (locals as any)?.runtime?.env || {};
        const safeProcess = (globalThis as any).process?.env || {};
        const astroImportMeta = (import.meta as any).env || {};
        
        // Detailed extraction with multiple fallback layers
        const clientEmail = cfContextEnv.FIREBASE_CLIENT_EMAIL || cfLocalsEnv.FIREBASE_CLIENT_EMAIL || safeProcess.FIREBASE_CLIENT_EMAIL || astroImportMeta.FIREBASE_CLIENT_EMAIL;
        const rawPrivateKey = cfContextEnv.FIREBASE_PRIVATE_KEY || cfLocalsEnv.FIREBASE_PRIVATE_KEY || safeProcess.FIREBASE_PRIVATE_KEY || astroImportMeta.FIREBASE_PRIVATE_KEY || '';

        // If credentials are missing, we MUST know exactly where they are failing
        if (!clientEmail || !rawPrivateKey) {
            console.error('[End Level 🏆] Missing Credentials Trace:', {
                hasContextEnv: !!(context as any).env,
                hasLocalsEnv: !!(locals as any)?.runtime?.env,
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
        let base64Payload = '';
        try {
            // [End Level] Ultra-Robust PEM Isolation (Final Verifiably Fix)
            // 1) ELIMINATE HEADERS FIRST: Strip the known PEM markers completely to avoid hyphen-to-plus corruption
            const strippedHeaders = rawPrivateKey
                .replace(/-----BEGIN PRIVATE KEY-----/g, '')
                .replace(/-----END PRIVATE KEY-----/g, '')
                .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
                .replace(/-----END RSA PRIVATE KEY-----/g, '');

            // 2) EXTRACT PURE BASE64: Strip ALL non-base64 characters FIRST (including the remaining '-' from unknown headers)
            // We use the URL-safe hyphen/underscore set in the stripper too 
            const strippedB64 = strippedHeaders.replace(/[^A-Za-z0-9+/ \-_]/g, '');

            // 3) NORMALIZE BASE64: Convert URL-safe characters to standard Base64 AFTER stripping headers
            base64Payload = strippedB64.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');

            // 4) RE-CALCULATE ACCURATE MODULO-4 PADDING
            const padLength = (4 - (base64Payload.length % 4)) % 4;
            base64Payload += '='.repeat(padLength);
            
            // 5) [CRITICAL] RECONSTRUCT PEM STRING: The library specifically asked for a "formatted string" in the previous crash
            const formattedKey = `-----BEGIN PRIVATE KEY-----\n${base64Payload}\n-----END PRIVATE KEY-----`;
            
            accessToken = await getGoogleAuthToken(clientEmail, formattedKey);
        } catch (authErr: any) {
            console.error('[End Level 🏆] Auth Token Generation Failed:', authErr.message);
            // DEBUG TELEMETRY: We MUST see the start of the payload to verify the headers are GONE
            const b64SafeDebug = base64Payload ? `[B64_LEN: ${base64Payload.length}] START: ${base64Payload.substring(0, 15)}... END: ${base64Payload.substring(base64Payload.length - 10)}` : 'base64 extraction null';
            return new Response(JSON.stringify({ 
                error: "Authentication Handshake Failed", 
                message: authErr.message,
                debug: `Telemetry: ${b64SafeDebug}. Error Source: ${authErr.message}`
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
