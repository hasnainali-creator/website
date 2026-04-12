import type { APIRoute } from 'astro';
import { SignJWT } from 'jose';

export const prerender = false;
const V = 'v9-hardcoded';

// The Firebase private key, base64-encoded for safe embedding.
// This eliminates ALL Cloudflare environment variable format issues.
// TODO: Move back to env var once authentication is proven to work.
const HARDCODED_KEY_B64 = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2QUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktZd2dnU2lBZ0VBQW9JQkFRREh2WFB5TjR1K2ZvSUkKRDNqWVFiY2IvM29pS2UzZ3ErTGRPREpEWVhRZlF0b0ZFK1A4VHBrNkdYUVRVSVBpZlB4WHFXeUFJZlBhclVFRgowVDBVRG5TdG9vUlkrY2FTSWN3NDFseTZONmNmbDdSNGNickkrTGNMeVZtVUFvWUZtQVZlbkttTmloVlBxWHNlCm51RlF2Y0tQSDZlNzVEOGEwMEYwQXJNTnVpSGlVNEkrL0trWTBJei9kM3QvSnUrUzFTY29JL0dza2NKZU5xaU8KejRUN2plaDdhYVdiQjFFaHFjM3psMEVUUnRtQWNyZFl5SkhPSDYvOVpPUnpTZFJvUGord3dBdHpuZmdZSnZmWQpSbEFkRysrS2xRdkRUYlBSNVY3WElROVVEaXNNOU1RcG8zcm9ZSlFtM3ZOaG9ESStlbzI3YVNlNTNsTVR2TFBkCnhocGcva0R2QWdNQkFBRUNnZ0VBWGVpY1pWS3BRS0JoQ1dJZzJtZ1hLN0l6WFhHaU5pSUtVU0QxUE1uS1cxSkcKaCtHZ3JJVFZ0TU8zMThiZ292RkpnUHVXbUMyZVpYOVVsV1FaVjk4dUMxN2Y0NmRYcldmM2lQZDc5RTlySTBiagpva2N5WHYvVXE5VjRhTWJBOVV0U3B2ZDRIaVJBUGNwOHFOcGhLK0Z6NG0rcklJTkJDaDh0NUZuS2psY25UQzFLCi9HS3BWUEE2aWh6c2FaYUZOQ3ZHclEzV2tyNVhmeW0wQ3diSGc4OVBQQ3h2M2hwemdzWjJ3a21tQVZzZ1ZMZHkKRHVIUHFmdkZSbFVuLy9vOU1nU2VhYStURk5RejR2VUhDcmtYRzZlbUJLRWI0cWQ3UXk0QTdZK3ZzOEFocjdLKwpNL1c5d2UxNE9NdGU1TS8rN0NpM2xoVTIzYktzbUxvVk1FUEREMzlBbFFLQmdRRHhBRzNlVTdKNkxXVTBuTFNZCjF4d2JYVEg0WmJjclJNblluUFBmTVdDV2NVWnRyaGJ3UmQ1d203NXV2OFk3bFZzSDhLM0pJSzBsOGpRVlVTOFUKVjMwdmtYcEFSV28wa0lEWjdiUlNON2ZzSHBqcjNvRDlObWRnelhiNlJ2RDl6YURhY2NQK1Z2SFdWcFZJVFZpeApxMXBNWjhjZWZxNFdTanEwcGlnc3RLdlJNd0tCZ1FEVUs2ZTNHRlpVVGN5VkZpUTc2cWNNSUdJMzBTTmduUVBBCmZVZ0ZYUjEvTlRrYk80RUJJZVp4L3R0N1lqNlNqK290b2RjWGJPclNHL1FKQVBHckdPYnBmb2dnQTJxSjZoNnAKaUFRVUxsczR3MWR6RU8wZHpzeEd6QnRzRG5MbkNRTkQxQjBKZFlrWUhWRkxNeUVHUkVaV3BjSVhDRFJBaCtaUwpFSjBxWGcwSlZRS0JnRGl5ZXlhRTFrWThDOFUyNEozY2JYWmFsSGoxcFFQKzZPV1c5eUNaQXpvaGFBcEJuSS9tClFCQ0o4MkVtcU1JM3Z2UzlRSVZDdExscW82b29NVVU5MSt1cTgvSE80czkrOTNGTnBOQjYzMEFqYXFLQzlDR2QKL1BBZkpsQjNCQmNSbXpnSTc2MFVVMHl6amVjMm14a2hVTnNNeHlGN2VBVXliV0UyZmRrV29CMVZBb0dBZHExYwppS3ZTVGlHZVY1NGs4bWJVdlpHM25xVWE5c1djL2FTV0Rub0JMOUJqZXZvVHRNQnptRHdJSk1IVllrR2hxWmluCktYRkEvL21telFwOEkwb3dqMWE1YWI2L2J4bEh3V2hWYjd4bVJoL3Q0RzBOVk9rQmxuQkF2blp1aXhDZGhPazIKdkwzRHkzdEtwNWVYMTF1RlJKNC9MSWJvUTFoQTJwSjBkdWhZdm1rQ2dZQkV4L1ZXaXlTRzdaNDhsNnk0YVlVeApEaEVTNTJ6NjJwcmtVTHFoQ3ZvcGtTSTgwUlJ4RHA3R3ZiNVhMWFZYZ1l6L01ycTJpSlRPOGRjeGxaQVlPRXpPCnZoOFBMSEJwOCtQTmc0TzlHQnUzRTh1b3VZVm5ieXY3Yk9ObytDcEg5emlVbXhUVmRqcEdIN2J2NDRaMVJHU0wKUk8vQk1aVnM1TDJCOUNmQTM3TGcvdz09Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0K';

const CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@omnysports-push-notifications.iam.gserviceaccount.com';

export const POST: APIRoute = async (context) => {
    const { request } = context;
    try {
        const body = await request.json();
        const token = body.token;
        if (!token) return new Response(JSON.stringify({ error: 'No token', v: V }), { status: 400 });

        // ===== Decode the hardcoded key =====
        // This is guaranteed to be correct - no Cloudflare env formatting issues
        const pemKey = atob(HARDCODED_KEY_B64);

        // ===== Extract base64 from PEM, decode, import via Web Crypto =====
        const lines = pemKey.split('\n');
        const b64Lines: string[] = [];
        for (const line of lines) {
            const t = line.trim();
            if (t.length > 0 && !t.startsWith('-----')) b64Lines.push(t);
        }
        const b64 = b64Lines.join('');

        const binaryStr = atob(b64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        const cryptoKey = await crypto.subtle.importKey(
            'pkcs8', bytes.buffer,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false, ['sign']
        );

        // ===== Sign JWT =====
        const iat = Math.floor(Date.now() / 1000);
        const jwt = await new SignJWT({
            iss: CLIENT_EMAIL,
            scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase.messaging',
            aud: 'https://oauth2.googleapis.com/token',
            exp: iat + 3600, iat
        })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .sign(cryptoKey);

        // ===== Get access token =====
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
            return new Response(JSON.stringify({ error: 'OAuth failed', v: V, message: err }), { status: 500 });
        }

        const { access_token } = await tokenRes.json();

        // ===== Subscribe to topic =====
        const subRes = await fetch(
            `https://iid.googleapis.com/iid/v1/${token}/rel/topics/all`,
            { method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'access_token_auth': 'true' } }
        );

        if (!subRes.ok) {
            const err = await subRes.text();
            return new Response(JSON.stringify({ error: 'Subscribe failed', v: V, message: err }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true, v: V }), { status: 200 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: 'Fatal', v: V, message: error.message }), { status: 500 });
    }
};
