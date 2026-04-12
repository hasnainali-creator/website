import type { APIRoute } from 'astro';
import { SignJWT } from 'jose';

export const prerender = false;
const V = 'v7';

export const POST: APIRoute = async (context) => {
    const { request, locals } = context;
    try {
        const body = await request.json();
        const token = body.token;
        if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 400 });

        const env = (locals as any)?.runtime?.env || (context as any).env || {};
        const clientEmail = env.FIREBASE_CLIENT_EMAIL;
        const rawKey: string = env.FIREBASE_PRIVATE_KEY || '';

        if (!clientEmail || !rawKey) {
            return new Response(JSON.stringify({ error: 'No creds', v: V }), { status: 500 });
        }

        // ========== STEP 1: Extract pure base64 from PEM ==========
        // Remove PEM headers/footers
        let b64 = rawKey
            .replace(/-----BEGIN[\s\S]*?-----/g, '')
            .replace(/-----END[\s\S]*?-----/g, '');

        // Remove EVERYTHING that is not a valid base64 character
        // This handles: literal \n, real newlines, \r, spaces, quotes, backslashes, etc.
        b64 = b64.replace(/[^A-Za-z0-9+\/]/g, '');

        // Fix padding
        const padLen = (4 - (b64.length % 4)) % 4;
        if (padLen > 0 && padLen < 4) b64 += '='.repeat(padLen);

        // ========== STEP 2: Decode base64 to binary ==========
        let binaryStr: string;
        try {
            binaryStr = atob(b64);
        } catch (e: any) {
            return new Response(JSON.stringify({ 
                error: 'base64 decode failed', 
                v: V, 
                b64Len: b64.length,
                b64Start: b64.substring(0, 10),
                b64End: b64.substring(b64.length - 10),
                msg: e.message 
            }), { status: 500 });
        }

        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }

        // ========== STEP 3: Import key via Web Crypto ==========
        let cryptoKey: CryptoKey;
        try {
            cryptoKey = await crypto.subtle.importKey(
                'pkcs8',
                bytes.buffer,
                { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
                false,
                ['sign']
            );
        } catch (e: any) {
            return new Response(JSON.stringify({ 
                error: 'Web Crypto importKey failed', 
                v: V, 
                derLen: bytes.length,
                msg: e.message 
            }), { status: 500 });
        }

        // ========== STEP 4: Create & sign JWT ==========
        const iat = Math.floor(Date.now() / 1000);
        const jwt = await new SignJWT({
            iss: clientEmail,
            scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase.messaging',
            aud: 'https://oauth2.googleapis.com/token',
            exp: iat + 3600,
            iat
        })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .sign(cryptoKey);

        // ========== STEP 5: Exchange JWT for access token ==========
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt
            }).toString()
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            return new Response(JSON.stringify({ error: 'OAuth failed', v: V, msg: err }), { status: 500 });
        }

        const { access_token } = await tokenRes.json();

        // ========== STEP 6: Subscribe to topic ==========
        const subRes = await fetch(
            `https://iid.googleapis.com/iid/v1/${token}/rel/topics/all`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'access_token_auth': 'true'
                }
            }
        );

        if (!subRes.ok) {
            const err = await subRes.text();
            return new Response(JSON.stringify({ error: 'Subscribe failed', v: V, msg: err }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true, v: V }), { status: 200 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: 'Fatal', v: V, msg: error.message }), { status: 500 });
    }
};
